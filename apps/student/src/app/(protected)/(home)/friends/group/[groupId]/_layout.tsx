import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useFocusEffect } from 'expo-router'
import { TopTabs } from 'expo-router/js-top-tabs'
import { useCallback } from 'react'
import { ActivityIndicator, useColorScheme, View } from 'react-native'
import { groupAlert, useStudyGroup } from '@/components/friends/use-study-group'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { displayName, invalidateGroup } from '@/lib/friends'
import { THEME } from '@/lib/theme'
import { trpc } from '@/utils/api'

export default function GroupTabsLayout() {
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? 'light']
  const queryClient = useQueryClient()
  const { groupId, query } = useStudyGroup()
  const refetch = query.refetch

  useFocusEffect(
    useCallback(() => {
      if (groupId) void refetch()
    }, [groupId, refetch]),
  )

  const acceptInvite = useMutation(
    trpc.lms.studyGroup.acceptInvite.mutationOptions({
      onSuccess: () => invalidateGroup(queryClient),
      onError: groupAlert('Unable to accept invite'),
    }),
  )
  const declineInvite = useMutation(
    trpc.lms.studyGroup.leave.mutationOptions({
      async onSuccess() {
        await invalidateGroup(queryClient)
        router.back()
      },
      onError: groupAlert('Unable to decline invite'),
    }),
  )

  if (!groupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center px-6">
        <Text variant="muted">Study group not found.</Text>
      </View>
    )
  }

  if (query.isPending) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (query.isError || !query.data) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-3 px-6">
        <Text variant="large">Unable to open group</Text>
        <Text variant="muted" className="text-center">
          {query.error?.message ?? 'Study group not found'}
        </Text>
        <Button onPress={() => query.refetch()}>
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }

  const data = query.data

  if (data.access === 'invited') {
    return (
      <View className="bg-background flex-1 gap-4 px-6 py-8">
        <Stack.Screen options={{ title: data.group.name }} />
        <Text variant="large">{data.group.name}</Text>
        {data.group.note ? (
          <Text variant="muted">{data.group.note}</Text>
        ) : null}
        <Text>
          {data.invitedBy
            ? `${displayName(data.invitedBy)} invited you to this study group.`
            : 'You are invited to this study group.'}
        </Text>
        <Button
          disabled={acceptInvite.isPending}
          onPress={() => acceptInvite.mutate({ groupId })}
        >
          <Text>Accept invite</Text>
        </Button>
        <Button
          variant="outline"
          disabled={declineInvite.isPending}
          onPress={() => declineInvite.mutate({ groupId })}
        >
          <Text>Decline</Text>
        </Button>
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: data.group.name }} />
      <TopTabs
        screenOptions={{
          tabBarActiveTintColor: colors.foreground,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarPressColor: colors.muted,
          tabBarScrollEnabled: true,
          tabBarBounces: false,
          tabBarGap: 4,
          tabBarItemStyle: { width: 'auto' },
          tabBarContentContainerStyle: { paddingHorizontal: 8 },
          sceneStyle: { backgroundColor: colors.background },
          tabBarIndicatorStyle: {
            backgroundColor: colors.foreground,
            height: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          tabBarLabelStyle: {
            fontFamily: 'MontserratMedium',
            fontSize: 13,
            textTransform: 'none',
          },
        }}
      >
        <TopTabs.Screen name="index" options={{ title: 'Plans' }} />
        <TopTabs.Screen name="sessions" options={{ title: 'Sessions' }} />
        <TopTabs.Screen name="members" options={{ title: 'Members' }} />
        <TopTabs.Screen name="settings" options={{ title: 'Settings' }} />
      </TopTabs>
    </View>
  )
}
