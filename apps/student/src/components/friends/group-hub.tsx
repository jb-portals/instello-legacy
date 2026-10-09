import { useUser } from '@clerk/clerk-expo'
import { useFocusEffect } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { type ReactNode, useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native'
import { CreateTaskSheet } from '@/components/friends/create-task-sheet'
import { InviteSheet } from '@/components/friends/invite-sheet'
import { PersonRow } from '@/components/friends/person-row'
import { PlanSheet } from '@/components/friends/plan-sheet'
import { ScheduleSessionSheet } from '@/components/friends/schedule-session-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import {
  displayName,
  formatSessionRange,
  invalidateGroup,
  sessionPhase,
} from '@/lib/friends'
import { type RouterOutputs, trpc } from '@/utils/api'

type GroupDetail = RouterOutputs['lms']['studyGroup']['get']
type ActiveGroup = Extract<GroupDetail, { access: 'active' }>
type SessionItem = ActiveGroup['sessions'][number]
type TaskItem = ActiveGroup['tasks'][number]

export function GroupHub({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const groupQuery = useQuery(trpc.lms.studyGroup.get.queryOptions({ groupId }))
  const progressQuery = useQuery(
    trpc.lms.studyGroup.progress.queryOptions(
      { groupId },
      { enabled: groupQuery.data?.access === 'active' },
    ),
  )

  const refetchGroup = groupQuery.refetch
  const refetchProgress = progressQuery.refetch
  const access = groupQuery.data?.access
  useFocusEffect(
    useCallback(() => {
      void refetchGroup()
      if (access === 'active') void refetchProgress()
    }, [access, refetchGroup, refetchProgress]),
  )

  const [inviting, setInviting] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [renamingPlan, setRenamingPlan] = useState<
    ActiveGroup['plans'][number] | null
  >(null)
  const [scheduling, setScheduling] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)

  function refresh() {
    return invalidateGroup(queryClient)
  }

  function alertError(title: string) {
    return (error: { message: string }) => Alert.alert(title, error.message)
  }

  const acceptInvite = useMutation(
    trpc.lms.studyGroup.acceptInvite.mutationOptions({
      onSuccess: () => refresh(),
      onError: alertError('Unable to accept invite'),
    }),
  )
  const leaveGroup = useMutation(
    trpc.lms.studyGroup.leave.mutationOptions({
      async onSuccess() {
        await refresh()
        router.back()
      },
      onError: alertError('Unable to leave group'),
    }),
  )
  const deleteGroup = useMutation(
    trpc.lms.studyGroup.delete.mutationOptions({
      async onSuccess() {
        await refresh()
        router.back()
      },
      onError: alertError('Unable to delete group'),
    }),
  )
  const invite = useMutation(
    trpc.lms.studyGroup.invite.mutationOptions({
      onSuccess: () => refresh(),
      onError: alertError('Unable to invite'),
    }),
  )
  const removeMember = useMutation(
    trpc.lms.studyGroup.removeMember.mutationOptions({
      onSuccess: () => refresh(),
      onError: alertError('Unable to remove member'),
    }),
  )
  const createPlan = useMutation(
    trpc.lms.studyGroup.plan.create.mutationOptions({
      async onSuccess() {
        setCreatingPlan(false)
        await refresh()
      },
      onError: alertError('Unable to create plan'),
    }),
  )
  const renamePlan = useMutation(
    trpc.lms.studyGroup.plan.rename.mutationOptions({
      async onSuccess() {
        setRenamingPlan(null)
        await refresh()
      },
      onError: alertError('Unable to rename plan'),
    }),
  )
  const scheduleSession = useMutation(
    trpc.lms.studyGroup.session.schedule.mutationOptions({
      async onSuccess() {
        setScheduling(false)
        await refresh()
      },
      onError: alertError('Unable to schedule session'),
    }),
  )
  const startSession = useMutation(
    trpc.lms.studyGroup.session.start.mutationOptions({
      onSuccess: () => refresh(),
      onError: alertError('Unable to start session'),
    }),
  )
  const leaveSession = useMutation(
    trpc.lms.studyGroup.session.leave.mutationOptions({
      onSuccess: () => refresh(),
      onError: alertError('Unable to leave session'),
    }),
  )
  const createTask = useMutation(
    trpc.lms.studyGroup.task.create.mutationOptions({
      async onSuccess() {
        setCreatingTask(false)
        await refresh()
      },
      onError: alertError('Unable to create task'),
    }),
  )
  const setTaskStatus = useMutation(
    trpc.lms.studyGroup.task.setStatus.mutationOptions({
      onSuccess: () => refresh(),
      onError: alertError('Unable to update task'),
    }),
  )

  if (groupQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text variant="large">Unable to open group</Text>
        <Text variant="muted" className="text-center">
          {groupQuery.error?.message ?? 'Study group not found'}
        </Text>
        <Button onPress={() => groupQuery.refetch()}>
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }

  const data = groupQuery.data

  if (data.access === 'invited') {
    return (
      <View className="flex-1 gap-4 px-6 py-8">
        <Stack.Screen options={{ title: data.group.name }} />
        <Text variant="large">{data.group.name}</Text>
        {data.group.note ? (
          <Text variant="muted">{data.group.note}</Text>
        ) : null}
        <Text>
          {data.invitedBy
            ? `${displayName(data.invitedBy)} invited you to this study group.`
            : 'You are invited to this study group.'}
        </Text>
        <Button
          disabled={acceptInvite.isPending}
          onPress={() => acceptInvite.mutate({ groupId })}
        >
          <Text>Accept invite</Text>
        </Button>
        <Button
          variant="outline"
          disabled={leaveGroup.isPending}
          onPress={() => leaveGroup.mutate({ groupId })}
        >
          <Text>Decline</Text>
        </Button>
      </View>
    )
  }

  const activeMembers = data.members.filter(
    (member) => member.status === 'active',
  )
  const commonTasks = data.tasks.filter((task) => task.scope === 'common')
  const individualTasks = [
    ...data.tasks.filter((task) => task.scope === 'individual'),
  ].sort((a, b) => {
    const aMine = a.assigneeClerkUserId === user?.id ? 0 : 1
    const bMine = b.assigneeClerkUserId === user?.id ? 0 : 1
    return aMine - bMine
  })
  const progress = progressQuery.data
  const sessions = [...data.sessions].sort((left, right) => {
    const leftEnded =
      sessionPhase(left.startsAt, left.endsAt, left.status) === 'ended' ? 1 : 0
    const rightEnded =
      sessionPhase(right.startsAt, right.endsAt, right.status) === 'ended'
        ? 1
        : 0
    if (leftEnded !== rightEnded) return leftEnded - rightEnded
    return left.startsAt.getTime() - right.startsAt.getTime()
  })

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: data.group.name }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={groupQuery.isRefetching}
            onRefresh={() => {
              void refetchGroup()
              void refetchProgress()
            }}
          />
        }
      >
        {data.group.note ? (
          <Text variant="muted">{data.group.note}</Text>
        ) : null}

        <Section title="Progress">
          {progressQuery.isPending ? (
            <ActivityIndicator />
          ) : progress ? (
            <Card className="gap-3 py-4">
              <CardHeader className="gap-2">
                <CardTitle>
                  {progress.common.done} of {progress.common.total} common tasks
                </CardTitle>
                {progress.members.map((member) => (
                  <Text key={member.clerkUserId} variant="muted">
                    {displayName(member.profile)} · {member.individualDone}/
                    {member.individualTotal} tasks · {member.sessionsJoined}{' '}
                    {member.sessionsJoined === 1 ? 'session' : 'sessions'}
                  </Text>
                ))}
              </CardHeader>
            </Card>
          ) : (
            <Text variant="muted">Progress is unavailable.</Text>
          )}
        </Section>

        <Section
          title="Members"
          action={
            <Button
              size="sm"
              variant="outline"
              onPress={() => setInviting(true)}
            >
              <Text>Invite</Text>
            </Button>
          }
        >
          {data.members.map((member) => (
            <PersonRow
              key={member.clerkUserId}
              profile={member.profile}
              detail={member.profile.emailAddress}
              trailing={
                <View className="flex-row items-center gap-2">
                  {member.role === 'owner' ? (
                    <Badge variant="secondary">
                      <Text>Owner</Text>
                    </Badge>
                  ) : null}
                  {member.status === 'invited' ? (
                    <Badge variant="outline">
                      <Text>Invited</Text>
                    </Badge>
                  ) : null}
                  {data.myRole === 'owner' &&
                  member.clerkUserId !== user?.id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={removeMember.isPending}
                      onPress={() =>
                        Alert.alert(
                          'Remove member',
                          `Remove ${displayName(member.profile)} from the group?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () =>
                                removeMember.mutate({
                                  groupId,
                                  clerkUserId: member.clerkUserId,
                                }),
                            },
                          ],
                        )
                      }
                    >
                      <Text>Remove</Text>
                    </Button>
                  ) : null}
                </View>
              }
            />
          ))}
        </Section>

        <Section
          title="Shared plans"
          action={
            <Button
              size="sm"
              variant="outline"
              onPress={() => setCreatingPlan(true)}
            >
              <Text>New plan</Text>
            </Button>
          }
        >
          {data.plans.length === 0 ? (
            <Text variant="muted">No shared plans yet.</Text>
          ) : (
            data.plans.map((plan) => (
              <Card key={plan.id} className="gap-2 py-4">
                <CardHeader className="gap-1">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.note ? <Text variant="muted">{plan.note}</Text> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 self-start"
                    onPress={() => setRenamingPlan(plan)}
                  >
                    <Text>Rename</Text>
                  </Button>
                </CardHeader>
              </Card>
            ))
          )}
        </Section>

        <Section
          title="Sessions"
          action={
            <Button
              size="sm"
              variant="outline"
              onPress={() => setScheduling(true)}
            >
              <Text>Schedule</Text>
            </Button>
          }
        >
          {data.sessions.length === 0 ? (
            <Text variant="muted">No combined sessions yet.</Text>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                starting={startSession.isPending}
                leaving={leaveSession.isPending}
                onStart={() => startSession.mutate({ sessionId: session.id })}
                onLeave={() => leaveSession.mutate({ sessionId: session.id })}
              />
            ))
          )}
        </Section>

        <Section
          title="Tasks"
          action={
            <Button
              size="sm"
              variant="outline"
              onPress={() => setCreatingTask(true)}
            >
              <Text>New task</Text>
            </Button>
          }
        >
          <Text variant="small">Common</Text>
          {commonTasks.length === 0 ? (
            <Text variant="muted">No common tasks.</Text>
          ) : (
            commonTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                mine
                pending={setTaskStatus.isPending}
                onToggle={() =>
                  setTaskStatus.mutate({
                    taskId: task.id,
                    status: task.status === 'done' ? 'open' : 'done',
                  })
                }
              />
            ))
          )}
          <Text variant="small" className="mt-2">
            Individual
          </Text>
          {individualTasks.length === 0 ? (
            <Text variant="muted">No individual tasks.</Text>
          ) : (
            individualTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                mine={task.assigneeClerkUserId === user?.id}
                pending={setTaskStatus.isPending}
                onToggle={() =>
                  setTaskStatus.mutate({
                    taskId: task.id,
                    status: task.status === 'done' ? 'open' : 'done',
                  })
                }
              />
            ))
          )}
        </Section>

        {data.myRole === 'owner' ? (
          <Button
            variant="destructive"
            onPress={() =>
              Alert.alert(
                'Delete group',
                'Members will lose this group, its plans, sessions, and tasks.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteGroup.mutate({ groupId }),
                  },
                ],
              )
            }
          >
            <Text>Delete group</Text>
          </Button>
        ) : (
          <Button
            variant="outline"
            onPress={() =>
              Alert.alert(
                'Leave group',
                'You will lose access to this group.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => leaveGroup.mutate({ groupId }),
                  },
                ],
              )
            }
          >
            <Text>Leave group</Text>
          </Button>
        )}
      </ScrollView>

      <InviteSheet
        visible={inviting}
        memberIds={data.members.map((member) => member.clerkUserId)}
        savingId={invite.isPending ? invite.variables?.clerkUserId : null}
        onDismiss={() => setInviting(false)}
        onInvite={(clerkUserId) => invite.mutate({ groupId, clerkUserId })}
      />
      <PlanSheet
        visible={creatingPlan}
        title="Shared plan"
        submitLabel="Create plan"
        saving={createPlan.isPending}
        onDismiss={() => setCreatingPlan(false)}
        onSubmit={(name, note) =>
          createPlan.mutate({
            groupId,
            name,
            note: note || undefined,
          })
        }
      />
      <PlanSheet
        visible={renamingPlan !== null}
        title="Rename plan"
        submitLabel="Save"
        initialName={renamingPlan?.name ?? ''}
        initialNote={renamingPlan?.note ?? ''}
        saving={renamePlan.isPending}
        onDismiss={() => setRenamingPlan(null)}
        onSubmit={(name, note) => {
          if (!renamingPlan) return
          renamePlan.mutate({
            planId: renamingPlan.id,
            name,
            note,
          })
        }}
      />
      <ScheduleSessionSheet
        visible={scheduling}
        plans={data.plans.map((plan) => ({ id: plan.id, name: plan.name }))}
        saving={scheduleSession.isPending}
        onDismiss={() => setScheduling(false)}
        onSubmit={(input) =>
          scheduleSession.mutate({
            groupId,
            title: input.title,
            planId: input.planId,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          })
        }
      />
      <CreateTaskSheet
        visible={creatingTask}
        plans={data.plans.map((plan) => ({ id: plan.id, name: plan.name }))}
        members={activeMembers}
        saving={createTask.isPending}
        onDismiss={() => setCreatingTask(false)}
        onSubmit={(input) =>
          createTask.mutate({
            groupId,
            title: input.title,
            scope: input.scope,
            assigneeClerkUserId: input.assigneeClerkUserId,
            planId: input.planId,
          })
        }
      />
    </View>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="small">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}

function SessionCard({
  session,
  starting,
  leaving,
  onStart,
  onLeave,
}: {
  session: SessionItem
  starting: boolean
  leaving: boolean
  onStart: () => void
  onLeave: () => void
}) {
  const phase = sessionPhase(session.startsAt, session.endsAt, session.status)
  const inSession = Boolean(session.me && !session.me.leftAt)
  const present = session.participants.filter(
    (participant) => !participant.leftAt,
  )
  const label =
    phase === 'ended'
      ? 'Ended'
      : session.status === 'live'
        ? 'Live'
        : phase === 'open'
          ? 'Open'
          : 'Scheduled'

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-1">
        <CardTitle>{session.title}</CardTitle>
        <Text variant="muted">
          {formatSessionRange(session.startsAt, session.endsAt)}
        </Text>
        <Text variant="muted">
          {label}
          {session.joinedCount > 0 ? ` · ${session.joinedCount} joined` : ''}
        </Text>
        {present.length > 0 ? (
          <Text variant="muted">
            In session:{' '}
            {present
              .map((participant) => displayName(participant.profile))
              .join(', ')}
          </Text>
        ) : null}
        {phase === 'open' && !inSession ? (
          <Button className="mt-2" disabled={starting} onPress={onStart}>
            <Text>Start</Text>
          </Button>
        ) : null}
        {inSession && phase !== 'ended' ? (
          <Button
            className="mt-2"
            variant="outline"
            disabled={leaving}
            onPress={onLeave}
          >
            <Text>Leave session</Text>
          </Button>
        ) : null}
      </CardHeader>
    </Card>
  )
}

function TaskRow({
  task,
  mine,
  pending,
  onToggle,
}: {
  task: TaskItem
  mine: boolean
  pending: boolean
  onToggle: () => void
}) {
  const assignee = task.assignee ? displayName(task.assignee) : null
  return (
    <View className="border-border flex-row items-center gap-3 rounded-xl border px-3 py-3">
      <View className="min-w-0 flex-1">
        <Text className={task.status === 'done' ? 'text-muted-foreground' : ''}>
          {task.title}
        </Text>
        {assignee ? <Text variant="muted">{assignee}</Text> : null}
      </View>
      {mine ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onPress={onToggle}
        >
          <Text>{task.status === 'done' ? 'Reopen' : 'Done'}</Text>
        </Button>
      ) : (
        <Text variant="muted">{task.status === 'done' ? 'Done' : 'Open'}</Text>
      )}
    </View>
  )
}
