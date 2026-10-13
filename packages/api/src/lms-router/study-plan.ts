import { and, asc, count, desc, eq, gte, inArray, lte } from '@instello/db'
import {
  CreateStudyPlanActivitySchema,
  CreateStudyPlanSchema,
  RescheduleStudyPlanActivitySchema,
  SetStudyPlanActivityStatusSchema,
  studyPlan,
  studyPlanActivity,
  studyPlanActivityRecurrences,
  UpdateStudyPlanActivitySchema,
  UpdateStudyPlanSchema,
} from '@instello/db/lms'
import { createId } from '@paralleldrive/cuid2'
import { TRPCError } from '@trpc/server'
import { addDays, addMinutes, addWeeks, differenceInMinutes } from 'date-fns'
import { z } from 'zod/v4'

import type { Context } from '../trpc'
import { protectedProcedure } from '../trpc'

type QueryDb = Pick<Context['db'], 'query'>
type ActivityWriter = Pick<
  Parameters<Parameters<Context['db']['transaction']>[0]>[0],
  'insert'
>
type ActivityRecurrence = (typeof studyPlanActivityRecurrences)[number]

function recurrenceOccurrences(
  start: Date,
  end: Date,
  recurrence: ActivityRecurrence,
) {
  const duration = Math.max(differenceInMinutes(end, start), 15)
  const last = addWeeks(start, 8).getTime()
  const dates: { start: Date; end: Date }[] = []
  let cursor = start

  while (cursor.getTime() <= last) {
    const day = cursor.getDay()
    const isFirst = cursor.getTime() === start.getTime()
    const matches =
      recurrence === 'none' ||
      recurrence === 'daily' ||
      recurrence === 'weekly' ||
      (recurrence === 'weekdays' && day !== 0 && day !== 6) ||
      isFirst

    if (matches) {
      dates.push({ start: cursor, end: addMinutes(cursor, duration) })
    }

    if (recurrence === 'none') break
    cursor = recurrence === 'weekly' ? addWeeks(cursor, 1) : addDays(cursor, 1)
  }

  return dates
}

async function requireOwnedPlan(db: QueryDb, userId: string, planId: string) {
  const plan = await db.query.studyPlan.findFirst({
    where: and(
      eq(studyPlan.id, planId),
      eq(studyPlan.createdByClerkUserId, userId),
    ),
  })

  if (!plan) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Study plan not found',
    })
  }

  return plan
}

async function requireOwnedActivity(
  db: QueryDb,
  userId: string,
  activityId: string,
) {
  const activity = await db.query.studyPlanActivity.findFirst({
    where: eq(studyPlanActivity.id, activityId),
    with: { plan: true },
  })

  if (!activity || activity.plan?.createdByClerkUserId !== userId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Activity not found',
    })
  }

  return activity
}

type ActivityDraft = {
  title: string
  kind: (typeof studyPlanActivity.$inferInsert)['kind']
  priority: (typeof studyPlanActivity.$inferInsert)['priority']
  reminder: (typeof studyPlanActivity.$inferInsert)['reminder']
  recurrence: ActivityRecurrence
  rescheduledFromId?: string
}

async function insertOccurrences(
  tx: ActivityWriter,
  planId: string,
  draft: ActivityDraft,
  occurrences: { start: Date; end: Date }[],
) {
  const first = occurrences[0]
  if (!first) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No activities to schedule',
    })
  }

  const seriesId = draft.recurrence === 'none' ? null : createId()
  const inserted = await tx
    .insert(studyPlanActivity)
    .values(
      occurrences.map((slot) => ({
        planId,
        seriesId,
        rescheduledFromId: draft.rescheduledFromId,
        title: draft.title,
        kind: draft.kind,
        startsAt: slot.start,
        endsAt: slot.end,
        priority: draft.priority,
        reminder: draft.reminder,
        recurrence: draft.recurrence,
        status: 'planned' as const,
      })),
    )
    .returning()

  const created =
    inserted.find((row) => row.startsAt.getTime() === first.start.getTime()) ??
    inserted[0]

  if (!created) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to create activity',
    })
  }

  return created
}

export const studyPlanRouter = {
  list: protectedProcedure.query(async ({ ctx }) => {
    const plans = await ctx.db.query.studyPlan.findMany({
      where: eq(studyPlan.createdByClerkUserId, ctx.auth.userId),
      orderBy: [desc(studyPlan.createdAt)],
    })

    if (plans.length === 0) return []

    const planIds = plans.map((plan) => plan.id)

    const counts = await ctx.db
      .select({
        planId: studyPlanActivity.planId,
        activityCount: count(),
      })
      .from(studyPlanActivity)
      .where(inArray(studyPlanActivity.planId, planIds))
      .groupBy(studyPlanActivity.planId)

    const nextActivities = await ctx.db
      .selectDistinctOn([studyPlanActivity.planId], {
        id: studyPlanActivity.id,
        planId: studyPlanActivity.planId,
        title: studyPlanActivity.title,
        startsAt: studyPlanActivity.startsAt,
        endsAt: studyPlanActivity.endsAt,
      })
      .from(studyPlanActivity)
      .where(
        and(
          inArray(studyPlanActivity.planId, planIds),
          eq(studyPlanActivity.status, 'planned'),
          gte(studyPlanActivity.endsAt, new Date()),
        ),
      )
      .orderBy(asc(studyPlanActivity.planId), asc(studyPlanActivity.startsAt))

    const countByPlan = new Map(
      counts.map((row) => [row.planId, row.activityCount]),
    )
    const nextByPlan = new Map(nextActivities.map((row) => [row.planId, row]))

    return plans.map((plan) => {
      const next = nextByPlan.get(plan.id)
      return {
        ...plan,
        activityCount: countByPlan.get(plan.id) ?? 0,
        nextActivity: next
          ? {
              id: next.id,
              title: next.title,
              startsAt: next.startsAt,
              endsAt: next.endsAt,
            }
          : null,
      }
    })
  }),

  getById: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return requireOwnedPlan(ctx.db, ctx.auth.userId, input.planId)
    }),

  create: protectedProcedure
    .input(CreateStudyPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(studyPlan)
        .values({
          name: input.name,
          note: input.note ?? '',
          createdByClerkUserId: ctx.auth.userId,
        })
        .returning()

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to create study plan',
        })
      }

      return created
    }),

  update: protectedProcedure
    .input(UpdateStudyPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await requireOwnedPlan(
        ctx.db,
        ctx.auth.userId,
        input.planId,
      )
      const changes: { name?: string; note?: string } = {}
      if (input.name !== undefined) changes.name = input.name
      if (input.note !== undefined) changes.note = input.note
      if (Object.keys(changes).length === 0) return existing

      const [updated] = await ctx.db
        .update(studyPlan)
        .set(changes)
        .where(eq(studyPlan.id, existing.id))
        .returning()

      return updated ?? existing
    }),

  delete: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(studyPlan)
        .where(
          and(
            eq(studyPlan.id, input.planId),
            eq(studyPlan.createdByClerkUserId, ctx.auth.userId),
          ),
        )
        .returning()

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study plan not found',
        })
      }

      return deleted
    }),

  activity: {
    list: protectedProcedure
      .input(
        z.object({
          planId: z.string().min(1),
          from: z.date().optional(),
          to: z.date().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        await requireOwnedPlan(ctx.db, ctx.auth.userId, input.planId)

        return ctx.db.query.studyPlanActivity.findMany({
          where: and(
            eq(studyPlanActivity.planId, input.planId),
            input.from
              ? gte(studyPlanActivity.startsAt, input.from)
              : undefined,
            input.to ? lte(studyPlanActivity.startsAt, input.to) : undefined,
          ),
          orderBy: [asc(studyPlanActivity.startsAt)],
        })
      }),

    create: protectedProcedure
      .input(CreateStudyPlanActivitySchema)
      .mutation(async ({ ctx, input }) => {
        const occurrences = recurrenceOccurrences(
          input.startsAt,
          input.endsAt,
          input.recurrence,
        )

        return ctx.db.transaction(async (tx) => {
          await requireOwnedPlan(tx, ctx.auth.userId, input.planId)
          return insertOccurrences(tx, input.planId, input, occurrences)
        })
      }),

    update: protectedProcedure
      .input(UpdateStudyPlanActivitySchema)
      .mutation(async ({ ctx, input }) => {
        const activity = await requireOwnedActivity(
          ctx.db,
          ctx.auth.userId,
          input.activityId,
        )

        const [updated] = await ctx.db
          .update(studyPlanActivity)
          .set({
            title: input.title,
            kind: input.kind,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            priority: input.priority,
            reminder: input.reminder,
            recurrence: input.recurrence,
          })
          .where(eq(studyPlanActivity.id, activity.id))
          .returning()

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found',
          })
        }

        return updated
      }),

    delete: protectedProcedure
      .input(z.object({ activityId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const activity = await requireOwnedActivity(
          ctx.db,
          ctx.auth.userId,
          input.activityId,
        )

        const [deleted] = await ctx.db
          .delete(studyPlanActivity)
          .where(eq(studyPlanActivity.id, activity.id))
          .returning()

        return deleted ?? activity
      }),

    setStatus: protectedProcedure
      .input(SetStudyPlanActivityStatusSchema)
      .mutation(async ({ ctx, input }) => {
        const activity = await requireOwnedActivity(
          ctx.db,
          ctx.auth.userId,
          input.activityId,
        )

        const [updated] = await ctx.db
          .update(studyPlanActivity)
          .set({ status: input.status })
          .where(eq(studyPlanActivity.id, activity.id))
          .returning()

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found',
          })
        }

        return updated
      }),

    reschedule: protectedProcedure
      .input(RescheduleStudyPlanActivitySchema)
      .mutation(async ({ ctx, input }) => {
        return ctx.db.transaction(async (tx) => {
          const activity = await requireOwnedActivity(
            tx,
            ctx.auth.userId,
            input.activityId,
          )
          const occurrences = recurrenceOccurrences(
            input.startsAt,
            input.endsAt,
            input.recurrence,
          )

          await tx
            .update(studyPlanActivity)
            .set({ status: 'rescheduled' })
            .where(eq(studyPlanActivity.id, activity.id))

          return insertOccurrences(
            tx,
            activity.planId,
            { ...input, rescheduledFromId: activity.id },
            occurrences,
          )
        })
      }),
  },
}
