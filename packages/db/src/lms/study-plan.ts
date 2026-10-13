import { relations, sql } from 'drizzle-orm'
import { check, foreignKey, index } from 'drizzle-orm/pg-core'
import { z } from 'zod/v4'

import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'

export const studyPlanActivityKinds = [
  'study',
  'revision',
  'assignment',
  'practice',
  'test_preparation',
  'project',
  'personal',
  'other',
  'break',
  'stretch',
] as const

export const studyPlanActivityPriorities = ['low', 'medium', 'high'] as const

export const studyPlanActivityReminders = [
  'none',
  '5m',
  '15m',
  '30m',
  '1h',
] as const

export const studyPlanActivityRecurrences = [
  'none',
  'daily',
  'weekdays',
  'weekly',
] as const

export const studyPlanActivityStatuses = [
  'planned',
  'completed_successfully',
  'partially_completed',
  'not_completed',
  'skipped',
  'rescheduled',
] as const

export const studyPlan = lmsPgTable(
  'study_plan',
  (d) => ({
    ...initialColumns,
    createdByClerkUserId: d.text().notNull(),
    name: d.varchar({ length: 255 }).notNull(),
    note: d.text().notNull().default(''),
  }),
  (t) => [index().on(t.createdByClerkUserId)],
)

export const studyPlanActivity = lmsPgTable(
  'study_plan_activity',
  (d) => ({
    ...initialColumns,
    planId: d
      .text()
      .notNull()
      .references(() => studyPlan.id, { onDelete: 'cascade' }),
    seriesId: d.text(),
    rescheduledFromId: d.text(),
    title: d.varchar({ length: 255 }).notNull(),
    kind: d.text({ enum: studyPlanActivityKinds }).notNull(),
    startsAt: d.timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    endsAt: d.timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    priority: d
      .text({ enum: studyPlanActivityPriorities })
      .notNull()
      .default('medium'),
    reminder: d
      .text({ enum: studyPlanActivityReminders })
      .notNull()
      .default('none'),
    recurrence: d
      .text({ enum: studyPlanActivityRecurrences })
      .notNull()
      .default('none'),
    status: d
      .text({ enum: studyPlanActivityStatuses })
      .notNull()
      .default('planned'),
  }),
  (t) => [
    index().on(t.planId),
    index().on(t.seriesId),
    index().on(t.startsAt),
    foreignKey({
      columns: [t.rescheduledFromId],
      foreignColumns: [t.id],
    }).onDelete('set null'),
    check(
      'study_plan_activity_ends_after_start',
      sql`${t.endsAt} > ${t.startsAt}`,
    ),
  ],
)

export const studyPlanRelations = relations(studyPlan, ({ many }) => ({
  activities: many(studyPlanActivity),
}))

export const studyPlanActivityRelations = relations(
  studyPlanActivity,
  ({ one, many }) => ({
    plan: one(studyPlan, {
      fields: [studyPlanActivity.planId],
      references: [studyPlan.id],
    }),
    rescheduledFrom: one(studyPlanActivity, {
      fields: [studyPlanActivity.rescheduledFromId],
      references: [studyPlanActivity.id],
      relationName: 'rescheduledActivities',
    }),
    rescheduledActivities: many(studyPlanActivity, {
      relationName: 'rescheduledActivities',
    }),
  }),
)

const studyPlanNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(255, 'Name is too long')

export const CreateStudyPlanSchema = z.object({
  name: studyPlanNameSchema,
  note: z.string().trim().max(5000, 'Note is too long').optional(),
})

export const UpdateStudyPlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  name: studyPlanNameSchema.optional(),
  note: z.string().trim().max(5000, 'Note is too long').optional(),
})

const studyPlanActivityDraftSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(255, 'Title is too long'),
    kind: z.enum(studyPlanActivityKinds),
    startsAt: z.date(),
    endsAt: z.date(),
    priority: z.enum(studyPlanActivityPriorities).default('medium'),
    reminder: z.enum(studyPlanActivityReminders).default('none'),
    recurrence: z.enum(studyPlanActivityRecurrences).default('none'),
  })
  .check((ctx) => {
    if (ctx.value.endsAt <= ctx.value.startsAt) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endsAt,
        values: [],
        message: 'End time must be after start time',
        path: ['endsAt'],
      })
    }
  })

export const CreateStudyPlanActivitySchema = studyPlanActivityDraftSchema.and(
  z.object({
    planId: z.string().min(1, 'Plan ID is required'),
  }),
)

export const UpdateStudyPlanActivitySchema = studyPlanActivityDraftSchema.and(
  z.object({
    activityId: z.string().min(1, 'Activity ID is required'),
  }),
)

export const SetStudyPlanActivityStatusSchema = z.object({
  activityId: z.string().min(1, 'Activity ID is required'),
  status: z.enum(studyPlanActivityStatuses),
})

export const RescheduleStudyPlanActivitySchema =
  studyPlanActivityDraftSchema.and(
    z.object({
      activityId: z.string().min(1, 'Activity ID is required'),
    }),
  )
