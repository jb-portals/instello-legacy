import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  View,
} from 'react-native'
import { Text } from '@/components/ui/text'
import { displayName, formatActivityRange } from '@/lib/friends'
import { KIND_OPTIONS, STATUS_OPTIONS } from '@/lib/planner'
import { trpc } from '@/utils/api'

export default function FriendScreen() {
  const params = useLocalSearchParams<{ userId: string }>()
  const clerkUserId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId
  const queryClient = useQueryClient()
  const friendQuery = useQuery(
    trpc.lms.friend.get.queryOptions(
      { clerkUserId: clerkUserId ?? '' },
      { enabled: Boolean(clerkUserId) },
    ),
  )
  const shared = friendQuery.data?.iShareActivity ?? false
  const [sharesActivity, setSharesActivity] = useState(shared)

  useEffect(() => {
    setSharesActivity(shared)
  }, [shared])

  const setSharing = useMutation(
    trpc.lms.friend.setSharing.mutationOptions({
      async onSuccess() {
        await queryClient.invalidateQueries(trpc.lms.friend.get.pathFilter())
        await queryClient.invalidateQueries(trpc.lms.friend.list.pathFilter())
      },
      onError(error) {
        Alert.alert('Unable to update sharing', error.message)
      },
    }),
  )

  if (!clerkUserId || friendQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (friendQuery.isError || !friendQuery.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text variant="large">Friend unavailable</Text>
        <Text variant="muted" className="text-center">
          {friendQuery.error?.message ?? 'This student is not a friend yet.'}
        </Text>
      </View>
    )
  }

  const friend = friendQuery.data
  const name = displayName(friend.profile)

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
    >
      <Stack.Screen options={{ title: name }} />
      <View className="gap-1">
        <Text variant="large">{name}</Text>
        {friend.profile.emailAddress ? (
          <Text variant="muted">{friend.profile.emailAddress}</Text>
        ) : null}
      </View>
      <View className="border-border flex-row items-center justify-between gap-3 rounded-xl border p-4">
        <View className="flex-1 gap-1">
          <Text className="font-[MontserratMedium]">
            Share my study activity
          </Text>
          <Text variant="muted">
            This friend can see your planner activities from the last week and
            the next two weeks.
          </Text>
        </View>
        <Switch
          value={sharesActivity}
          disabled={setSharing.isPending}
          onValueChange={(next) => {
            setSharesActivity(next)
            setSharing.mutate(
              {
                friendshipId: friend.friendshipId,
                sharesActivity: next,
              },
              { onError: () => setSharesActivity(!next) },
            )
          }}
        />
      </View>
      <Text variant="small">Their activity</Text>
      {friend.theyShareActivity ? (
        friend.activities.length === 0 ? (
          <Text variant="muted">No recent or upcoming study activities.</Text>
        ) : (
          friend.activities.map((activity) => {
            const kind =
              KIND_OPTIONS.find((option) => option.value === activity.kind)
                ?.label ?? activity.kind
            const status =
              STATUS_OPTIONS.find((option) => option.value === activity.status)
                ?.label ?? activity.status
            return (
              <View
                key={activity.id}
                className="border-border gap-1 rounded-xl border px-4 py-3"
              >
                <Text className="font-[MontserratMedium]">
                  {activity.title}
                </Text>
                <Text variant="muted">
                  {formatActivityRange(activity.startsAt, activity.endsAt)}
                </Text>
                <Text variant="muted">
                  {activity.planName} · {kind} · {status}
                </Text>
              </View>
            )
          })
        )
      ) : (
        <Text variant="muted">
          They have not shared their study activity with you.
        </Text>
      )}
    </ScrollView>
  )
}
