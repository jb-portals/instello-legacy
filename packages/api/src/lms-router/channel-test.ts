import { and, eq, gte, inArray, max, ne } from '@instello/db'
import {
  CreateChannelTestSchema,
  channelTestAttemptAnswers,
  channelTestAttempts,
  channelTestOptions,
  channelTestQuestions,
  channelTests,
  subscription,
  UpdateChannelTestSchema,
} from '@instello/db/lms'
import { TRPCError } from '@trpc/server'
import { addMinutes, endOfDay, isWithinInterval } from 'date-fns'
import { z } from 'zod/v4'

import type { DbTransaction } from '../router.helpers'
import type { Context } from '../trpc'
import { protectedProcedure } from '../trpc'

type DbClient = Context['db'] | DbTransaction
type ChannelTest = typeof channelTests.$inferSelect
type ChannelTestAttempt = typeof channelTestAttempts.$inferSelect

function getAvailability(
  test: Pick<ChannelTest, 'type' | 'startsAt' | 'endsAt'>,
  now: Date,
): 'upcoming' | 'open' | 'closed' {
  if (test.type === 'open') return 'open'
  if (!test.startsAt || !test.endsAt) return 'closed'
  if (now < test.startsAt) return 'upcoming'
  if (now > test.endsAt) return 'closed'
  return 'open'
}

function remainingTimeMs(expiresAt: Date | null, now: Date) {
  if (!expiresAt) return null
  return Math.max(0, expiresAt.getTime() - now.getTime())
}

function withoutCorrectOptions<T extends { isCorrect: boolean }>(options: T[]) {
  return options.map(({ isCorrect: _isCorrect, ...option }) => option)
}

async function getActiveSubscription(
  db: DbClient,
  clerkUserId: string,
  channelId: string,
) {
  return db.query.subscription.findFirst({
    where: and(
      eq(subscription.clerkUserId, clerkUserId),
      eq(subscription.channelId, channelId),
      gte(subscription.endDate, endOfDay(new Date())),
    ),
  })
}

async function expireAttemptIfNeeded(
  db: DbClient,
  attempt: ChannelTestAttempt,
) {
  if (
    attempt.status !== 'in_progress' ||
    !attempt.expiresAt ||
    attempt.expiresAt.getTime() > Date.now()
  ) {
    return attempt
  }

  const updated = await db
    .update(channelTestAttempts)
    .set({ status: 'expired' })
    .where(eq(channelTestAttempts.id, attempt.id))
    .returning()
    .then((rows) => rows[0])

  return updated ?? { ...attempt, status: 'expired' as const }
}

async function getQuestionsWithoutAnswers(db: DbClient, channelTestId: string) {
  const questions = await db.query.channelTestQuestions.findMany({
    where: eq(channelTestQuestions.channelTestId, channelTestId),
    orderBy: (fields, { asc }) => asc(fields.orderIdx),
    with: {
      channelTestOptions: {
        orderBy: (fields, { asc }) => asc(fields.orderIdx),
      },
    },
  })

  return questions.map((question) => ({
    ...question,
    channelTestOptions: withoutCorrectOptions(question.channelTestOptions),
  }))
}

function toAttemptPayload(
  attempt: ChannelTestAttempt,
  questions: Awaited<ReturnType<typeof getQuestionsWithoutAnswers>>,
  now: Date,
) {
  return {
    ...attempt,
    remainingTimeMs: remainingTimeMs(attempt.expiresAt, now),
    questions,
  }
}

export const channelTest = {
  /** Create test under channel */
  create: protectedProcedure
    .input(CreateChannelTestSchema)
    .mutation(async ({ ctx, input }) => {
      const values =
        input.type === 'open'
          ? {
              ...input,
              startsAt: null,
              endsAt: null,
              durationMinutes: null,
            }
          : input

      return await ctx.db
        .insert(channelTests)
        .values({ ...values, createdBy: ctx.auth.userId, isPublished: false })
        .returning()
        .then((rows) => rows[0])
    }),

  /** List tests under a channel */
  listChannel: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.db.query.channel.findFirst({
        where: (table, { eq }) => eq(table.id, input.channelId),
      })

      if (!channel)
        throw new TRPCError({ message: 'Channel not found', code: 'NOT_FOUND' })

      const tests = await ctx.db.query.channelTests.findMany({
        where: (fields, { eq }) => eq(fields.channelId, input.channelId),
        orderBy: (fields, { desc }) => desc(fields.createdAt),
      })

      return tests
    }),

  /** Get test with questions and correct answers */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const test = await ctx.db.query.channelTests.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.id),
        with: {
          channelTestQuestions: {
            orderBy: (fields, { asc }) => asc(fields.orderIdx),
            with: {
              channelTestOptions: {
                orderBy: (fields, { asc }) => asc(fields.orderIdx),
              },
            },
          },
        },
      })

      if (!test)
        throw new TRPCError({
          message: 'Channel test not found',
          code: 'NOT_FOUND',
        })

      if (test.createdBy !== ctx.auth.userId)
        throw new TRPCError({
          message: 'You are not authorized to view this channel test',
          code: 'FORBIDDEN',
        })

      return test
    }),

  /** Update test */
  update: protectedProcedure
    .input(UpdateChannelTestSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.channelTests.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.id),
      })

      if (!row)
        throw new TRPCError({
          message: 'Channel test not found',
          code: 'NOT_FOUND',
        })

      if (row.createdBy !== ctx.auth.userId)
        throw new TRPCError({
          message: 'You are not authorized to update this channel test',
          code: 'FORBIDDEN',
        })

      const nextType = input.type ?? row.type
      let startsAt = input.startsAt ?? row.startsAt
      let endsAt = input.endsAt ?? row.endsAt
      let durationMinutes = input.durationMinutes ?? row.durationMinutes

      if (nextType === 'open') {
        startsAt = null
        endsAt = null
        durationMinutes = null
      } else {
        if (!startsAt || !endsAt || durationMinutes == null)
          throw new TRPCError({
            message:
              'Scheduled tests require start time, end time, and duration',
            code: 'BAD_REQUEST',
          })

        if (endsAt <= startsAt)
          throw new TRPCError({
            message: 'End time must be after start time',
            code: 'BAD_REQUEST',
          })
      }

      return await ctx.db
        .update(channelTests)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.isPublished !== undefined
            ? { isPublished: input.isPublished }
            : {}),
          type: nextType,
          startsAt,
          endsAt,
          durationMinutes,
        })
        .where(eq(channelTests.id, row.id))
        .returning()
        .then((rows) => rows[0])
    }),

  /** Remove test */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.channelTests.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.id),
      })

      if (!row)
        throw new TRPCError({
          message: 'Channel test not found',
          code: 'NOT_FOUND',
        })

      if (row.createdBy !== ctx.auth.userId)
        throw new TRPCError({
          message: 'You are not authorized to remove this channel test',
          code: 'FORBIDDEN',
        })

      await ctx.db.delete(channelTests).where(eq(channelTests.id, row.id))
    }),

  /** Add question with options to the test */
  addQuestion: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        channelTestId: z.string(),
        options: z.array(
          z.object({
            label: z.string(),
            isCorrect: z.boolean(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // 1. Atlease one option must be correct
        if (!input.options.find((opt) => opt.isCorrect))
          throw new TRPCError({
            message: 'At least one option must be correct',
            code: 'BAD_REQUEST',
          })

        // 2. Channel test must exist
        const test = await tx.query.channelTests.findFirst({
          where: (fields, { eq }) => eq(fields.id, input.channelTestId),
        })

        if (!test)
          throw new TRPCError({
            message: 'Channel test not found',
            code: 'NOT_FOUND',
          })

        // 3. Channel test must be created by the current user
        if (test.createdBy !== ctx.auth.userId)
          throw new TRPCError({
            message:
              'You are not authorized to add questions and options to this channel test',
            code: 'FORBIDDEN',
          })

        // 4. Get next order index
        const nextOrderIdx =
          (await tx
            .select({
              maxOrderIdx: max(channelTestQuestions.orderIdx)
                .mapWith(Number)
                .as('maxOrderIdx'),
            })
            .from(channelTestQuestions)
            .where(eq(channelTestQuestions.channelTestId, test.id))
            .groupBy(channelTestQuestions.channelTestId)
            .then((res) => res.at(0)?.maxOrderIdx ?? -1)) + 1

        if (nextOrderIdx === -1)
          throw new TRPCError({
            message: 'Failed to get next order index',
            code: 'INTERNAL_SERVER_ERROR',
          })

        // 5. Add question
        const question = await tx
          .insert(channelTestQuestions)
          .values({
            channelTestId: test.id,
            title: input.title,
            orderIdx: nextOrderIdx,
          })
          .returning({ id: channelTestQuestions.id })
          .then((res) => res.at(0))

        if (!question)
          throw new TRPCError({
            message: 'Failed to add question',
            code: 'INTERNAL_SERVER_ERROR',
          })

        // 6. Add options
        await tx.insert(channelTestOptions).values(
          input.options.map(
            (option, index): typeof channelTestOptions.$inferInsert => ({
              channelTestQuestionId: question.id,
              label: option.label,
              isCorrect: option.isCorrect,
              orderIdx: index,
            }),
          ),
        )

        return question
      })
    }),

  /** List published tests for students */
  listPublic: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.db.query.channel.findFirst({
        where: (table, { eq }) => eq(table.id, input.channelId),
      })

      if (!channel)
        throw new TRPCError({ message: 'Channel not found', code: 'NOT_FOUND' })

      const now = new Date()
      const userSubscription = await getActiveSubscription(
        ctx.db,
        ctx.auth.userId,
        input.channelId,
      )

      const tests = await ctx.db.query.channelTests.findMany({
        where: (fields, { and, eq }) =>
          and(
            eq(fields.channelId, input.channelId),
            eq(fields.isPublished, true),
          ),
        orderBy: (fields, { desc }) => desc(fields.createdAt),
      })

      const testIds = tests.map((test) => test.id)
      const attempts =
        testIds.length > 0
          ? await ctx.db.query.channelTestAttempts.findMany({
              where: and(
                eq(channelTestAttempts.clerkUserId, ctx.auth.userId),
                inArray(channelTestAttempts.channelTestId, testIds),
              ),
              orderBy: (fields, { desc }) => desc(fields.createdAt),
            })
          : []

      const latestAttemptByTestId = new Map<string, ChannelTestAttempt>()
      for (const attempt of attempts) {
        if (!latestAttemptByTestId.has(attempt.channelTestId)) {
          latestAttemptByTestId.set(attempt.channelTestId, attempt)
        }
      }

      return tests.map((test) => ({
        ...test,
        availability: getAvailability(test, now),
        canAttend: !!userSubscription,
        latestAttempt: latestAttemptByTestId.get(test.id) ?? null,
      }))
    }),

  /** Start or resume a test attempt */
  start: protectedProcedure
    .input(z.object({ channelTestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const now = new Date()
        const test = await tx.query.channelTests.findFirst({
          where: (fields, { eq }) => eq(fields.id, input.channelTestId),
        })

        if (!test)
          throw new TRPCError({
            message: 'Channel test not found',
            code: 'NOT_FOUND',
          })

        if (!test.isPublished)
          throw new TRPCError({
            message: 'Channel test is not published',
            code: 'FORBIDDEN',
          })

        if (!test.channelId)
          throw new TRPCError({
            message: 'Channel test is not linked to a channel',
            code: 'BAD_REQUEST',
          })

        const userSubscription = await getActiveSubscription(
          tx,
          ctx.auth.userId,
          test.channelId,
        )

        if (!userSubscription)
          throw new TRPCError({
            message: 'You need an active subscription to attend this test',
            code: 'FORBIDDEN',
          })

        const existingAttempts = await tx.query.channelTestAttempts.findMany({
          where: (fields, { and, eq }) =>
            and(
              eq(fields.channelTestId, test.id),
              eq(fields.clerkUserId, ctx.auth.userId),
            ),
          orderBy: (fields, { desc }) => desc(fields.createdAt),
        })

        const inProgressAttempt = existingAttempts.find(
          (attempt) => attempt.status === 'in_progress',
        )

        if (inProgressAttempt) {
          const attempt = await expireAttemptIfNeeded(tx, inProgressAttempt)

          if (attempt.status === 'in_progress') {
            const questions = await getQuestionsWithoutAnswers(tx, test.id)
            return toAttemptPayload(attempt, questions, now)
          }
        }

        if (test.type === 'scheduled' && existingAttempts.length > 0)
          throw new TRPCError({
            message: 'You have already attempted this test',
            code: 'BAD_REQUEST',
          })

        if (test.type === 'scheduled') {
          if (!test.startsAt || !test.endsAt || test.durationMinutes == null)
            throw new TRPCError({
              message:
                'Scheduled test is missing start time, end time, or duration',
              code: 'BAD_REQUEST',
            })

          if (
            !isWithinInterval(now, {
              start: test.startsAt,
              end: test.endsAt,
            })
          )
            throw new TRPCError({
              message:
                getAvailability(test, now) === 'upcoming'
                  ? 'This test has not started yet'
                  : 'The entry window for this test has closed',
              code: 'BAD_REQUEST',
            })
        }

        const startedAt = now
        const expiresAt =
          test.type === 'scheduled' && test.durationMinutes != null
            ? addMinutes(startedAt, test.durationMinutes)
            : null

        const attempt = await tx
          .insert(channelTestAttempts)
          .values({
            channelTestId: test.id,
            clerkUserId: ctx.auth.userId,
            startedAt,
            expiresAt,
            status: 'in_progress',
          })
          .returning()
          .then((rows) => rows[0])

        if (!attempt)
          throw new TRPCError({
            message: 'Failed to start test',
            code: 'INTERNAL_SERVER_ERROR',
          })

        const questions = await getQuestionsWithoutAnswers(tx, test.id)
        return toAttemptPayload(attempt, questions, now)
      })
    }),

  /** Get an in-progress or completed attempt without correct answers */
  getAttempt: protectedProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(async ({ ctx, input }) => {
      const attemptRow = await ctx.db.query.channelTestAttempts.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.attemptId),
      })

      if (!attemptRow)
        throw new TRPCError({
          message: 'Attempt not found',
          code: 'NOT_FOUND',
        })

      if (attemptRow.clerkUserId !== ctx.auth.userId)
        throw new TRPCError({
          message: 'You are not authorized to view this attempt',
          code: 'FORBIDDEN',
        })

      const attempt = await expireAttemptIfNeeded(ctx.db, attemptRow)
      const questions = await getQuestionsWithoutAnswers(
        ctx.db,
        attempt.channelTestId,
      )

      return toAttemptPayload(attempt, questions, new Date())
    }),

  /** Submit answers and lock the attempt */
  submit: protectedProcedure
    .input(
      z.object({
        attemptId: z.string(),
        answers: z.array(
          z.object({
            questionId: z.string(),
            optionId: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const attemptRow = await tx.query.channelTestAttempts.findFirst({
          where: (fields, { eq }) => eq(fields.id, input.attemptId),
        })

        if (!attemptRow)
          throw new TRPCError({
            message: 'Attempt not found',
            code: 'NOT_FOUND',
          })

        if (attemptRow.clerkUserId !== ctx.auth.userId)
          throw new TRPCError({
            message: 'You are not authorized to submit this attempt',
            code: 'FORBIDDEN',
          })

        const attempt = await expireAttemptIfNeeded(tx, attemptRow)

        if (attempt.status === 'expired')
          throw new TRPCError({
            message: 'Time is up for this test',
            code: 'BAD_REQUEST',
          })

        if (attempt.status !== 'in_progress')
          throw new TRPCError({
            message: 'This attempt has already been submitted',
            code: 'BAD_REQUEST',
          })

        const questionIds = new Set(input.answers.map((a) => a.questionId))
        if (questionIds.size !== input.answers.length)
          throw new TRPCError({
            message: 'Each question can only have one answer',
            code: 'BAD_REQUEST',
          })

        const questions = await tx.query.channelTestQuestions.findMany({
          where: eq(channelTestQuestions.channelTestId, attempt.channelTestId),
          with: {
            channelTestOptions: true,
          },
        })

        const optionsByQuestionId = new Map(
          questions.map((question) => [
            question.id,
            new Map(
              question.channelTestOptions.map((option) => [option.id, option]),
            ),
          ]),
        )

        for (const answer of input.answers) {
          const options = optionsByQuestionId.get(answer.questionId)

          if (!options)
            throw new TRPCError({
              message: 'One or more answers do not belong to this test',
              code: 'BAD_REQUEST',
            })

          if (!options.has(answer.optionId))
            throw new TRPCError({
              message: 'One or more selected options are invalid',
              code: 'BAD_REQUEST',
            })
        }

        const score = input.answers.reduce((total, answer) => {
          const option = optionsByQuestionId
            .get(answer.questionId)
            ?.get(answer.optionId)

          return total + (option?.isCorrect ? 1 : 0)
        }, 0)

        if (input.answers.length > 0)
          await tx.insert(channelTestAttemptAnswers).values(
            input.answers.map((answer) => ({
              attemptId: attempt.id,
              questionId: answer.questionId,
              optionId: answer.optionId,
            })),
          )

        const submitted = await tx
          .update(channelTestAttempts)
          .set({
            status: 'submitted',
            submittedAt: new Date(),
            score,
          })
          .where(eq(channelTestAttempts.id, attempt.id))
          .returning()
          .then((rows) => rows[0])

        if (!submitted)
          throw new TRPCError({
            message: 'Failed to submit test',
            code: 'INTERNAL_SERVER_ERROR',
          })

        return {
          ...submitted,
          totalQuestions: questions.length,
        }
      })
    }),
}
