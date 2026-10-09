import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { AddFriendSheet } from '@/components/friends/add-friend-sheet'
import { CreateGroupSheet } from '@/components/friends/create-group-sheet'
import { FriendZone } from '@/components/friends/friend-zone'
import { invalidateGroup } from '@/lib/friends'
import { trpc } from '@/utils/api'

export default function FriendsScreen() {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)

  const respond = useMutation(
    trpc.lms.friend.respond.mutationOptions({
      async onSuccess() {
        await queryClient.invalidateQueries(trpc.lms.friend.list.pathFilter())
      },
      onError(error) {
        Alert.alert('Unable to update request', error.message)
      },
    }),
  )

  const createGroup = useMutation(
    trpc.lms.studyGroup.create.mutationOptions({
      async onSuccess(group) {
        await invalidateGroup(queryClient)
        setCreating(false)
        router.push({
          pathname: '/friends/group/[groupId]',
          params: { groupId: group.id },
        })
      },
      onError(error) {
        Alert.alert('Unable to create group', error.message)
      },
    }),
  )

  return (
    <View className="bg-background flex-1">
      <FriendZone
        onAddFriend={() => setAdding(true)}
        onCreateGroup={() => setCreating(true)}
        respondingId={
          respond.isPending ? respond.variables?.friendshipId : null
        }
        onRespond={(friendshipId, action) =>
          respond.mutate({ friendshipId, action })
        }
      />
      <AddFriendSheet visible={adding} onDismiss={() => setAdding(false)} />
      <CreateGroupSheet
        visible={creating}
        saving={createGroup.isPending}
        onDismiss={() => setCreating(false)}
        onSubmit={(name, note) =>
          createGroup.mutate({ name, note: note || undefined })
        }
      />
    </View>
  )
}
