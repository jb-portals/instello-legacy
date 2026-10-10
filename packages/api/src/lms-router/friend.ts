import {
  and,
  asc,
  eq,
  gte,
  isDrizzleQueryError,
  lte,
  ne,
  or,
} from '@instello/db'
import {
  FriendEmailSchema,
  FriendUserSchema,
  friendship,
  preference,
  RespondFriendRequestSchema,
  SendFriendRequestSchema,
  SetFriendSharingSchema,
  studyPlan,
  studyPlanActivity,
} from '@instello/db/lms'
import { TRPCError } from '@trpc/server'
import { addDays, subDays } from 'date-fns'

import { getClerkProfiles, profileOrFallback } from '../router.helpers'
import type { Context } from '../trpc'
import { protectedProcedure } from '../trpc'

type FriendshipRow = typeof friendship.$inferSelect

function orderedPair(a: string, b: string) {
  return a < b
    ? { clerkUserIdLow: a, clerkUserIdHigh: b }
    : { clerkUserIdLow: b, clerkUserIdHigh: a }
}

function otherUserId(row: FriendshipRow, userId: string) {
  return row.requesterClerkUserId === userId
    ? row.addresseeClerkUserId
    : row.requesterClerkUserId
}

function sharesFor(row: FriendshipRow, userId: string) {
  return row.requesterClerkUserId === userId
    ? row.requesterSharesActivity
    : row.addresseeSharesActivity
}

async function findFriendship(db: Context['db'], a: string, b: string) {
  const pair = orderedPair(a, b)
  return db.query.friendship.findFirst({
    where: and(
      eq(friendship.clerkUserIdLow, pair.clerkUserIdLow),
      eq(friendship.clerkUserIdHigh, pair.clerkUserIdHigh),
    ),
  })
}

async function requireOnboardedStudent(ctx: Context, clerkUserId: string) {
  try {
    await ctx.clerk.users.getUser(clerkUserId)
  } catch {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Student not found',
    })
  }

  const pref = await ctx.db.query.preference.findFirst({
    where: eq(preference.id, clerkUserId),
  })

  if (!pref) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This student has not finished setting up their account',
    })
  }
}

function friendshipSummary(row: FriendshipRow, userId: string) {
  return {
    id: row.id,
    status: row.status,
    incoming: row.status === 'pending' && row.addresseeClerkUserId === userId,
  }
}

async function loadActivities(db: Context['db'], clerkUserId: string) {
  const now = new Date()
  return db
    .select({
      id: studyPlanActivity.id,
      title: studyPlanActivity.title,
      kind: studyPlanActivity.kind,
      startsAt: studyPlanActivity.startsAt,
      endsAt: studyPlanActivity.endsAt,
      status: studyPlanActivity.status,
      planName: studyPlan.name,
    })
    .from(studyPlanActivity)
    .innerJoin(studyPlan, eq(studyPlanActivity.planId, studyPlan.id))
    .where(
      and(
        eq(studyPlan.createdByClerkUserId, clerkUserId),
        ne(studyPlanActivity.status, 'rescheduled'),
        gte(studyPlanActivity.startsAt, subDays(now, 7)),
        lte(studyPlanActivity.startsAt, addDays(now, 14)),
      ),
    )
    .orderBy(asc(studyPlanActivity.startsAt))
    .limit(50)
}

export const friendRouter = {
  search: protectedProcedure
    .input(FriendEmailSchema)
    .query(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase()
      const listed = await ctx.clerk.users.getUserList({
        emailAddress: [email],
        limit: 1,
      })
      const user = listed.data[0]

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No student uses that email',
        })
      }

      if (user.id === ctx.auth.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot add yourself',
        })
      }

      await requireOnboardedStudent(ctx, user.id)

      const row = await findFriendship(ctx.db, ctx.auth.userId, user.id)
      const profiles = await getClerkProfiles(ctx, [user.id])

      return {
        profile: profileOrFallback(profiles, user.id),
        friendship: row ? friendshipSummary(row, ctx.auth.userId) : null,
      }
    }),

  sendRequest: protectedProcedure
    .input(SendFriendRequestSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.clerkUserId === ctx.auth.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot add yourself',
        })
      }

      await requireOnboardedStudent(ctx, input.clerkUserId)

      const existing = await findFriendship(
        ctx.db,
        ctx.auth.userId,
        input.clerkUserId,
      )

      if (existing?.status === 'accepted') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already friends',
        })
      }

      if (existing?.status === 'pending') {
        return existing
      }

      if (existing?.status === 'declined') {
        const [updated] = await ctx.db
          .update(friendship)
          .set({
            status: 'pending',
            requesterClerkUserId: ctx.auth.userId,
            addresseeClerkUserId: input.clerkUserId,
            requesterSharesActivity: false,
            addresseeSharesActivity: false,
            updatedAt: new Date(),
          })
          .where(eq(friendship.id, existing.id))
          .returning()

        if (!updated) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to send friend request',
          })
        }

        return updated
      }

      const pair = orderedPair(ctx.auth.userId, input.clerkUserId)

      try {
        const [created] = await ctx.db
          .insert(friendship)
          .values({
            ...pair,
            requesterClerkUserId: ctx.auth.userId,
            addresseeClerkUserId: input.clerkUserId,
            status: 'pending',
          })
          .returning()

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to send friend request',
          })
        }

        return created
      } catch (error) {
        if (isDrizzleQueryError(error) && error.cause.code === '23505') {
          const raced = await findFriendship(
            ctx.db,
            ctx.auth.userId,
            input.clerkUserId,
          )
          if (raced) return raced
        }
        throw error
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.friendship.findMany({
      where: or(
        eq(friendship.requesterClerkUserId, ctx.auth.userId),
        eq(friendship.addresseeClerkUserId, ctx.auth.userId),
      ),
      orderBy: (table, operators) => [operators.desc(table.createdAt)],
    })

    const visible = rows.filter((row) => row.status !== 'declined')
    const profiles = await getClerkProfiles(
      ctx,
      visible.map((row) => otherUserId(row, ctx.auth.userId)),
    )

    const toCard = (row: FriendshipRow) => {
      const clerkUserId = otherUserId(row, ctx.auth.userId)
      return {
        friendshipId: row.id,
        profile: profileOrFallback(profiles, clerkUserId),
        iShareActivity: sharesFor(row, ctx.auth.userId),
        theyShareActivity: sharesFor(row, clerkUserId),
      }
    }

    return {
      incoming: visible
        .filter(
          (row) =>
            row.status === 'pending' &&
            row.addresseeClerkUserId === ctx.auth.userId,
        )
        .map(toCard),
      outgoing: visible
        .filter(
          (row) =>
            row.status === 'pending' &&
            row.requesterClerkUserId === ctx.auth.userId,
        )
        .map(toCard),
      friends: visible.filter((row) => row.status === 'accepted').map(toCard),
    }
  }),

  respond: protectedProcedure
    .input(RespondFriendRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.friendship.findFirst({
        where: eq(friendship.id, input.friendshipId),
      })

      if (!row || row.addresseeClerkUserId !== ctx.auth.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Friend request not found',
        })
      }

      if (row.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This request was already answered',
        })
      }

      const [updated] = await ctx.db
        .update(friendship)
        .set({
          status: input.action === 'accept' ? 'accepted' : 'declined',
          updatedAt: new Date(),
        })
        .where(eq(friendship.id, row.id))
        .returning()

      return updated
    }),

  setSharing: protectedProcedure
    .input(SetFriendSharingSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.friendship.findFirst({
        where: eq(friendship.id, input.friendshipId),
      })

      const involved =
        row?.requesterClerkUserId === ctx.auth.userId ||
        row?.addresseeClerkUserId === ctx.auth.userId

      if (!row || !involved) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Friend not found',
        })
      }

      if (row.status !== 'accepted') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Accept the request before sharing activity',
        })
      }

      const patch =
        row.requesterClerkUserId === ctx.auth.userId
          ? { requesterSharesActivity: input.sharesActivity }
          : { addresseeSharesActivity: input.sharesActivity }

      const [updated] = await ctx.db
        .update(friendship)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(friendship.id, row.id))
        .returning()

      return updated
    }),

  get: protectedProcedure
    .input(FriendUserSchema)
    .query(async ({ ctx, input }) => {
      const row = await findFriendship(
        ctx.db,
        ctx.auth.userId,
        input.clerkUserId,
      )

      if (!row || row.status !== 'accepted') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Friend not found',
        })
      }

      const profiles = await getClerkProfiles(ctx, [input.clerkUserId])
      const theyShareActivity = sharesFor(row, input.clerkUserId)
      const activities = theyShareActivity
        ? await loadActivities(ctx.db, input.clerkUserId)
        : []

      return {
        friendshipId: row.id,
        profile: profileOrFallback(profiles, input.clerkUserId),
        iShareActivity: sharesFor(row, ctx.auth.userId),
        theyShareActivity,
        activities,
      }
    }),
}
