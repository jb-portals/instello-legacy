import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { formatSessionRange } from '@/lib/friends'
import { type RouterOutputs, trpc } from '@/utils/api'

type FriendCard = RouterOutputs['lms']['friend']['list']['friends'][number]
type GroupCard = RouterOutputs['lms']['studyGroup']['list'][number]

export function FriendZone({
  onAddFriend,
  onCreateGroup,
  onRespond,
  respondingId,
}: {
  onAddFriend: () => void
  onCreateGroup: () => void
  onRespond: (friendshipId: string, action: 'accept' | 'decline') => void
  respondingId?: string | null
}) {
  const friendsQuery = useQuery(trpc.lms.friend.list.queryOptions())
  const groupsQuery = useQuery(trpc.lms.studyGroup.list.queryOptions())
  const pending = friendsQuery.isPending || groupsQuery.isPending
  const error = friendsQuery.error ?? groupsQuery.error

  if (pending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (
    error ||
    friendsQuery.isError ||
    groupsQuery.isError ||
    !friendsQuery.data ||
    !groupsQuery.data
  ) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text variant="large">Unable to load Friends Zone</Text>
        <Text variant="muted" className="text-center">
          {error?.message ?? 'Try again in a moment.'}
        </Text>
        <Button
          onPress={() => {
            void friendsQuery.refetch()
            void groupsQuery.refetch()
          }}
        >
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }

  const friends = friendsQuery.data
  const groups = groupsQuery.data

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={friendsQuery.isRefetching || groupsQuery.isRefetching}
          onRefresh={() => {
            void friendsQuery.refetch()
            void groupsQuery.refetch()
          }}
        />
      }
    >
      <Text variant="muted">
        Study with friends in a private group. Personal plans stay private until
        you choose to share them.
      </Text>
      <View className="flex-row gap-2">
        <Button className="flex-1" onPress={onAddFriend}>
          <Text>Add friend</Text>
        </Button>
        <Button className="flex-1" variant="outline" onPress={onCreateGroup}>
          <Text>New group</Text>
        </Button>
      </View>

      <Section title="Requests">
        {friends.incoming.length === 0 && friends.outgoing.length === 0 ? (
          <Text variant="muted">No pending requests.</Text>
        ) : null}
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
      </Section>

      <Section title="Friends">
        {friends.friends.length === 0 ? (
          <Text variant="muted">No friends yet. Add a classmate by email.</Text>
        ) : (
          friends.friends.map((friend) => (
            <FriendLink key={friend.friendshipId} friend={friend} />
          ))
        )}
      </Section>

      <Section title="Study groups">
        {groups.length === 0 ? (
          <Text variant="muted">
            Create a group to share plans, sessions, and tasks.
          </Text>
        ) : (
          groups.map((group) => <GroupLink key={group.id} group={group} />)
        )}
      </Section>
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="small">{title}</Text>
      {children}
    </View>
  )
}

function FriendLink({ friend }: { friend: FriendCard }) {
  return (
    <PersonRow
      profile={friend.profile}
      detail={friend.profile.emailAddress}
      onPress={() =>
        router.push({
          pathname: '/friends/[userId]',
          params: { userId: friend.profile.clerkUserId },
        })
      }
    />
  )
}

function GroupLink({ group }: { group: GroupCard }) {
  const members =
    group.memberCount === 1 ? '1 member' : `${group.memberCount} members`
  const when = group.nextSession
    ? formatSessionRange(group.nextSession.startsAt, group.nextSession.endsAt)
    : null

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
      <Card className="gap-2 py-4">
        <CardHeader className="gap-1">
          <CardTitle>{group.name}</CardTitle>
          {group.note ? <CardDescription>{group.note}</CardDescription> : null}
        </CardHeader>
        <View className="px-6">
          <Text variant="muted" className="text-xs">
            {group.myStatus === 'invited' ? 'Invited · ' : ''}
            {members}
            {when ? ` · ${group.nextSession?.title} · ${when}` : ''}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  )
}
