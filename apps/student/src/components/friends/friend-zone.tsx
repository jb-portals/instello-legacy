import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { UsersThreeIcon } from 'phosphor-react-native'
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native'
import { PersonRow } from '@/components/friends/person-row'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { formatSessionRange } from '@/lib/friends'
import { type RouterOutputs, trpc } from '@/utils/api'

type GroupCard = RouterOutputs['lms']['studyGroup']['list'][number]

export function StudyGroups({ onCreateGroup }: { onCreateGroup: () => void }) {
  const groupsQuery = useQuery(trpc.lms.studyGroup.list.queryOptions())

  return (
    <ZoneQuery
      pending={groupsQuery.isPending}
      error={
        groupsQuery.error ??
        (!groupsQuery.data && !groupsQuery.isPending
          ? { message: 'Try again in a moment.' }
          : null)
      }
      onRetry={() => {
        void groupsQuery.refetch()
      }}
    >
      {groupsQuery.data ? (
        <GroupsList
          groups={groupsQuery.data}
          refreshing={groupsQuery.isRefetching}
          onRefresh={() => {
            void groupsQuery.refetch()
          }}
          onCreateGroup={onCreateGroup}
        />
      ) : null}
    </ZoneQuery>
  )
}

export function StudyRequests({
  onRespond,
  respondingId,
}: {
  onRespond: (friendshipId: string, action: 'accept' | 'decline') => void
  respondingId?: string | null
}) {
  const friendsQuery = useQuery(trpc.lms.friend.list.queryOptions())

  return (
    <ZoneQuery
      pending={friendsQuery.isPending}
      error={
        friendsQuery.error ??
        (!friendsQuery.data && !friendsQuery.isPending
          ? { message: 'Try again in a moment.' }
          : null)
      }
      onRetry={() => {
        void friendsQuery.refetch()
      }}
    >
      {friendsQuery.data ? (
        <RequestsList
          friends={friendsQuery.data}
          refreshing={friendsQuery.isRefetching}
          onRefresh={() => {
            void friendsQuery.refetch()
          }}
          onRespond={onRespond}
          respondingId={respondingId}
        />
      ) : null}
    </ZoneQuery>
  )
}

function ZoneQuery({
  pending,
  error,
  onRetry,
  children,
}: {
  pending: boolean
  error: { message: string } | null
  onRetry: () => void
  children: ReactNode
}) {
  if (pending) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (error) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-3 px-6">
        <Text variant="large">Unable to load Combine Study</Text>
        <Text variant="muted" className="text-center">
          {error.message}
        </Text>
        <Button onPress={onRetry}>
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }

  return children
}

function GroupsList({
  groups,
  refreshing,
  onRefresh,
  onCreateGroup,
}: {
  groups: GroupCard[]
  refreshing: boolean
  onRefresh: () => void
  onCreateGroup: () => void
}) {
  const empty = groups.length === 0

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{
        padding: 16,
        gap: 16,
        paddingBottom: 40,
        flexGrow: empty ? 1 : undefined,
        justifyContent: empty ? 'center' : 'flex-start',
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {empty ? (
        <EmptyState
          title="No groups yet"
          description="Create a group to share plans, sessions, and tasks."
          action={
            <Button onPress={onCreateGroup}>
              <Text>New group</Text>
            </Button>
          }
        />
      ) : (
        <>
          <Button onPress={onCreateGroup}>
            <Text>New group</Text>
          </Button>
          {groups.map((group) => (
            <GroupLink key={group.id} group={group} />
          ))}
        </>
      )}
    </ScrollView>
  )
}

function RequestsList({
  friends,
  refreshing,
  onRefresh,
  onRespond,
  respondingId,
}: {
  friends: RouterOutputs['lms']['friend']['list']
  refreshing: boolean
  onRefresh: () => void
  onRespond: (friendshipId: string, action: 'accept' | 'decline') => void
  respondingId?: string | null
}) {
  const empty = friends.incoming.length === 0 && friends.outgoing.length === 0

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{
        padding: 16,
        gap: 16,
        paddingBottom: 40,
        flexGrow: empty ? 1 : undefined,
        justifyContent: empty ? 'center' : 'flex-start',
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {empty ? (
        <EmptyState
          title="No pending requests"
          description="Friend requests you send or receive will show up here."
        />
      ) : (
        <>
          {friends.incoming.map((request) => (
            <Card key={request.friendshipId} className="gap-3 py-4">
              <CardHeader className="gap-2">
                <PersonRow
                  profile={request.profile}
                  detail={request.profile.emailAddress}
                />
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    disabled={respondingId === request.friendshipId}
                    onPress={() => onRespond(request.friendshipId, 'accept')}
                  >
                    <Text>Accept</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    disabled={respondingId === request.friendshipId}
                    onPress={() => onRespond(request.friendshipId, 'decline')}
                  >
                    <Text>Decline</Text>
                  </Button>
                </View>
              </CardHeader>
            </Card>
          ))}
          {friends.outgoing.map((request) => (
            <PersonRow
              key={request.friendshipId}
              profile={request.profile}
              detail="Request sent"
            />
          ))}
        </>
      )}
    </ScrollView>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="gap-4 py-8">
      <CardHeader className="items-center">
        <CardTitle className="text-center">{title}</CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      {action ? (
        <CardFooter className="justify-center">{action}</CardFooter>
      ) : null}
    </Card>
  )
}

function GroupLink({ group }: { group: GroupCard }) {
  const members =
    group.memberCount === 1 ? '1 member' : `${group.memberCount} members`
  const session = group.nextSession
    ? `${group.nextSession.title} · ${formatSessionRange(
        group.nextSession.startsAt,
        group.nextSession.endsAt,
      )}`
    : 'No upcoming session'
  const meta = [
    group.myStatus === 'invited' ? 'Invited' : null,
    members,
    session,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: '/friends/group/[groupId]',
          params: { groupId: group.id },
        })
      }
    >
      <View className="flex-row items-center gap-3 py-2">
        <View className="bg-muted size-11 items-center justify-center rounded-full">
          <Icon as={UsersThreeIcon} size={22} weight="duotone" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-[MontserratMedium]" numberOfLines={1}>
            {group.name}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
