import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { AddFriendSheet } from '@/components/friends/add-friend-sheet'
import { PersonRow } from '@/components/friends/person-row'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { trpc } from '@/utils/api'

export function InviteSheet({
  visible,
  memberIds,
  savingId,
  onDismiss,
  onInvite,
}: {
  visible: boolean
  memberIds: string[]
  savingId?: string | null
  onDismiss: () => void
  onInvite: (clerkUserId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const friendsQuery = useQuery(trpc.lms.friend.list.queryOptions())
  const taken = new Set(memberIds)
  const available = (friendsQuery.data?.friends ?? []).filter(
    (friend) => !taken.has(friend.profile.clerkUserId),
  )

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Invite a friend"
      snapPoints={['70%']}
    >
      <View className="gap-4">
        <Button variant="outline" onPress={() => setAdding(true)}>
          <Text>Add by email</Text>
        </Button>
        {friendsQuery.isPending ? (
          <ActivityIndicator />
        ) : friendsQuery.isError ? (
          <Text variant="muted">{friendsQuery.error.message}</Text>
        ) : available.length === 0 ? (
          <Text variant="muted">
            Add friends before inviting them. Everyone already here is in the
            group.
          </Text>
        ) : (
          <View className="gap-2">
            {available.map((friend) => (
              <PersonRow
                key={friend.friendshipId}
                profile={friend.profile}
                detail={friend.profile.emailAddress}
                trailing={
                  <Button
                    size="sm"
                    disabled={savingId === friend.profile.clerkUserId}
                    onPress={() => onInvite(friend.profile.clerkUserId)}
                  >
                    <Text>Invite</Text>
                  </Button>
                }
              />
            ))}
          </View>
        )}
      </View>
      <AddFriendSheet visible={adding} onDismiss={() => setAdding(false)} />
    </PlannerSheet>
  )
}
