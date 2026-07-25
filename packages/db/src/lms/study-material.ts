import { relations } from 'drizzle-orm'
import { index } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'
import { chapter } from './chapter'

export const studyMaterial = lmsPgTable(
  'study_material',
  (d) => ({
    ...initialColumns,
    createdByClerkUserId: d.text().notNull(),
    title: d.text().notNull(),
    description: d.varchar({ length: 5000 }),
    chapterId: d
      .text()
      .notNull()
      .references(() => chapter.id, { onDelete: 'cascade' }),
    isPublished: d.boolean().default(false),
    contentEditedAt: d.timestamp('content_edited_at', {
      mode: 'date',
      withTimezone: true,
    }),
  }),
  (t) => [index().on(t.chapterId), index().on(t.isPublished)],
)

export const studyMaterialFile = lmsPgTable(
  'study_material_file',
  (d) => ({
    ...initialColumns,
    studyMaterialId: d
      .text()
      .notNull()
      .references(() => studyMaterial.id, { onDelete: 'cascade' }),
    fileId: d.text().notNull(),
    name: d.text(),
    orderIndex: d.integer().default(0),
  }),
  (t) => [index().on(t.studyMaterialId), index().on(t.orderIndex)],
)

export const StudyMaterialFileInputSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  name: z.string().optional(),
  orderIndex: z.number().int().optional(),
})

export const CreateStudyMaterialSchema = z.object({
  title: z
    .string()
    .min(3, 'Title of the study material must be at least 3 characters long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  chapterId: z.string().min(1, 'Chapter ID is required'),
  files: z
    .array(StudyMaterialFileInputSchema)
    .min(1, 'At least one file is required'),
})

export const UpdateStudyMaterialSchema = createUpdateSchema(studyMaterial, {
  title: z
    .string()
    .min(3, 'Title of the study material must be at least 3 characters long')
    .optional(),
  description: z.string().max(5000, 'Description is too long').optional(),
  isPublished: z.boolean().optional(),
}).omit({
  id: true,
  chapterId: true,
  contentEditedAt: true,
  createdByClerkUserId: true,
  createdAt: true,
  updatedAt: true,
})

export const ReplaceStudyMaterialFilesSchema = z.object({
  studyMaterialId: z.string().min(1, 'Study material ID is required'),
  files: z.array(
    StudyMaterialFileInputSchema.extend({
      id: z.string().optional(),
    }),
  ),
})

// Keep insert schema for drizzle-kit / internal use
export const InsertStudyMaterialSchema = createInsertSchema(studyMaterial, {
  title: z
    .string()
    .min(3, 'Title of the study material must be at least 3 characters long'),
  description: z.string().max(5000, 'Description is too long').optional(),
}).omit({
  id: true,
  createdAt: true,
  createdByClerkUserId: true,
  updatedAt: true,
  contentEditedAt: true,
  isPublished: true,
})

export const studyMaterialRelations = relations(
  studyMaterial,
  ({ one, many }) => ({
    chapter: one(chapter, {
      fields: [studyMaterial.chapterId],
      references: [chapter.id],
    }),
    files: many(studyMaterialFile),
  }),
)

export const studyMaterialFileRelations = relations(
  studyMaterialFile,
  ({ one }) => ({
    studyMaterial: one(studyMaterial, {
      fields: [studyMaterialFile.studyMaterialId],
      references: [studyMaterial.id],
    }),
  }),
)
