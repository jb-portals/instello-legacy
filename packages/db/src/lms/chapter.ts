import { relations } from 'drizzle-orm'
import { index } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'
import { channel } from './channel'
import { studyMaterial } from './study-material'
import { video } from './video'

export const chapter = lmsPgTable(
  'chapter',
  (d) => ({
    ...initialColumns,
    createdByClerkUserId: d.text().notNull(),
    title: d.text().notNull(),
    channelId: d
      .text()
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    isPublished: d.boolean().default(false),
  }),
  (t) => [
    index().on(t.channelId),
    index().on(t.isPublished),
    index().on(t.title),
  ],
)

export const CreateChapterSchema = createInsertSchema(chapter, {
  title: z
    .string()
    .min(3, 'Title of the chapter must be atleast 2 characters long'),
}).omit({
  id: true,
  createdAt: true,
  isPublished: true,
  createdByClerkUserId: true,
  updatedAt: true,
})

export const UpdateChapterSchema = createUpdateSchema(chapter, {
  id: z.string().min(1, 'Chapter ID is required for updation'),
  title: z.string().optional(),
  isPublished: z.boolean().optional(),
}).omit({
  createdAt: true,
  channelId: true,
  createdByClerkUserId: true,
  updatedAt: true,
})

export const chapterRealations = relations(chapter, ({ many, one }) => ({
  videos: many(video),
  studyMaterials: many(studyMaterial),
  channel: one(channel, {
    fields: [chapter.channelId],
    references: [channel.id],
  }),
}))
