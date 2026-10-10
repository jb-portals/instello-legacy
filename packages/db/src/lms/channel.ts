import { relations } from 'drizzle-orm'
import { index } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'
import { channelTests } from './channel-tests'
import { chapter } from './chapter'
import { collegeOrBranch } from './college-or-branch'
import { subscription } from './subscription'

export const channel = lmsPgTable(
  'channel',
  (d) => ({
    ...initialColumns,
    createdByClerkUserId: d.text().notNull(),
    title: d.varchar({ length: 100 }).notNull(),
    description: d.varchar({ length: 256 }),
    isPublic: d.boolean().default(false),
    thumbneilId: d.varchar({ length: 100 }),
    collegeId: d.text().references(() => collegeOrBranch.id),
    branchId: d.text().references(() => collegeOrBranch.id),
    subjectCode: d.text(),
  }),
  (t) => [index().on(t.isPublic), index().on(t.createdAt)],
)

export const channelRelations = relations(channel, ({ many }) => ({
  chapters: many(chapter),
  subscriptions: many(subscription),
  channelTests: many(channelTests),
}))

export const CreateChannelSchema = createInsertSchema(channel, {
  title: z
    .string({ error: 'Required' })
    .min(3, 'Title of the channel must be atleast 3 characters long'),
  subjectCode: z
    .string({ error: 'Required' })
    .min(3, 'Subject code is required'),
  description: z.string().optional(),
  collegeId: z.string().optional(),
  branchId: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  createdByClerkUserId: true,
  updatedAt: true,
})

export const UpdateChannelSchema = createUpdateSchema(channel, {
  id: z.string().min(1, 'Channel ID is required for updation'),
  subjectCode: z
    .string({ error: 'Required' })
    .min(3, 'Subject code is required'),
  title: z
    .string()
    .min(3, 'Title of the channel must be atlease 3 characters long'),
  description: z.string().optional(),
  thumbneilId: z.string().min(1, 'Thumbneil required'),
  collegeId: z.string().optional(),
  branchId: z.string().optional(),
  isPublic: z.boolean().optional(),
}).omit({
  createdAt: true,
  createdByClerkUserId: true,
  updatedAt: true,
})
