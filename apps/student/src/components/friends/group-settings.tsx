import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ActivityIndicator, Alert, View } from 'react-native'
import { groupAlert, useStudyGroup } from '@/components/friends/use-study-group'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { invalidateGroup } from '@/lib/friends'
import { trpc } from '@/utils/api'

export function GroupSettings() {
  const queryClient = useQueryClient()
  const { groupId, query } = useStudyGroup()
  const data = query.data?.access === 'active' ? query.data : null

  const leaveGroup = useMutation(
    trpc.lms.studyGroup.leave.mutationOptions({
      async onSuccess() {
        await invalidateGroup(queryClient)
        router.back()
      },
      onError: groupAlert('Unable to leave group'),
    }),
  )
  const deleteGroup = useMutation(
    trpc.lms.studyGroup.delete.mutationOptions({
      async onSuccess() {
        await invalidateGroup(queryClient)
        router.back()
      },
      onError: groupAlert('Unable to delete group'),
    }),
  )

  if (!data || !groupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View className="bg-background flex-1 gap-4 px-4 py-6">
      {data.group.note ? <Text variant="muted">{data.group.note}</Text> : null}
      {data.myRole === 'owner' ? (
        <Button
          variant="destructive"
          disabled={deleteGroup.isPending}
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
          disabled={leaveGroup.isPending}
          onPress={() =>
            Alert.alert('Leave group', 'You will lose access to this group.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Leave',
                style: 'destructive',
                onPress: () => leaveGroup.mutate({ groupId }),
              },
            ])
          }
        >
          <Text>Leave group</Text>
        </Button>
      )}
    </View>
  )
}
