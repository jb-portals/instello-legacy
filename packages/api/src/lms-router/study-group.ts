import {
  and,
  eq,
  gte,
  inArray,
  isDrizzleQueryError,
  lt,
  ne,
} from '@instello/db'
import {
  CreateStudyGroupPlanSchema,
  CreateStudyGroupSchema,
  CreateStudyGroupSessionSchema,
  CreateStudyGroupTaskSchema,
  friendship,
  InviteStudyGroupMemberSchema,
  RemoveStudyGroupMemberSchema,
  RenameStudyGroupPlanSchema,
  SetStudyGroupTaskStatusSchema,
  StudyGroupIdSchema,
  StudyGroupSessionIdSchema,
  studyGroup,
  studyGroupMember,
  studyGroupPlan,
  studyGroupSession,
  studyGroupSessionParticipant,
  studyGroupTask,
} from '@instello/db/lms'
import { TRPCError } from '@trpc/server'

import {
  type ClerkStudentProfile,
  getClerkProfiles,
  profileOrFallback,
} from '../router.helpers'
import type { Context } from '../trpc'
import { protectedProcedure } from '../trpc'

const SESSION_OPEN_MS = 15 * 60 * 1000

type Database = Context['db']
type TaskDeleter = Pick<
  Parameters<Parameters<Database['transaction']>[0]>[0],
  'delete'
>
type Membership = typeof studyGroupMember.$inferSelect
type SessionRow = typeof studyGroupSession.$inferSelect & {
  participants: (typeof studyGroupSessionParticipant.$inferSelect)[]
}
type TaskRow = typeof studyGroupTask.$inferSelect

function orderedPair(a: string, b: string) {
  return a < b
    ? { clerkUserIdLow: a, clerkUserIdHigh: b }
    : { clerkUserIdLow: b, clerkUserIdHigh: a }
}

async function endExpiredSessions(db: Database, groupIds: string[]) {
  if (groupIds.length === 0) return
  await db
    .update(studyGroupSession)
    .set({ status: 'ended', updatedAt: new Date() })
    .where(
      and(
        inArray(studyGroupSession.groupId, groupIds),
        lt(studyGroupSession.endsAt, new Date()),
        ne(studyGroupSession.status, 'ended'),
      ),
    )
}

async function requireActiveMember(
  db: Database,
  userId: string,
  groupId: string,
) {
  const membership = await db.query.studyGroupMember.findFirst({
    where: and(
      eq(studyGroupMember.groupId, groupId),
      eq(studyGroupMember.clerkUserId, userId),
    ),
  })

  if (!membership || membership.status !== 'active') {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Study group not found',
    })
  }

  return membership
}

async function requireMembership(
  db: Database,
  userId: string,
  groupId: string,
) {
  const membership = await db.query.studyGroupMember.findFirst({
    where: and(
      eq(studyGroupMember.groupId, groupId),
      eq(studyGroupMember.clerkUserId, userId),
    ),
  })

  if (
    !membership ||
    (membership.status !== 'active' && membership.status !== 'invited')
  ) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Study group not found',
    })
  }

  return membership
}

function requireOwner(membership: Membership) {
  if (membership.role !== 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the group owner can do that',
    })
  }
}

async function requirePlanInGroup(
  db: Database,
  groupId: string,
  planId: string | undefined,
) {
  if (!planId) return
  const plan = await db.query.studyGroupPlan.findFirst({
    where: and(
      eq(studyGroupPlan.id, planId),
      eq(studyGroupPlan.groupId, groupId),
    ),
  })

  if (!plan) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'That plan is not in this group',
    })
  }
}

async function loadGroup(db: Database, groupId: string) {
  return db.query.studyGroup.findFirst({
    where: eq(studyGroup.id, groupId),
    with: {
      members: true,
      plans: {
        orderBy: (table, { desc: byDesc }) => [byDesc(table.createdAt)],
      },
      sessions: {
        orderBy: (table, { asc: byAsc }) => [byAsc(table.startsAt)],
        with: { participants: true },
      },
      tasks: {
        orderBy: (table, { desc: byDesc }) => [byDesc(table.createdAt)],
      },
    },
  })
}

function mapSession(
  session: SessionRow,
  userId: string,
  profiles: Map<string, ClerkStudentProfile>,
) {
  const mine = session.participants.find(
    (participant) => participant.clerkUserId === userId,
  )

  return {
    id: session.id,
    groupId: session.groupId,
    planId: session.planId,
    title: session.title,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    status: session.status,
    createdByClerkUserId: session.createdByClerkUserId,
    joinedCount: session.participants.length,
    me: mine ? { joinedAt: mine.joinedAt, leftAt: mine.leftAt } : null,
    participants: session.participants.map((participant) => ({
      clerkUserId: participant.clerkUserId,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      profile: profileOrFallback(profiles, participant.clerkUserId),
    })),
  }
}

function mapTask(task: TaskRow, profiles: Map<string, ClerkStudentProfile>) {
  return {
    id: task.id,
    groupId: task.groupId,
    planId: task.planId,
    title: task.title,
    scope: task.scope,
    status: task.status,
    assigneeClerkUserId: task.assigneeClerkUserId,
    createdByClerkUserId: task.createdByClerkUserId,
    assignee: task.assigneeClerkUserId
      ? profileOrFallback(profiles, task.assigneeClerkUserId)
      : null,
  }
}

async function deleteAssigneeTasks(
  db: TaskDeleter,
  groupId: string,
  clerkUserId: string,
) {
  await db
    .delete(studyGroupTask)
    .where(
      and(
        eq(studyGroupTask.groupId, groupId),
        eq(studyGroupTask.scope, 'individual'),
        eq(studyGroupTask.assigneeClerkUserId, clerkUserId),
      ),
    )
}

function progressFor(
  group: NonNullable<Awaited<ReturnType<typeof loadGroup>>>,
  profiles: Map<string, ClerkStudentProfile>,
) {
  const activeMembers = group.members.filter(
    (member) => member.status === 'active',
  )
  const commonTasks = group.tasks.filter((task) => task.scope === 'common')

  return {
    common: {
      done: commonTasks.filter((task) => task.status === 'done').length,
      total: commonTasks.length,
    },
    members: activeMembers.map((member) => {
      const individual = group.tasks.filter(
        (task) =>
          task.scope === 'individual' &&
          task.assigneeClerkUserId === member.clerkUserId,
      )
      const sessionsJoined = group.sessions.filter((session) =>
        session.participants.some(
          (participant) => participant.clerkUserId === member.clerkUserId,
        ),
      ).length

      return {
        clerkUserId: member.clerkUserId,
        profile: profileOrFallback(profiles, member.clerkUserId),
        individualDone: individual.filter((task) => task.status === 'done')
          .length,
        individualTotal: individual.length,
        sessionsJoined,
      }
    }),
    sessions: group.sessions.map((session) => ({
      sessionId: session.id,
      title: session.title,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      joinedCount: session.participants.length,
      memberCount: activeMembers.length,
    })),
  }
}

export const studyGroupRouter = {
  create: protectedProcedure
    .input(CreateStudyGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [group] = await tx
          .insert(studyGroup)
          .values({
            createdByClerkUserId: ctx.auth.userId,
            name: input.name,
            note: input.note ?? '',
          })
          .returning()

        if (!group) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to create study group',
          })
        }

        await tx.insert(studyGroupMember).values({
          groupId: group.id,
          clerkUserId: ctx.auth.userId,
          role: 'owner',
          status: 'active',
        })

        return group
      })
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const mine = await ctx.db.query.studyGroupMember.findMany({
      where: and(
        eq(studyGroupMember.clerkUserId, ctx.auth.userId),
        inArray(studyGroupMember.status, ['active', 'invited']),
      ),
    })

    if (mine.length === 0) return []

    const groupIds = mine.map((membership) => membership.groupId)
    await endExpiredSessions(ctx.db, groupIds)

    const [groups, members, sessions] = await Promise.all([
      ctx.db.query.studyGroup.findMany({
        where: inArray(studyGroup.id, groupIds),
        orderBy: (table, { desc: byDesc }) => [byDesc(table.createdAt)],
      }),
      ctx.db.query.studyGroupMember.findMany({
        where: inArray(studyGroupMember.groupId, groupIds),
      }),
      ctx.db.query.studyGroupSession.findMany({
        where: and(
          inArray(studyGroupSession.groupId, groupIds),
          gte(studyGroupSession.endsAt, new Date()),
          ne(studyGroupSession.status, 'ended'),
        ),
        orderBy: (table, { asc: byAsc }) => [byAsc(table.startsAt)],
      }),
    ])

    const membershipByGroup = new Map(
      mine.map((membership) => [membership.groupId, membership]),
    )
    const nextSessionByGroup = new Map<string, (typeof sessions)[number]>()
    for (const session of sessions) {
      if (!nextSessionByGroup.has(session.groupId)) {
        nextSessionByGroup.set(session.groupId, session)
      }
    }

    return groups.map((group) => {
      const membership = membershipByGroup.get(group.id)
      const nextSession = nextSessionByGroup.get(group.id)
      return {
        id: group.id,
        name: group.name,
        note: group.note,
        myRole: membership?.role ?? 'member',
        myStatus: membership?.status ?? 'invited',
        memberCount: members.filter(
          (member) => member.groupId === group.id && member.status === 'active',
        ).length,
        nextSession: nextSession
          ? {
              id: nextSession.id,
              title: nextSession.title,
              startsAt: nextSession.startsAt,
              endsAt: nextSession.endsAt,
            }
          : null,
      }
    })
  }),

  get: protectedProcedure
    .input(StudyGroupIdSchema)
    .query(async ({ ctx, input }) => {
      const membership = await requireMembership(
        ctx.db,
        ctx.auth.userId,
        input.groupId,
      )
      await endExpiredSessions(ctx.db, [input.groupId])
      const group = await loadGroup(ctx.db, input.groupId)

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study group not found',
        })
      }

      if (membership.status === 'invited') {
        const inviterId = membership.invitedByClerkUserId
        const profiles = await getClerkProfiles(
          ctx,
          inviterId ? [inviterId] : [],
        )
        return {
          access: 'invited' as const,
          group: { id: group.id, name: group.name, note: group.note },
          invitedBy: inviterId ? profileOrFallback(profiles, inviterId) : null,
        }
      }

      const profileIds = [
        ...group.members.map((member) => member.clerkUserId),
        ...group.tasks.flatMap((task) =>
          task.assigneeClerkUserId ? [task.assigneeClerkUserId] : [],
        ),
        ...group.sessions.flatMap((session) =>
          session.participants.map((participant) => participant.clerkUserId),
        ),
      ]
      const profiles = await getClerkProfiles(ctx, profileIds)

      return {
        access: 'active' as const,
        group: {
          id: group.id,
          name: group.name,
          note: group.note,
          createdByClerkUserId: group.createdByClerkUserId,
        },
        myRole: membership.role,
        members: group.members.map((member) => ({
          clerkUserId: member.clerkUserId,
          role: member.role,
          status: member.status,
          profile: profileOrFallback(profiles, member.clerkUserId),
        })),
        plans: group.plans,
        sessions: group.sessions.map((session) =>
          mapSession(session, ctx.auth.userId, profiles),
        ),
        tasks: group.tasks.map((task) => mapTask(task, profiles)),
      }
    }),

  delete: protectedProcedure
    .input(StudyGroupIdSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await requireActiveMember(
        ctx.db,
        ctx.auth.userId,
        input.groupId,
      )
      requireOwner(membership)
      await ctx.db.delete(studyGroup).where(eq(studyGroup.id, input.groupId))
      return { id: input.groupId }
    }),

  invite: protectedProcedure
    .input(InviteStudyGroupMemberSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.clerkUserId === ctx.auth.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already in this group',
        })
      }

      await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)

      const pair = orderedPair(ctx.auth.userId, input.clerkUserId)
      const friend = await ctx.db.query.friendship.findFirst({
        where: and(
          eq(friendship.clerkUserIdLow, pair.clerkUserIdLow),
          eq(friendship.clerkUserIdHigh, pair.clerkUserIdHigh),
          eq(friendship.status, 'accepted'),
        ),
      })

      if (!friend) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can only invite friends',
        })
      }

      const existing = await ctx.db.query.studyGroupMember.findFirst({
        where: and(
          eq(studyGroupMember.groupId, input.groupId),
          eq(studyGroupMember.clerkUserId, input.clerkUserId),
        ),
      })

      if (existing?.status === 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'That student is already in the group',
        })
      }

      if (existing?.status === 'invited') return existing

      try {
        const [created] = await ctx.db
          .insert(studyGroupMember)
          .values({
            groupId: input.groupId,
            clerkUserId: input.clerkUserId,
            role: 'member',
            status: 'invited',
            invitedByClerkUserId: ctx.auth.userId,
          })
          .returning()

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to invite that student',
          })
        }

        return created
      } catch (error) {
        if (isDrizzleQueryError(error) && error.cause.code === '23505') {
          const raced = await ctx.db.query.studyGroupMember.findFirst({
            where: and(
              eq(studyGroupMember.groupId, input.groupId),
              eq(studyGroupMember.clerkUserId, input.clerkUserId),
            ),
          })
          if (raced) return raced
        }
        throw error
      }
    }),

  acceptInvite: protectedProcedure
    .input(StudyGroupIdSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await requireMembership(
        ctx.db,
        ctx.auth.userId,
        input.groupId,
      )

      if (membership.status !== 'invited') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'There is no invite to accept',
        })
      }

      const [updated] = await ctx.db
        .update(studyGroupMember)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(studyGroupMember.id, membership.id))
        .returning()

      return updated
    }),

  leave: protectedProcedure
    .input(StudyGroupIdSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await requireMembership(
        ctx.db,
        ctx.auth.userId,
        input.groupId,
      )

      if (membership.role === 'owner') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The owner cannot leave. Delete the group instead',
        })
      }

      await ctx.db.transaction(async (tx) => {
        await deleteAssigneeTasks(tx, input.groupId, ctx.auth.userId)
        await tx
          .delete(studyGroupMember)
          .where(eq(studyGroupMember.id, membership.id))
      })

      return { id: input.groupId }
    }),

  removeMember: protectedProcedure
    .input(RemoveStudyGroupMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await requireActiveMember(
        ctx.db,
        ctx.auth.userId,
        input.groupId,
      )
      requireOwner(membership)

      if (input.clerkUserId === ctx.auth.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The owner cannot be removed',
        })
      }

      const target = await ctx.db.query.studyGroupMember.findFirst({
        where: and(
          eq(studyGroupMember.groupId, input.groupId),
          eq(studyGroupMember.clerkUserId, input.clerkUserId),
        ),
      })

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'That student is not in the group',
        })
      }

      await ctx.db.transaction(async (tx) => {
        await deleteAssigneeTasks(tx, input.groupId, input.clerkUserId)
        await tx
          .delete(studyGroupMember)
          .where(eq(studyGroupMember.id, target.id))
      })

      return { id: target.id }
    }),

  progress: protectedProcedure
    .input(StudyGroupIdSchema)
    .query(async ({ ctx, input }) => {
      await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
      await endExpiredSessions(ctx.db, [input.groupId])
      const group = await loadGroup(ctx.db, input.groupId)

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study group not found',
        })
      }

      const profiles = await getClerkProfiles(
        ctx,
        group.members.map((member) => member.clerkUserId),
      )

      return progressFor(group, profiles)
    }),

  plan: {
    create: protectedProcedure
      .input(CreateStudyGroupPlanSchema)
      .mutation(async ({ ctx, input }) => {
        await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
        const [plan] = await ctx.db
          .insert(studyGroupPlan)
          .values({
            groupId: input.groupId,
            createdByClerkUserId: ctx.auth.userId,
            name: input.name,
            note: input.note ?? '',
          })
          .returning()

        if (!plan) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to create the plan',
          })
        }

        return plan
      }),

    list: protectedProcedure
      .input(StudyGroupIdSchema)
      .query(async ({ ctx, input }) => {
        await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
        return ctx.db.query.studyGroupPlan.findMany({
          where: eq(studyGroupPlan.groupId, input.groupId),
          orderBy: (table, { desc: byDesc }) => [byDesc(table.createdAt)],
        })
      }),

    rename: protectedProcedure
      .input(RenameStudyGroupPlanSchema)
      .mutation(async ({ ctx, input }) => {
        const plan = await ctx.db.query.studyGroupPlan.findFirst({
          where: eq(studyGroupPlan.id, input.planId),
        })

        if (!plan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Plan not found',
          })
        }

        await requireActiveMember(ctx.db, ctx.auth.userId, plan.groupId)

        const [updated] = await ctx.db
          .update(studyGroupPlan)
          .set({
            name: input.name,
            note: input.note ?? plan.note,
            updatedAt: new Date(),
          })
          .where(eq(studyGroupPlan.id, plan.id))
          .returning()

        return updated
      }),
  },

  session: {
    schedule: protectedProcedure
      .input(CreateStudyGroupSessionSchema)
      .mutation(async ({ ctx, input }) => {
        await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
        await requirePlanInGroup(ctx.db, input.groupId, input.planId)

        const [session] = await ctx.db
          .insert(studyGroupSession)
          .values({
            groupId: input.groupId,
            planId: input.planId,
            createdByClerkUserId: ctx.auth.userId,
            title: input.title,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            status: 'scheduled',
          })
          .returning()

        if (!session) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to schedule the session',
          })
        }

        return session
      }),

    list: protectedProcedure
      .input(StudyGroupIdSchema)
      .query(async ({ ctx, input }) => {
        await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
        await endExpiredSessions(ctx.db, [input.groupId])
        const sessions = await ctx.db.query.studyGroupSession.findMany({
          where: eq(studyGroupSession.groupId, input.groupId),
          orderBy: (table, { asc: byAsc }) => [byAsc(table.startsAt)],
          with: { participants: true },
        })
        const profiles = await getClerkProfiles(
          ctx,
          sessions.flatMap((session) =>
            session.participants.map((participant) => participant.clerkUserId),
          ),
        )
        return sessions.map((session) =>
          mapSession(session, ctx.auth.userId, profiles),
        )
      }),

    start: protectedProcedure
      .input(StudyGroupSessionIdSchema)
      .mutation(async ({ ctx, input }) => {
        const session = await ctx.db.query.studyGroupSession.findFirst({
          where: eq(studyGroupSession.id, input.sessionId),
        })

        if (!session) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Session not found',
          })
        }

        await requireActiveMember(ctx.db, ctx.auth.userId, session.groupId)
        await endExpiredSessions(ctx.db, [session.groupId])

        const current = await ctx.db.query.studyGroupSession.findFirst({
          where: eq(studyGroupSession.id, session.id),
        })

        if (
          !current ||
          current.status === 'ended' ||
          current.endsAt.getTime() <= Date.now()
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This session has ended',
          })
        }

        if (Date.now() < current.startsAt.getTime() - SESSION_OPEN_MS) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This session opens 15 minutes before it starts',
          })
        }

        const now = new Date()
        await ctx.db.transaction(async (tx) => {
          const existing =
            await tx.query.studyGroupSessionParticipant.findFirst({
              where: and(
                eq(studyGroupSessionParticipant.sessionId, current.id),
                eq(studyGroupSessionParticipant.clerkUserId, ctx.auth.userId),
              ),
            })

          if (!existing) {
            await tx.insert(studyGroupSessionParticipant).values({
              sessionId: current.id,
              clerkUserId: ctx.auth.userId,
              joinedAt: now,
            })
          } else if (existing.leftAt) {
            await tx
              .update(studyGroupSessionParticipant)
              .set({ joinedAt: now, leftAt: null, updatedAt: now })
              .where(eq(studyGroupSessionParticipant.id, existing.id))
          }

          if (current.status === 'scheduled') {
            await tx
              .update(studyGroupSession)
              .set({ status: 'live', updatedAt: now })
              .where(eq(studyGroupSession.id, current.id))
          }
        })

        return { sessionId: current.id }
      }),

    leave: protectedProcedure
      .input(StudyGroupSessionIdSchema)
      .mutation(async ({ ctx, input }) => {
        const session = await ctx.db.query.studyGroupSession.findFirst({
          where: eq(studyGroupSession.id, input.sessionId),
        })

        if (!session) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Session not found',
          })
        }

        await requireActiveMember(ctx.db, ctx.auth.userId, session.groupId)

        const participant =
          await ctx.db.query.studyGroupSessionParticipant.findFirst({
            where: and(
              eq(studyGroupSessionParticipant.sessionId, session.id),
              eq(studyGroupSessionParticipant.clerkUserId, ctx.auth.userId),
            ),
          })

        if (!participant || participant.leftAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You have not started this session',
          })
        }

        const now = new Date()
        await ctx.db
          .update(studyGroupSessionParticipant)
          .set({ leftAt: now, updatedAt: now })
          .where(eq(studyGroupSessionParticipant.id, participant.id))

        if (session.endsAt.getTime() <= now.getTime()) {
          await ctx.db
            .update(studyGroupSession)
            .set({ status: 'ended', updatedAt: now })
            .where(eq(studyGroupSession.id, session.id))
        }

        return { sessionId: session.id }
      }),
  },

  task: {
    create: protectedProcedure
      .input(CreateStudyGroupTaskSchema)
      .mutation(async ({ ctx, input }) => {
        await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
        await requirePlanInGroup(ctx.db, input.groupId, input.planId)

        if (input.scope === 'individual' && input.assigneeClerkUserId) {
          const assignee = await ctx.db.query.studyGroupMember.findFirst({
            where: and(
              eq(studyGroupMember.groupId, input.groupId),
              eq(studyGroupMember.clerkUserId, input.assigneeClerkUserId),
              eq(studyGroupMember.status, 'active'),
            ),
          })

          if (!assignee) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Assign the task to a group member',
            })
          }
        }

        const [task] = await ctx.db
          .insert(studyGroupTask)
          .values({
            groupId: input.groupId,
            planId: input.planId,
            createdByClerkUserId: ctx.auth.userId,
            title: input.title,
            scope: input.scope,
            assigneeClerkUserId:
              input.scope === 'individual' ? input.assigneeClerkUserId : null,
            status: 'open',
          })
          .returning()

        if (!task) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to create the task',
          })
        }

        return task
      }),

    list: protectedProcedure
      .input(StudyGroupIdSchema)
      .query(async ({ ctx, input }) => {
        await requireActiveMember(ctx.db, ctx.auth.userId, input.groupId)
        const tasks = await ctx.db.query.studyGroupTask.findMany({
          where: eq(studyGroupTask.groupId, input.groupId),
          orderBy: (table, { desc: byDesc }) => [byDesc(table.createdAt)],
        })
        const profiles = await getClerkProfiles(
          ctx,
          tasks.flatMap((task) =>
            task.assigneeClerkUserId ? [task.assigneeClerkUserId] : [],
          ),
        )
        return tasks.map((task) => mapTask(task, profiles))
      }),

    setStatus: protectedProcedure
      .input(SetStudyGroupTaskStatusSchema)
      .mutation(async ({ ctx, input }) => {
        const task = await ctx.db.query.studyGroupTask.findFirst({
          where: eq(studyGroupTask.id, input.taskId),
        })

        if (!task) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
          })
        }

        await requireActiveMember(ctx.db, ctx.auth.userId, task.groupId)

        if (
          task.scope === 'individual' &&
          task.assigneeClerkUserId !== ctx.auth.userId
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the assignee can update this task',
          })
        }

        const [updated] = await ctx.db
          .update(studyGroupTask)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(studyGroupTask.id, task.id))
          .returning()

        return updated
      }),
  },
}
