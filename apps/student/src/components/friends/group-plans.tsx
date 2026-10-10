import { useUser } from '@clerk/clerk-expo'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native'
import { CreateTaskSheet } from '@/components/friends/create-task-sheet'
import { GroupEmpty } from '@/components/friends/group-empty'
import { PlanSheet } from '@/components/friends/plan-sheet'
import {
  type ActiveGroup,
  groupAlert,
  useStudyGroup,
} from '@/components/friends/use-study-group'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { displayName, invalidateGroup } from '@/lib/friends'
import { trpc } from '@/utils/api'

type TaskItem = ActiveGroup['tasks'][number]

export function GroupPlans() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const { groupId, query } = useStudyGroup()
  const data = query.data?.access === 'active' ? query.data : null
  const progressQuery = useQuery(
    trpc.lms.studyGroup.progress.queryOptions(
      { groupId: groupId ?? '' },
      { enabled: Boolean(groupId) && data !== null },
    ),
  )
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [renamingPlan, setRenamingPlan] = useState<
    ActiveGroup['plans'][number] | null
  >(null)
  const [creatingTask, setCreatingTask] = useState(false)

  const createPlan = useMutation(
    trpc.lms.studyGroup.plan.create.mutationOptions({
      async onSuccess() {
        setCreatingPlan(false)
        await invalidateGroup(queryClient)
      },
      onError: groupAlert('Unable to create plan'),
    }),
  )
  const renamePlan = useMutation(
    trpc.lms.studyGroup.plan.rename.mutationOptions({
      async onSuccess() {
        setRenamingPlan(null)
        await invalidateGroup(queryClient)
      },
      onError: groupAlert('Unable to rename plan'),
    }),
  )
  const createTask = useMutation(
    trpc.lms.studyGroup.task.create.mutationOptions({
      async onSuccess() {
        setCreatingTask(false)
        await invalidateGroup(queryClient)
      },
      onError: groupAlert('Unable to create task'),
    }),
  )
  const setTaskStatus = useMutation(
    trpc.lms.studyGroup.task.setStatus.mutationOptions({
      onSuccess: () => invalidateGroup(queryClient),
      onError: groupAlert('Unable to update task'),
    }),
  )

  if (!data || !groupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
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
  const plansEmpty = data.plans.length === 0
  const tasksEmpty = data.tasks.length === 0

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching || progressQuery.isRefetching}
            onRefresh={() => {
              void query.refetch()
              void progressQuery.refetch()
            }}
          />
        }
      >
        <View className="gap-2">
          <Text variant="small">Progress</Text>
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
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="small">Shared plans</Text>
            {plansEmpty ? null : (
              <Button
                size="sm"
                variant="outline"
                onPress={() => setCreatingPlan(true)}
              >
                <Text>New plan</Text>
              </Button>
            )}
          </View>
          {plansEmpty ? (
            <GroupEmpty
              title="No shared plans"
              description="Create a plan the group can study from."
              action={
                <Button onPress={() => setCreatingPlan(true)}>
                  <Text>New plan</Text>
                </Button>
              }
            />
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
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="small">Tasks</Text>
            {tasksEmpty ? null : (
              <Button
                size="sm"
                variant="outline"
                onPress={() => setCreatingTask(true)}
              >
                <Text>New task</Text>
              </Button>
            )}
          </View>
          {tasksEmpty ? (
            <GroupEmpty
              title="No tasks yet"
              description="Add a common task for everyone, or one for a single member."
              action={
                <Button onPress={() => setCreatingTask(true)}>
                  <Text>New task</Text>
                </Button>
              }
            />
          ) : (
            <>
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
            </>
          )}
        </View>
      </ScrollView>

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
