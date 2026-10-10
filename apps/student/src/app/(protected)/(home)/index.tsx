import { FlashList } from '@shopify/flash-list'
import { useInfiniteQuery } from '@tanstack/react-query'
import { formatDate } from 'date-fns'
import { Image } from 'expo-image'
import { Link, router, useGlobalSearchParams } from 'expo-router'
import { BookOpenTextIcon } from 'phosphor-react-native'
import {
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { ErrorView } from '@/components/error-view'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { THEME } from '@/lib/theme'
import { cn, formatNumber } from '@/lib/utils'
import type { RouterOutputs } from '@/utils/api'
import { trpc } from '@/utils/api'

function ChannelCard({
  channel,
  className,
}: {
  channel: RouterOutputs['lms']['channel']['listPublicWithPagination']['items'][number]
  className?: string
}) {
  const theme = useColorScheme()
  const totalSubscribers = channel.totalSubscribers
  const thumbnailUri = `https://${process.env.EXPO_PUBLIC_UPLOADTHING_PROJECT_ID}.ufs.sh/f/${channel.thumbneilId}`

  return (
    <Link
      href={`/(channel)?channelId=${channel.id}&chapterId=${channel.firstChapter?.id}`}
      asChild
    >
      <TouchableOpacity>
        <Card
          key={channel.id}
          className={cn(
            'w-40 gap-3 border-0 bg-transparent p-2 shadow-none',
            className,
          )}
        >
          <Image
            source={{
              uri: thumbnailUri,
            }}
            style={{
              width: 'auto',
              height: 'auto',
              borderRadius: 8,
              aspectRatio: 16 / 10,
              backgroundColor: THEME[theme ?? 'light'].muted,
            }}
            contentFit="cover"
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
            placeholder={require('@/assets/images/thumbnail-placeholder.png')}
          />
          <CardContent className="w-full flex-1 gap-0.5 px-0">
            <CardTitle numberOfLines={1}>{channel.title}</CardTitle>
            <Text variant="muted" className="text-muted-foreground text-xs">
              {formatNumber(channel.numberOfChapters)} Chapters{' · '}
              {formatNumber(totalSubscribers)} Subscribers
              {' · '}
              {formatDate(channel.createdAt, 'MMM yyyy')}
            </Text>
            <View className=" flex-row flex-wrap items-center gap-2">
              <Avatar alt="Channel Creator" className="size-4">
                <AvatarImage
                  source={{ uri: channel.createdByClerkUser?.imageUrl }}
                />
                <AvatarFallback>
                  <Text>
                    {channel.createdByClerkUser?.firstName?.charAt(0)}
                  </Text>
                </AvatarFallback>
              </Avatar>
              <Text
                variant={'muted'}
                className="text-muted-foreground mt-3 text-xs"
              >
                {channel.createdByClerkUser?.firstName}{' '}
                {channel.createdByClerkUser?.lastName}
              </Text>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    </Link>
  )
}

function ChannelCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('w-40 gap-3 border-0 bg-transparent p-2', className)}>
      <Skeleton className="aspect-[16/10] h-auto w-auto" />
      <CardContent className="w-full flex-1 gap-1 px-0">
        <Skeleton className="h-4 max-w-full" />
        <Skeleton className="h-3 w-32" />
        <View className="mt-3 flex-row  items-center gap-2">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </View>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const searchParams = useGlobalSearchParams()
  const hasSubscribed = Boolean(searchParams.hasSubscribed as unknown as number)

  const {
    data,
    isRefetching,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery(
    trpc.lms.channel.listPublicWithPagination.infiniteQueryOptions(
      { hasSubscribed, limit: 10 },
      { getNextPageParam: (p) => p.nextCursor },
    ),
  )

  const channelList = data?.pages.flatMap((p) => p.items) ?? []

  function Header() {
    return (
      <View className="gap-2 fixed px-4 left-0 top-0">
        <View className="flex-row  gap-2">
          <Button
            size={'xs'}
            onPress={() => router.setParams({ hasSubscribed: 0 })}
            variant={!hasSubscribed ? 'default' : 'outline'}
            className="rounded-full"
          >
            <Text>All</Text>
          </Button>
          <Button
            onPress={() => router.setParams({ hasSubscribed: 1 })}
            size={'xs'}
            className="rounded-full"
            variant={hasSubscribed ? 'default' : 'outline'}
          >
            <Text>Subscribed</Text>
          </Button>
        </View>
        <Text
          variant={'large'}
          className="text-muted-foreground py-1.5 text-xs"
        >
          {hasSubscribed ? 'YOUR SUBSCRIBED CHANNELS' : 'RECOMMENDED FOR YOU'}
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 relative">
      <Header />
      <FlashList
        data={channelList}
        ListEmptyComponent={
          isLoading ? (
            <View className="w-full flex-1 flex-row flex-wrap">
              {Array.from({ length: 8 }).map((_, i) => (
                <ChannelCardSkeleton
                  className="w-full"
                  key={`skeleton-${i + 1}`}
                />
              ))}
            </View>
          ) : true ? (
            <ErrorView
              code={error?.data?.code}
              isRefetching={isRefetching}
              refetchFn={refetch}
            />
          ) : (
            <View className="h-52 flex-1 items-center justify-center gap-2.5">
              <Icon
                as={BookOpenTextIcon}
                size={52}
                weight="duotone"
                className="text-muted-foreground"
              />
              <Text variant={'large'}>
                {hasSubscribed
                  ? "You don't have any subscribed channels"
                  : 'Comming Soon'}
              </Text>
              <Text variant={'muted'} className="text-center">
                {hasSubscribed
                  ? 'As soon as you subscribe to any channel that will appear over here.'
                  : 'We are excited to share some cool content based channels with you soon. Please wait for some time in while we are making things faster to reach out to you.'}
              </Text>
            </View>
          )
        }
        keyExtractor={(item) => item.id + '_recommended'}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        renderItem={({ item }) => (
          <ChannelCard className={cn('w-full')} channel={item} />
        )}
        onEndReachedThreshold={0.2}
        onEndReached={() => hasNextPage && fetchNextPage()}
        ListFooterComponent={
          <View className="items-center justify-center py-8">
            {isFetchingNextPage && (
              <ActivityIndicator style={{ marginBottom: 16 }} size={'small'} />
            )}
          </View>
        }
      />
    </View>
  )
}
