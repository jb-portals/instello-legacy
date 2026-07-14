import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetScrollableCreator,
} from '@gorhom/bottom-sheet'
import { FlashList } from '@shopify/flash-list'
import { useInfiniteQuery } from '@tanstack/react-query'
import { format, formatDate } from 'date-fns'
import { Image, ImageBackground } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeftIcon,
  CardsThreeIcon,
  CaretDownIcon,
  CheckIcon,
  ClockIcon,
  CrownIcon,
  LockLaminatedIcon,
} from 'phosphor-react-native'
import React, { useCallback, useRef } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import ExapandableText from '@/components/ui/expandable-text'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useChannelScreenData } from '@/hooks/useChannelScreenData'
import { useVideoPrefetch } from '@/hooks/useVideoPrefetch'
import { THEME } from '@/lib/theme'
import { formatDuration, formatNumber } from '@/lib/utils'
import { trpc } from '@/utils/api'
import { Badge } from './ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'

export function ChannelLessonsList() {
  const { chapterId } = useLocalSearchParams() as {
    chapterId: string
  }
  const videosQuery = useInfiniteQuery(
    trpc.lms.video.listPublicByChapterId.infiniteQueryOptions(
      { chapterId },
      { getNextPageParam: (p) => p.nextCursor },
    ),
  )

  const videos = videosQuery.data?.pages.flatMap((p) => p.items)
  const theme = useColorScheme()

  const { prefetchVideo, prefetchVideos } = useVideoPrefetch()

  // Prefetch all video details when the channel videos are loaded
  React.useEffect(() => {
    if (videos && Array.isArray(videos)) {
      const videoIds = videos
        .filter(
          (item): item is NonNullable<typeof item> & { id: string } =>
            'id' in item && item.canWatch,
        )
        .map((item) => item.id)

      if (videoIds.length > 0) {
        prefetchVideos(videoIds).catch((e) => console.error(e))
      }
    }
  }, [videos, prefetchVideos])

  return (
    <FlashList
      data={videos ?? []}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<ChannelDetailsSection />}
      refreshControl={
        <RefreshControl
          onRefresh={() => videosQuery.refetch()}
          refreshing={videosQuery.isRefetching}
        />
      }
      ListEmptyComponent={
        videosQuery.isLoading ? (
          <View className="px-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`skeleton-${index + 1}`} className="mb-2.5">
                <View className="bg-accent/40 flex-row gap-2 rounded-md p-2">
                  <Skeleton
                    className="h-14 w-[120px] rounded-md"
                    style={{ height: 64, width: 120, borderRadius: 8 }}
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
                No lessons yet
              </Text>
              <Text
                variant="muted"
                className="text-muted-foreground text-center text-sm"
              >
                Lessons will appear here when this channel adds content.
              </Text>
            </View>
          </View>
        )
      }
      onEndReachedThreshold={0.2}
      onEndReached={() =>
        videosQuery.hasNextPage && videosQuery.fetchNextPage()
      }
      ListFooterComponent={
        <View className="items-center justify-center py-8">
          {videosQuery.isFetchingNextPage && (
            <ActivityIndicator style={{ marginBottom: 16 }} size={'small'} />
          )}
          <Text variant={'muted'} className="text-xs">
            © All rights reserved to this channel
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View className="h-2.5 w-full" />}
      renderItem={({ item }) => {
        return (
          <Link
            asChild
            href={`/video?playbackId=${item.playbackId}&videoId=${item.id}&assetId=${item.assetId}`}
            disabled={!item.canWatch}
          >
            <TouchableOpacity
              onPress={() => {
                if (item.canWatch && item.id) {
                  prefetchVideo(item.id)
                }
              }}
              style={{ paddingHorizontal: 16 }}
            >
              <Card className="bg-accent/40 flex-row gap-2 p-2">
                <CardContent className="p-0">
                  <Image
                    source={{
                      uri: item.thumbnailId
                        ? `https://${process.env.EXPO_PUBLIC_UPLOADTHING_PROJECT_ID}.ufs.sh/f/${item.thumbnailId}`
                        : `https://image.mux.com/${item.playbackId}/thumbnail.png?width=214&height=121&time=15`,
                    }}
                    className="bg-accent h-14 w-auto rounded-sm p-0"
                    style={{
                      height: 64,
                      width: 'auto',
                      aspectRatio: 16 / 11,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME[theme ?? 'light'].border,
                    }}
                  />
                </CardContent>
                <CardHeader className="flex-1 justify-center pl-0">
                  <CardTitle
                    numberOfLines={2}
                    className="w-full text-sm font-medium"
                  >
                    {item.title}
                  </CardTitle>
                  <View className="flex-row items-center gap-1">
                    <Icon
                      as={ClockIcon}
                      weight="duotone"
                      className="text-muted-foreground"
                    />

                    <Text
                      variant={'muted'}
                      className="text-muted-foreground text-xs"
                    >
                      {formatDuration(item.duration ?? 0)}
                    </Text>
                    <Text variant={'muted'}>·</Text>
                    <Text
                      variant={'muted'}
                      className="text-muted-foreground text-xs"
                    >
                      {item.createdAt &&
                        formatDate(item.createdAt, 'EEE, dd MMM yyyy')}
                    </Text>
                  </View>
                </CardHeader>
                <CardFooter className="p-0">
                  {item.isPreview && (
                    <Badge variant={'secondary'}>
                      <Text className="text-xs">Preview</Text>
                    </Badge>
                  )}
                  {!item.canWatch && (
                    <View className="p-4">
                      <Icon
                        weight="duotone"
                        as={LockLaminatedIcon}
                        className="text-muted-foreground"
                      />
                    </View>
                  )}
                </CardFooter>
              </Card>
            </TouchableOpacity>
          </Link>
        )
      }}
    />
  )
}

function ChannelDetailsSection() {
  const { channelId } = useLocalSearchParams() as {
    channelId: string
  }
  const { channelQuery, subscriptionQuery, chaptersQuery } =
    useChannelScreenData(channelId)
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const theme = useColorScheme()

  if (channelQuery.isError)
    return (
      <View>
        <Text variant={'lead'}>Something went wrong!</Text>
        <Text variant={'muted'}>{channelQuery.error.message}</Text>
      </View>
    )

  const thumbnailUri = `https://${process.env.EXPO_PUBLIC_UPLOADTHING_PROJECT_ID}.ufs.sh/f/${channelQuery.data?.thumbneilId}`

  return (
    <>
      <ImageBackground
        source={{
          uri: thumbnailUri,
        }}
        style={{
          height: 'auto',
          width: 'auto',
          aspectRatio: 16 / 10,
          backgroundColor: THEME[theme ?? 'light'].muted,
        }}
        contentFit="cover"
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
        placeholder={require('@/assets/images/thumbnail-placeholder.png')}
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.4)',
            'rgba(0,0,0,0.4)',
            'rgba(0,0,0,0.2)',
            'rgba(0,0,0,0)',
            'rgba(0,0,0,0)',
          ]}
          style={{
            width: 'auto',
            height: '100%',
          }}
        >
          <View className="flex-1">
            <View className="justify-between px-4 py-8">
              <View style={{ marginTop: top - 22 }}>
                <Button
                  onPress={() => router.back()}
                  size={'icon'}
                  variant={'outline'}
                  className="size-11 rounded-full bg-transparent"
                >
                  <Icon
                    as={ArrowLeftIcon}
                    className="size-5 text-white"
                    weight="duotone"
                  />
                </Button>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {channelQuery.isLoading ? (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 10 }}>
          <Skeleton className={'h-4 w-[90%]'} />
          <View className="flex-row items-center gap-1">
            <Icon
              as={ClockIcon}
              weight="duotone"
              className="text-muted-foreground"
            />

            <Skeleton className={'h-2 w-8'} />
            <Text variant={'muted'}>·</Text>
            <Icon
              as={CardsThreeIcon}
              weight="duotone"
              className="text-muted-foreground"
            />

            <Skeleton className={'h-2 w-8'} />
            <Text variant={'muted'}>·</Text>
            <Icon
              as={CrownIcon}
              weight="duotone"
              className="text-muted-foreground"
            />

            <Skeleton className={'h-2 w-8'} />
            <Text variant={'muted'}>·</Text>
            <Skeleton className={'h-2 w-8'} />
          </View>

          <View className="gap-1.5">
            <Skeleton className={'h-2.5 w-full'} />
            <Skeleton className={'h-2.5 w-3/4'} />
          </View>

          <View className="flex-row items-center gap-2.5 py-1.5">
            <Skeleton className={'size-6 rounded-full'} />
            <Skeleton className={'h-3 w-20'} />
          </View>
        </View>
      ) : (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 10 }}>
          <Text variant={'h4'} className="font-medium tracking-wide">
            {channelQuery.data?.title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon
              as={ClockIcon}
              weight="duotone"
              className="text-muted-foreground"
            />

            <Text variant={'muted'} className="text-xs">
              {channelQuery.data &&
                formatDuration(channelQuery.data.totalDuration)}
            </Text>
            <Text variant={'muted'}>·</Text>
            <Icon
              as={CardsThreeIcon}
              weight="duotone"
              className="text-muted-foreground"
            />

            <Text variant={'muted'} className="text-xs">
              {channelQuery.data &&
                formatNumber(channelQuery.data.numberOfChapters)}{' '}
              Chapters
            </Text>
            <Text variant={'muted'}>·</Text>
            <Icon
              as={CrownIcon}
              weight="duotone"
              className="text-muted-foreground"
            />
            <Text variant={'muted'} className="text-xs">
              {channelQuery.data &&
                formatNumber(channelQuery.data.totalSubscribers)}{' '}
              Subscribers
            </Text>
            <Text variant={'muted'}>·</Text>
            <Text variant={'muted'} className="text-xs">
              {channelQuery.data &&
                format(channelQuery.data.createdAt, 'MMM yyyy')}
            </Text>
          </View>

          {channelQuery.data?.description &&
            channelQuery.data.description.length !== 0 && (
              <ExapandableText variant={'muted'}>
                {channelQuery.data.description}
              </ExapandableText>
            )}

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 py-1.5">
              <Avatar
                alt={`${channelQuery.data?.createdByClerkUser.firstName}'s Logo`}
              >
                <AvatarImage
                  source={{
                    uri: channelQuery.data?.createdByClerkUser.imageUrl,
                  }}
                />
                <AvatarFallback>
                  <Text>
                    {channelQuery.data?.createdByClerkUser.firstName?.charAt(0)}
                  </Text>
                </AvatarFallback>
              </Avatar>
              <Text variant={'small'}>
                {channelQuery.data?.createdByClerkUser.firstName}{' '}
                {channelQuery.data?.createdByClerkUser.lastName}
              </Text>
            </View>
            <SubscribeButton subscriptionQuery={subscriptionQuery} />
          </View>
          <ChapterButton chaptersQuery={chaptersQuery} />
        </View>
      )}
    </>
  )
}

function SubscribeButton({
  subscriptionQuery,
}: {
  subscriptionQuery: ReturnType<
    typeof useChannelScreenData
  >['subscriptionQuery']
}) {
  const { channelId } = useLocalSearchParams<{ channelId: string }>()
  const router = useRouter()

  if (subscriptionQuery.isLoading)
    return <Skeleton className={'h-[38px] w-28 rounded-full'} />

  const renderSubscriptionButotn = () => {
    switch (subscriptionQuery.data?.status) {
      case 'expired':
        return (
          <Button
            size={'sm'}
            onPress={() =>
              router.push(`/(protected)/(subscribe)?channelId=${channelId}`)
            }
            variant={'outline'}
            className="rounded-full"
          >
            <Text className="text-xs">Renew Subscription</Text>
          </Button>
        )

      case 'subscribed':
        return (
          <Button size={'sm'} variant={'secondary'} className="rounded-full">
            <Text className="text-xs">Subscribed</Text>
          </Button>
        )

      default:
        return (
          <Button
            size={'sm'}
            onPress={() =>
              router.push(`/(protected)/(subscribe)?channelId=${channelId}`)
            }
            className="rounded-full"
          >
            <Icon
              as={CrownIcon}
              weight="duotone"
              className="text-primary-foreground"
            />
            <Text className="text-xs">Subscribe to Watch</Text>
          </Button>
        )
    }
  }

  return <>{renderSubscriptionButotn()}</>
}

function ChapterButton({
  chaptersQuery,
}: {
  chaptersQuery: ReturnType<typeof useChannelScreenData>['chaptersQuery']
}) {
  const { chapterId } = useLocalSearchParams<{
    chapterId: string
  }>()
  const router = useRouter()

  const bottomSheetModalRef = useRef<BottomSheetModal>(null)
  const theme = useColorScheme()
  const BottomSheetListScrollable = useBottomSheetScrollableCreator()
  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present()
  }, [])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={1} />
    ),
    [],
  )

  if (chaptersQuery.isLoading) return <Skeleton className={'h-10 w-40'} />

  const selectedChapter = chaptersQuery.data?.find(
    (chapter) => chapter.id == chapterId,
  )

  if (!selectedChapter) return null

  return (
    <>
      <View className="flex-row">
        <Button
          variant={'secondary'}
          onPress={handlePresentModalPress}
          className="justify-between"
        >
          <Text numberOfLines={1} ellipsizeMode="tail" className="max-w-[90%]">
            {selectedChapter.title}
          </Text>
          <Icon as={CaretDownIcon} className="text-muted-foreground" />
        </Button>
      </View>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        backgroundStyle={{
          backgroundColor: THEME[theme ?? 'light'].popover,
          borderWidth: 1,
          borderColor: THEME[theme ?? 'light'].border,
        }}
        backdropComponent={renderBackdrop}
        handleStyle={{
          borderTopEndRadius: 8,
          borderTopStartRadius: 8,
          paddingVertical: 10,
        }}
        handleIndicatorStyle={{
          backgroundColor: THEME[theme ?? 'light'].mutedForeground,
        }}
        snapPoints={['64%', '64%']}
        enableDynamicSizing={false}
      >
        <View className="pb-4 px-6">
          <Text variant={'muted'} className="text-xs">
            CHAPTERS
          </Text>
        </View>
        <FlashList
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
          data={chaptersQuery.data}
          showsVerticalScrollIndicator={false}
          renderScrollComponent={BottomSheetListScrollable}
          renderItem={({ item: chapter }) => (
            <Button
              size={'lg'}
              variant={chapter.id == chapterId ? 'secondary' : 'ghost'}
              key={chapter.id}
              className="w-full justify-between"
              onPress={() => {
                if (chapter.id !== chapterId) {
                  router.setParams({
                    chapterId: chapter.id,
                  })
                  bottomSheetModalRef.current?.close()
                }
              }}
            >
              <Text numberOfLines={1} className=" flex-1">
                {chapter.title}
              </Text>
              {chapter.id == chapterId && <Icon as={CheckIcon} />}
            </Button>
          )}
        />
      </BottomSheetModal>
    </>
  )
}
