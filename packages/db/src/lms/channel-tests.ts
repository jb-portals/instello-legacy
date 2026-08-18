import { relations } from 'drizzle-orm'
import { index, uniqueIndex } from 'drizzle-orm/pg-core'
import { z } from 'zod/v4'
import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'
import { channel } from './channel'

export const channelTests = lmsPgTable(
  'channel_tests',
  (d) => ({
    ...initialColumns,
    channelId: d.text().references(() => channel.id, { onDelete: 'cascade' }),
    title: d.varchar({ length: 256 }).notNull(),
    description: d.text().notNull(),
    createdBy: d.text().notNull(),
    isPublished: d.boolean().default(false).notNull(),
    type: d
      .text({ enum: ['open', 'scheduled'] })
      .notNull()
      .default('open'),
    startsAt: d.timestamp({ withTimezone: true, mode: 'date' }),
    endsAt: d.timestamp({ withTimezone: true, mode: 'date' }),
    durationMinutes: d.integer(),
  }),
  (self) => [
    index().on(self.title),
    index().on(self.channelId),
    index().on(self.isPublished),
    index().on(self.type),
  ],
)

export const channelTestsRelations = relations(
  channelTests,
  ({ one, many }) => ({
    channel: one(channel, {
      fields: [channelTests.channelId],
      references: [channel.id],
    }),
    channelTestQuestions: many(channelTestQuestions),
    channelTestAttempts: many(channelTestAttempts),
  }),
)

const channelTestTitleSchema = z
  .string()
  .max(256, "Title can't exceed more than 256 characters")
  .min(1, 'Required')

const createChannelTestBase = z.object({
  title: channelTestTitleSchema,
  description: z.string().min(1, 'Required'),
  channelId: z.string().min(1, 'Required'),
})

export const CreateChannelTestSchema = z
  .discriminatedUnion('type', [
    createChannelTestBase.extend({
      type: z.literal('open'),
    }),
    createChannelTestBase.extend({
      type: z.literal('scheduled'),
      startsAt: z.date(),
      endsAt: z.date(),
      durationMinutes: z
        .number()
        .int()
        .min(1, 'Duration must be at least 1 minute'),
    }),
  ])
  .check((ctx) => {
    if (
      ctx.value.type === 'scheduled' &&
      ctx.value.endsAt <= ctx.value.startsAt
    ) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endsAt,
        values: [],
        message: 'End time must be after start time',
        path: ['endsAt'],
      })
    }
  })

export const UpdateChannelTestSchema = z
  .object({
    id: z.string().min(1, 'Required'),
    title: channelTestTitleSchema.optional(),
    description: z.string().min(1, 'Required').optional(),
    isPublished: z.boolean().optional(),
    type: z.enum(['open', 'scheduled']).optional(),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
    durationMinutes: z
      .number()
      .int()
      .min(1, 'Duration must be at least 1 minute')
      .optional(),
  })
  .check((ctx) => {
    if (ctx.value.type === 'scheduled') {
      if (!ctx.value.startsAt) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.startsAt,
          values: [],
          message: 'Start time is required for scheduled tests',
          path: ['startsAt'],
        })
      }

      if (!ctx.value.endsAt) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.endsAt,
          values: [],
          message: 'End time is required for scheduled tests',
          path: ['endsAt'],
        })
      }

      if (ctx.value.durationMinutes == null) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.durationMinutes,
          values: [],
          message: 'Duration is required for scheduled tests',
          path: ['durationMinutes'],
        })
      }
    }

    if (
      ctx.value.startsAt &&
      ctx.value.endsAt &&
      ctx.value.endsAt <= ctx.value.startsAt
    ) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endsAt,
        values: [],
        message: 'End time must be after start time',
        path: ['endsAt'],
      })
    }
  })

export const channelTestQuestions = lmsPgTable(
  'channel_test_questions',
  (d) => ({
    ...initialColumns,
    channelTestId: d
      .text()
      .references(() => channelTests.id, { onDelete: 'cascade' }),
    title: d.text().notNull(),
    orderIdx: d.integer().notNull(),
  }),
  (self) => [
    index().on(self.title),
    uniqueIndex().on(self.channelTestId, self.orderIdx),
    index().on(self.channelTestId),
  ],
)

export const channelTestQuestionsRelations = relations(
  channelTestQuestions,
  ({ one, many }) => ({
    channelTest: one(channelTests, {
      fields: [channelTestQuestions.channelTestId],
      references: [channelTests.id],
    }),
    channelTestOptions: many(channelTestOptions),
    channelTestAttemptAnswers: many(channelTestAttemptAnswers),
  }),
)

export const channelTestOptions = lmsPgTable(
  'channel_test_options',
  (d) => ({
    ...initialColumns,
    label: d.text().notNull(),
    isCorrect: d.boolean().notNull(),
    channelTestQuestionId: d
      .text()
      .notNull()
      .references(() => channelTestQuestions.id, { onDelete: 'cascade' }),
    orderIdx: d.integer().notNull(),
  }),
  (self) => [
    index().on(self.label),
    index().on(self.isCorrect),
    uniqueIndex().on(self.channelTestQuestionId, self.orderIdx),
  ],
)

export const channelTestOptionsRelations = relations(
  channelTestOptions,
  ({ one, many }) => ({
    channelTestQuestion: one(channelTestQuestions, {
      fields: [channelTestOptions.channelTestQuestionId],
      references: [channelTestQuestions.id],
    }),
    channelTestAttemptAnswers: many(channelTestAttemptAnswers),
  }),
)

export const channelTestAttempts = lmsPgTable(
  'channel_test_attempts',
  (d) => ({
    ...initialColumns,
    channelTestId: d
      .text()
      .notNull()
      .references(() => channelTests.id, { onDelete: 'cascade' }),
    clerkUserId: d.text().notNull(),
    startedAt: d
      .timestamp({ withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    submittedAt: d.timestamp({ withTimezone: true, mode: 'date' }),
    expiresAt: d.timestamp({ withTimezone: true, mode: 'date' }),
    status: d
      .text({ enum: ['in_progress', 'submitted', 'expired'] })
      .notNull()
      .default('in_progress'),
    score: d.integer(),
  }),
  (self) => [
    index().on(self.channelTestId, self.clerkUserId),
    index().on(self.status),
    index().on(self.clerkUserId),
  ],
)

export const channelTestAttemptsRelations = relations(
  channelTestAttempts,
  ({ one, many }) => ({
    channelTest: one(channelTests, {
      fields: [channelTestAttempts.channelTestId],
      references: [channelTests.id],
    }),
    channelTestAttemptAnswers: many(channelTestAttemptAnswers),
  }),
)

export const channelTestAttemptAnswers = lmsPgTable(
  'channel_test_attempt_answers',
  (d) => ({
    ...initialColumns,
    attemptId: d
      .text()
      .notNull()
      .references(() => channelTestAttempts.id, { onDelete: 'cascade' }),
    questionId: d
      .text()
      .notNull()
      .references(() => channelTestQuestions.id, { onDelete: 'cascade' }),
    optionId: d
      .text()
      .notNull()
      .references(() => channelTestOptions.id, { onDelete: 'cascade' }),
  }),
  (self) => [
    uniqueIndex().on(self.attemptId, self.questionId),
    index().on(self.attemptId),
    index().on(self.questionId),
  ],
)

export const channelTestAttemptAnswersRelations = relations(
  channelTestAttemptAnswers,
  ({ one }) => ({
    attempt: one(channelTestAttempts, {
      fields: [channelTestAttemptAnswers.attemptId],
      references: [channelTestAttempts.id],
    }),
    question: one(channelTestQuestions, {
      fields: [channelTestAttemptAnswers.questionId],
      references: [channelTestQuestions.id],
    }),
    option: one(channelTestOptions, {
      fields: [channelTestAttemptAnswers.optionId],
      references: [channelTestOptions.id],
    }),
  }),
)
