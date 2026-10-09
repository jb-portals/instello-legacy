import { relations, sql } from 'drizzle-orm'
import { check, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { z } from 'zod/v4'

import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'

export const studyGroupMemberRoles = ['owner', 'member'] as const

export const studyGroupMemberStatuses = ['invited', 'active'] as const

export const studyGroupSessionStatuses = ['scheduled', 'live', 'ended'] as const

export const studyGroupTaskScopes = ['common', 'individual'] as const

export const studyGroupTaskStatuses = ['open', 'done'] as const

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(255, 'Name is too long')

const noteSchema = z.string().trim().max(5000, 'Note is too long')

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(255, 'Title is too long')

export const studyGroup = lmsPgTable('study_group', (d) => ({
  ...initialColumns,
  createdByClerkUserId: d.text().notNull(),
  name: d.varchar({ length: 255 }).notNull(),
  note: d.text().notNull().default(''),
}))

export const studyGroupMember = lmsPgTable(
  'study_group_member',
  (d) => ({
    ...initialColumns,
    groupId: d
      .text()
      .notNull()
      .references(() => studyGroup.id, { onDelete: 'cascade' }),
    clerkUserId: d.text().notNull(),
    role: d.text({ enum: studyGroupMemberRoles }).notNull().default('member'),
    status: d
      .text({ enum: studyGroupMemberStatuses })
      .notNull()
      .default('invited'),
    invitedByClerkUserId: d.text(),
  }),
  (t) => [
    uniqueIndex().on(t.groupId, t.clerkUserId),
    index().on(t.clerkUserId),
  ],
)

export const studyGroupPlan = lmsPgTable(
  'study_group_plan',
  (d) => ({
    ...initialColumns,
    groupId: d
      .text()
      .notNull()
      .references(() => studyGroup.id, { onDelete: 'cascade' }),
    createdByClerkUserId: d.text().notNull(),
    name: d.varchar({ length: 255 }).notNull(),
    note: d.text().notNull().default(''),
  }),
  (t) => [index().on(t.groupId)],
)

export const studyGroupSession = lmsPgTable(
  'study_group_session',
  (d) => ({
    ...initialColumns,
    groupId: d
      .text()
      .notNull()
      .references(() => studyGroup.id, { onDelete: 'cascade' }),
    planId: d
      .text()
      .references(() => studyGroupPlan.id, { onDelete: 'set null' }),
    createdByClerkUserId: d.text().notNull(),
    title: d.varchar({ length: 255 }).notNull(),
    startsAt: d.timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    endsAt: d.timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    status: d
      .text({ enum: studyGroupSessionStatuses })
      .notNull()
      .default('scheduled'),
  }),
  (t) => [
    index().on(t.groupId),
    index().on(t.startsAt),
    check(
      'study_group_session_ends_after_start',
      sql`${t.endsAt} > ${t.startsAt}`,
    ),
  ],
)

export const studyGroupSessionParticipant = lmsPgTable(
  'study_group_session_participant',
  (d) => ({
    ...initialColumns,
    sessionId: d
      .text()
      .notNull()
      .references(() => studyGroupSession.id, { onDelete: 'cascade' }),
    clerkUserId: d.text().notNull(),
    joinedAt: d.timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    leftAt: d.timestamp({ withTimezone: true, mode: 'date' }),
  }),
  (t) => [uniqueIndex().on(t.sessionId, t.clerkUserId)],
)

export const studyGroupTask = lmsPgTable(
  'study_group_task',
  (d) => ({
    ...initialColumns,
    groupId: d
      .text()
      .notNull()
      .references(() => studyGroup.id, { onDelete: 'cascade' }),
    planId: d
      .text()
      .references(() => studyGroupPlan.id, { onDelete: 'set null' }),
    createdByClerkUserId: d.text().notNull(),
    title: d.varchar({ length: 255 }).notNull(),
    scope: d.text({ enum: studyGroupTaskScopes }).notNull(),
    assigneeClerkUserId: d.text(),
    status: d.text({ enum: studyGroupTaskStatuses }).notNull().default('open'),
  }),
  (t) => [
    index().on(t.groupId),
    check(
      'study_group_task_assignee_matches_scope',
      sql`(
        (${t.scope} = 'common' and ${t.assigneeClerkUserId} is null)
        or (${t.scope} = 'individual' and ${t.assigneeClerkUserId} is not null)
      )`,
    ),
  ],
)

export const studyGroupRelations = relations(studyGroup, ({ many }) => ({
  members: many(studyGroupMember),
  plans: many(studyGroupPlan),
  sessions: many(studyGroupSession),
  tasks: many(studyGroupTask),
}))

export const studyGroupMemberRelations = relations(
  studyGroupMember,
  ({ one }) => ({
    group: one(studyGroup, {
      fields: [studyGroupMember.groupId],
      references: [studyGroup.id],
    }),
  }),
)

export const studyGroupPlanRelations = relations(
  studyGroupPlan,
  ({ one, many }) => ({
    group: one(studyGroup, {
      fields: [studyGroupPlan.groupId],
      references: [studyGroup.id],
    }),
    sessions: many(studyGroupSession),
    tasks: many(studyGroupTask),
  }),
)

export const studyGroupSessionRelations = relations(
  studyGroupSession,
  ({ one, many }) => ({
    group: one(studyGroup, {
      fields: [studyGroupSession.groupId],
      references: [studyGroup.id],
    }),
    plan: one(studyGroupPlan, {
      fields: [studyGroupSession.planId],
      references: [studyGroupPlan.id],
    }),
    participants: many(studyGroupSessionParticipant),
  }),
)

export const studyGroupSessionParticipantRelations = relations(
  studyGroupSessionParticipant,
  ({ one }) => ({
    session: one(studyGroupSession, {
      fields: [studyGroupSessionParticipant.sessionId],
      references: [studyGroupSession.id],
    }),
  }),
)

export const studyGroupTaskRelations = relations(studyGroupTask, ({ one }) => ({
  group: one(studyGroup, {
    fields: [studyGroupTask.groupId],
    references: [studyGroup.id],
  }),
  plan: one(studyGroupPlan, {
    fields: [studyGroupTask.planId],
    references: [studyGroupPlan.id],
  }),
}))

export const CreateStudyGroupSchema = z.object({
  name: nameSchema,
  note: noteSchema.optional(),
})

export const StudyGroupIdSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
})

export const InviteStudyGroupMemberSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  clerkUserId: z.string().min(1, 'Student is required'),
})

export const RemoveStudyGroupMemberSchema = InviteStudyGroupMemberSchema

export const CreateStudyGroupPlanSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  name: nameSchema,
  note: noteSchema.optional(),
})

export const RenameStudyGroupPlanSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),
  name: nameSchema,
  note: noteSchema.optional(),
})

export const CreateStudyGroupSessionSchema = z
  .object({
    groupId: z.string().min(1, 'Group is required'),
    planId: z.string().min(1).optional(),
    title: titleSchema,
    startsAt: z.date(),
    endsAt: z.date(),
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

export const StudyGroupSessionIdSchema = z.object({
  sessionId: z.string().min(1, 'Session is required'),
})

export const CreateStudyGroupTaskSchema = z
  .object({
    groupId: z.string().min(1, 'Group is required'),
    planId: z.string().min(1).optional(),
    title: titleSchema,
    scope: z.enum(studyGroupTaskScopes),
    assigneeClerkUserId: z.string().min(1).optional(),
  })
  .check((ctx) => {
    if (ctx.value.scope === 'individual' && !ctx.value.assigneeClerkUserId) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.assigneeClerkUserId,
        values: [],
        message: 'Choose who this task is for',
        path: ['assigneeClerkUserId'],
      })
    }
    if (ctx.value.scope === 'common' && ctx.value.assigneeClerkUserId) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.assigneeClerkUserId,
        values: [],
        message: 'A common task has no assignee',
        path: ['assigneeClerkUserId'],
      })
    }
  })

export const SetStudyGroupTaskStatusSchema = z.object({
  taskId: z.string().min(1, 'Task is required'),
  status: z.enum(studyGroupTaskStatuses),
})
