import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { type Href, useLocalSearchParams, useRouter } from 'expo-router'
import { ExamIcon, LockLaminatedIcon } from 'phosphor-react-native'
import type { ReactElement } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import {
  getTestAction,
  type PublicChannelTest,
  testActionLabel,
} from '@/lib/channel-test'
import { trpc } from '@/utils/api'
import { Badge } from './ui/badge'
import { Card, CardFooter, CardHeader, CardTitle } from './ui/card'

export function ChannelTestsList({
  ListHeaderComponent,
}: {
  ListHeaderComponent?: ReactElement
} = {}) {
  const { channelId } = useLocalSearchParams() as { channelId: string }
  const testsQuery = useQuery(
    trpc.lms.channelTest.listPublic.queryOptions({ channelId }),
  )
  const tests = testsQuery.data ?? []

  return (
    <FlashList
      data={tests}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={
        <RefreshControl
          onRefresh={() => testsQuery.refetch()}
          refreshing={testsQuery.isRefetching}
        />
      }
      ListEmptyComponent={
        testsQuery.isLoading ? (
          <View className="px-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={`skeleton-${index + 1}`} className="mb-2.5">
                <View className="bg-accent/40 flex-row gap-2 rounded-md p-2">
                  <Skeleton
                    className="size-14 rounded-md"
                    style={{ height: 56, width: 56, borderRadius: 8 }}
                  />
                  <View className="flex-1 justify-center gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="px-4 py-6">
            <View className="bg-accent/30 items-center justify-center rounded-md p-6">
              <Text variant="large" className="mb-1 text-base font-medium">
                No tests yet
              </Text>
              <Text
                variant="muted"
                className="text-muted-foreground text-center text-sm"
              >
                Tests will appear here when this channel publishes them.
              </Text>
            </View>
          </View>
        )
      }
      ListFooterComponent={
        <View className="items-center justify-center py-8">
          {testsQuery.isFetching && !testsQuery.isRefetching && (
            <ActivityIndicator style={{ marginBottom: 16 }} size={'small'} />
          )}
          <Text variant={'muted'} className="text-xs">
            © All rights reserved to this channel
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View className="h-2.5 w-full" />}
      renderItem={({ item }) => (
        <ChannelTestCard channelId={channelId} test={item} />
      )}
    />
  )
}

function ChannelTestCard({
  channelId,
  test,
}: {
  channelId: string
  test: PublicChannelTest
}) {
  const router = useRouter()
  const action = getTestAction(test)
  const score = test.latestAttempt?.score

  return (
    <TouchableOpacity
      style={{ paddingHorizontal: 16 }}
      onPress={() => {
        if (action === 'subscribe') {
          router.push(`/(protected)/(subscribe)?channelId=${channelId}`)
          return
        }

        router.push(
          `/test?channelId=${channelId}&testId=${test.id}` as unknown as Href,
        )
      }}
    >
      <Card className="bg-accent/40 flex-row items-center gap-2 p-2">
        <View className="bg-accent items-center justify-center rounded-md border border-border/15 p-3">
          <Icon
            as={ExamIcon}
            weight="duotone"
            className="text-muted-foreground size-6"
          />
        </View>
        <CardHeader className="flex-1 justify-center pl-0">
          <CardTitle numberOfLines={2} className="w-full text-sm font-medium">
            {test.title}
          </CardTitle>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Badge variant={'secondary'}>
              <Text className="text-xs">
                {test.type === 'open' ? 'Open' : 'Scheduled'}
              </Text>
            </Badge>
            {test.availability !== 'open' && (
              <Badge variant={'outline'}>
                <Text className="text-xs">
                  {test.availability === 'upcoming' ? 'Upcoming' : 'Closed'}
                </Text>
              </Badge>
            )}
            {action === 'continue' && (
              <Badge>
                <Text className="text-xs">In progress</Text>
              </Badge>
            )}
            {typeof score === 'number' &&
              test.latestAttempt?.status === 'submitted' && (
                <Badge variant={'outline'}>
                  <Text className="text-xs">Score {score}</Text>
                </Badge>
              )}
            {test.type === 'scheduled' && test.durationMinutes != null && (
              <Text variant={'muted'} className="text-muted-foreground text-xs">
                {test.durationMinutes} min
              </Text>
            )}
          </View>
          {test.type === 'scheduled' && test.startsAt && test.endsAt ? (
            <Text
              variant={'muted'}
              numberOfLines={1}
              className="text-muted-foreground text-xs"
            >
              {format(test.startsAt, 'dd MMM, hh:mm a')} –{' '}
              {format(test.endsAt, 'dd MMM, hh:mm a')}
            </Text>
          ) : test.description ? (
            <Text
              variant={'muted'}
              numberOfLines={1}
              className="text-muted-foreground text-xs"
            >
              {test.description}
            </Text>
          ) : null}
        </CardHeader>
        <CardFooter className="p-0">
          {action === 'subscribe' ? (
            <View className="p-4">
              <Icon
                weight="duotone"
                as={LockLaminatedIcon}
                className="text-muted-foreground"
              />
            </View>
          ) : (
            <View className="px-2">
              <Text variant={'muted'} className="text-xs">
                {testActionLabel(action)}
              </Text>
            </View>
          )}
        </CardFooter>
      </Card>
    </TouchableOpacity>
  )
}
