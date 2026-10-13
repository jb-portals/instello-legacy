import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import * as Linking from 'expo-linking'
import { useLocalSearchParams } from 'expo-router'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { StatusBar } from 'expo-status-bar'
import {
  CalendarIcon,
  CaretDownIcon,
  ClockIcon,
  EyeIcon,
  InstagramLogoIcon,
} from 'phosphor-react-native'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MuxPlayer } from '@/components/mux-player'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Separator } from '@/components/ui/separator'
import { Text } from '@/components/ui/text'
import { formatNumber } from '@/lib/utils'
import type { RouterOutputs } from '@/utils/api'
import { trpc } from '@/utils/api'

export default function VideoScreen() {
  usePreventScreenCapture()
  const { videoId, playbackId, assetId } = useLocalSearchParams<{
    videoId: string
    playbackId: string
    assetId: string
  }>()

  const {
    data: video,
    isLoading,
    error,
    isFetching,
  } = useQuery(
    trpc.lms.video.getById.queryOptions({
      videoId: videoId,
    }),
  )

  const { top } = useSafeAreaInsets()

  return (
    <>
      <StatusBar style="auto" />

      <ScrollView style={{ flex: 1, paddingTop: top }}>
        <MuxPlayer
          playbackId={playbackId}
          videoId={videoId}
          assetId={assetId}
          channelName={video?.chapter.channel.title ?? 'Unknown channel'}
          videoTitle={video?.title ?? 'unknown video'}
        />
        <VideoDetails
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          video={video}
        />
      </ScrollView>
    </>
  )
}

interface VideoDetailsProps {
  isLoading: boolean
  isFetching?: boolean
  error?: unknown
  video?: RouterOutputs['lms']['video']['getById']
}

function VideoDetails({
  isLoading,
  isFetching,
  error,
  video,
}: VideoDetailsProps) {
  const [showAuthorDetails, setAuthorDetails] = useState(false)
  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Unknown date'
    try {
      return format(new Date(date), 'MMM dd, yyyy')
    } catch {
      return 'Unknown date'
    }
  }

  if (isLoading) {
    return <VideoDetailsSkeleton />
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          Failed to load video details. Please try again.
        </Text>
      </View>
    )
  }

  if (!video) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted-foreground text-center">
          Video not found.
        </Text>
      </View>
    )
  }

  return (
    <View className="gap-4 py-3 px-3">
      {/* Video Title */}
      <View className="items-start gap-3">
        <View className="bg-muted rounded-full px-2 py-1">
          <Text className="text-muted-foreground text-xs">
            {video.chapter.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-foreground text-xl font-bold">
            {video.title}
          </Text>
          {isFetching && <View className="bg-accent h-2 w-2 rounded-full" />}
        </View>
      </View>

      {/* Video Stats */}
      <View className="flex-row flex-wrap items-center gap-4">
        <View className="flex-row items-center gap-1">
          <ClockIcon weight="duotone" size={16} color="#6B7280" />
          <Text className="text-muted-foreground text-sm">
            {formatDuration(video.duration)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <EyeIcon weight="duotone" size={16} color="#6B7280" />
          <Text className="text-muted-foreground text-sm">
            {formatNumber(video.overallValues.data.total_views)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <CalendarIcon weight="duotone" size={16} color="#6B7280" />
          <Text className="text-muted-foreground text-sm">
            {formatDate(video.createdAt)}
          </Text>
        </View>
      </View>

      {/* Description */}
      {video.description && (
        <View className="gap-2">
          <Text className="text-foreground text-base font-semibold">
            Description
          </Text>
          <Text className="text-muted-foreground text-sm leading-5">
            {video.description}
          </Text>
        </View>
      )}

      {video.author && (
        <>
          <View className="flex-row items-center gap-2">
            <Avatar
              alt="Author Profile"
              className="border-border h-10 w-10 border"
            >
              <AvatarImage
                source={{
                  uri: `https://${process.env.EXPO_PUBLIC_UPLOADTHING_PROJECT_ID}.ufs.sh/f/${video.author.imageUTFileId}`,
                }}
              />
              <AvatarFallback>
                <Text>{video.author.firstName.charAt(0)}</Text>
              </AvatarFallback>
            </Avatar>
            <View>
              <Text variant={'small'}>
                {video.author.firstName} {video.author.lastName}
              </Text>
              <Text variant={'muted'}>Author</Text>
            </View>

            <Button
              onPress={() => setAuthorDetails(!showAuthorDetails)}
              variant={showAuthorDetails ? 'outline' : 'secondary'}
              className="ml-auto rounded-full"
            >
              <Text>{showAuthorDetails ? 'Hide' : 'More'}</Text>
              <Animated.View
                style={{
                  transform: [{ rotate: `${showAuthorDetails ? -180 : 0}deg` }],
                  transition: '0.25s linear',
                }}
              >
                <Icon as={CaretDownIcon} />
              </Animated.View>
            </Button>
          </View>
          {showAuthorDetails && (
            <Animated.View
              entering={FadeInUp.duration(200)}
              exiting={FadeOutUp.duration(200)}
            >
              <View className="gap-2">
                {video.author.bio && (
                  <>
                    <Text variant={'small'}>{video.author.bio}</Text>
                    <Separator />
                  </>
                )}
                <View className="flex-row items-center justify-between">
                  <Text variant={'muted'}>Email address</Text>
                  <Text variant={'small'}>{video.author.email}</Text>
                </View>

                {video.author.organization && (
                  <View className="flex-row items-center justify-between">
                    <Text variant={'muted'}>Organization</Text>
                    <Text variant={'small'}>{video.author.organization}</Text>
                  </View>
                )}

                {video.author.designation && (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text variant={'muted'}>Designation</Text>
                      <Text variant={'small'}>{video.author.designation}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text variant={'muted'}>Experience</Text>
                      <Text variant={'small'}>
                        {video.author.experienceYears} Years
                      </Text>
                    </View>
                  </>
                )}

                {video.author.instagramLink && (
                  <Button
                    onPress={() =>
                      video.author?.instagramLink &&
                      Linking.openURL(video.author.instagramLink)
                    }
                    variant={'link'}
                  >
                    <Icon as={InstagramLogoIcon} />
                    <Text className="underline">Follow on Instagram</Text>
                    <Text variant={'muted'} className="text-lg">
                      ↗
                    </Text>
                  </Button>
                )}
              </View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  )
}

function VideoDetailsSkeleton() {
  return (
    <View className="gap-4">
      {/* Title Skeleton */}
      <View className="gap-3">
        <View className="bg-muted h-6 w-3/4 rounded-md" />
      </View>

      {/* Stats Skeleton */}
      <View className="flex-row items-center gap-4">
        <View className="bg-muted h-4 w-12 rounded-md" />
        <View className="bg-muted h-4 w-20 rounded-md" />
      </View>

      {/* Description Skeleton */}
      <View className="gap-2">
        <View className="bg-muted h-5 w-24 rounded-md" />
        <View className="gap-2">
          <View className="bg-muted h-4 w-full rounded-md" />
          <View className="bg-muted h-4 w-full rounded-md" />
          <View className="bg-muted h-4 w-3/4 rounded-md" />
        </View>
      </View>
    </View>
  )
}
