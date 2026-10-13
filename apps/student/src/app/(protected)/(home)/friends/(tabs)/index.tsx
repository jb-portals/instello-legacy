import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { CreateGroupSheet } from '@/components/friends/create-group-sheet'
import { StudyGroups } from '@/components/friends/friend-zone'
import { invalidateGroup } from '@/lib/friends'
import { trpc } from '@/utils/api'

export default function GroupsScreen() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)

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

  useEffect(() => {
    console.log(creating)
  }, [creating])

  return (
    <View className="bg-background flex-1">
      <StudyGroups onCreateGroup={() => setCreating(true)} />
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
