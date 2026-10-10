import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, View } from 'react-native'
import { StudyRequests } from '@/components/friends/friend-zone'
import { trpc } from '@/utils/api'

export default function RequestsScreen() {
  const queryClient = useQueryClient()

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

  return (
    <View className="bg-background flex-1">
      <StudyRequests
        respondingId={
          respond.isPending ? respond.variables?.friendshipId : null
        }
        onRespond={(friendshipId, action) =>
          respond.mutate({ friendshipId, action })
        }
      />
    </View>
  )
}
