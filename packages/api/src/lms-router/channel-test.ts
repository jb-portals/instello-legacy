import { eq } from '@instello/db'
import {
  CreateChannelTestSchema,
  channelTestOptions,
  channelTestQuestions,
  channelTests,
  UpdateChannelTestSchema,
} from '@instello/db/lms'
import { TRPCError } from '@trpc/server'
import { z } from 'zod/v4'
import { protectedProcedure } from '../trpc'

export const channelTest = {
  /** Create test under channel */
  create: protectedProcedure
    .input(CreateChannelTestSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(channelTests)
        .values({ ...input, createdBy: ctx.auth.userId, isPublished: false })
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

      const channelTests = await ctx.db.query.channelTests.findMany({
        where: (fields, { eq }) => eq(fields.channelId, input.channelId),
        orderBy: (fields, { desc }) => desc(fields.createdAt),
      })

      return channelTests
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

      await ctx.db
        .update(channelTests)
        .set({
          title: input.title,
          description: input.description,
        })
        .where(eq(channelTests.id, row.id))
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
        const channelTest = await tx.query.channelTests.findFirst({
          where: (fields, { eq }) => eq(fields.id, input.channelTestId),
        })

        if (!channelTest)
          throw new TRPCError({
            message: 'Channel test not found',
            code: 'NOT_FOUND',
          })

        // 3. Channel test must be created by the current user
        if (channelTest.createdBy !== ctx.auth.userId)
          throw new TRPCError({
            message:
              'You are not authorized to add questions and options to this channel test',
            code: 'FORBIDDEN',
          })

        // 4. Get next order index
        const nextOrderIdx = await tx.query.channelTestQuestions
          .findFirst({
            extras: ({ orderIdx }, { sql }) => ({
              maxOrderIdx: sql`MAX(${orderIdx})`
                .mapWith(Number)
                .as('maxOrderIdx'),
            }),
            where: (fields, { eq }) => eq(fields.channelTestId, channelTest.id),
          })
          .then((res) => res?.maxOrderIdx ?? 0)

        // 5. Add question
        const question = await tx
          .insert(channelTestQuestions)
          .values({
            channelTestId: channelTest.id,
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
}
