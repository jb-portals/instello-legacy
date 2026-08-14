import { relations } from 'drizzle-orm'
import { index, uniqueIndex } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
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
  }),
  (self) => [
    index().on(self.title),
    index().on(self.channelId),
    index().on(self.isPublished),
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
  }),
)

export const CreateChannelTestSchema = createInsertSchema(channelTests, {
  title: z
    .string()
    .max(256, "Title can't exceed more than 256 characters")
    .min(1, 'Required'),
  channelId: z.string().min(1, 'Required'),
}).omit({
  isPublished: true,
  createdBy: true,
})

export const UpdateChannelTestSchema = createUpdateSchema(channelTests, {
  title: z
    .string()
    .max(256, "Title can't exceed more than 256 characters")
    .min(1, 'Required'),
  description: z.string().min(1, 'Required'),
})
  .partial()
  .omit({
    channelId: true,
    createdAt: true,
    updatedAt: true,
    isPublished: true,
    createdBy: true,
  })
  .and(z.object({ id: z.string().min(1, 'Required') }))

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
  ({ one }) => ({
    channelTestQuestion: one(channelTestOptions, {
      fields: [channelTestOptions.channelTestQuestionId],
      references: [channelTestOptions.id],
    }),
  }),
)
