import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native'
import { GroupEmpty } from '@/components/friends/group-empty'
import { ScheduleSessionSheet } from '@/components/friends/schedule-session-sheet'
import {
  type ActiveGroup,
  groupAlert,
  useStudyGroup,
} from '@/components/friends/use-study-group'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import {
  displayName,
  formatSessionRange,
  invalidateGroup,
  sessionPhase,
} from '@/lib/friends'
import { trpc } from '@/utils/api'

type SessionItem = ActiveGroup['sessions'][number]

export function GroupSessions() {
  const queryClient = useQueryClient()
  const { groupId, query } = useStudyGroup()
  const data = query.data?.access === 'active' ? query.data : null
  const [scheduling, setScheduling] = useState(false)

  const scheduleSession = useMutation(
    trpc.lms.studyGroup.session.schedule.mutationOptions({
      async onSuccess() {
        setScheduling(false)
        await invalidateGroup(queryClient)
      },
      onError: groupAlert('Unable to schedule session'),
    }),
  )
  const startSession = useMutation(
    trpc.lms.studyGroup.session.start.mutationOptions({
      onSuccess: () => invalidateGroup(queryClient),
      onError: groupAlert('Unable to start session'),
    }),
  )
  const leaveSession = useMutation(
    trpc.lms.studyGroup.session.leave.mutationOptions({
      onSuccess: () => invalidateGroup(queryClient),
      onError: groupAlert('Unable to leave session'),
    }),
  )

  if (!data || !groupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

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
  const empty = sessions.length === 0

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: 48,
          flexGrow: empty ? 1 : undefined,
          justifyContent: empty ? 'center' : 'flex-start',
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch()
            }}
          />
        }
      >
        {empty ? (
          <GroupEmpty
            title="No sessions yet"
            description="Schedule a time for the group to study together."
            action={
              <Button onPress={() => setScheduling(true)}>
                <Text>Schedule</Text>
              </Button>
            }
          />
        ) : (
          <>
            <Button onPress={() => setScheduling(true)}>
              <Text>Schedule</Text>
            </Button>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                starting={startSession.isPending}
                leaving={leaveSession.isPending}
                onStart={() => startSession.mutate({ sessionId: session.id })}
                onLeave={() => leaveSession.mutate({ sessionId: session.id })}
              />
            ))}
          </>
        )}
      </ScrollView>
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
