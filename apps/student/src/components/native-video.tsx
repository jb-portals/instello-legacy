import { useUser } from '@clerk/clerk-expo'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
// eslint-disable-next-line
//@ts-expect-error
import muxReactNativeVideo from '@mux/mux-data-react-native-video'
import Slider from '@react-native-community/slider'
import { FlashList } from '@shopify/flash-list'
import { useEvent } from 'expo'
import { NavigationBar } from 'expo-navigation-bar'
import { router } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { StatusBar } from 'expo-status-bar'
import type {
  VideoContentFit,
  VideoMetadata,
  VideoPlayer,
  VideoSource,
} from 'expo-video'
import { useVideoPlayer, VideoView } from 'expo-video'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  CaretDownIcon,
  PauseIcon,
  PlayIcon,
  SpeedometerIcon,
} from 'phosphor-react-native'
import React, { useCallback, useRef } from 'react'
import type { ViewProps } from 'react-native'
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { THEME } from '@/lib/theme'
import { cn } from '@/lib/utils'

import app from '../../package.json'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const MuxVideo = muxReactNativeVideo(VideoView)

const NativeVideoPlayerContext = React.createContext({
  fullscreen: false,
  setFullscreen: (value: boolean) => {
    console.log('Implement full screen logic', value)
  },
})

export const NativeVideo = ({ ...props }: ViewProps) => {
  const [fullscreen, setFullscreen] = React.useState(false)

  return (
    <NativeVideoPlayerContext.Provider value={{ fullscreen, setFullscreen }}>
      <View {...props} />
    </NativeVideoPlayerContext.Provider>
  )
}

NativeVideo.Content = ({ ...props }: ViewProps) => {
  const { fullscreen } = React.useContext(NativeVideoPlayerContext)

  if (fullscreen) return null

  return <View {...props} />
}

// Create a Mux-enabled VideoView component
// const MuxVideoView = withMuxVideo(VideoView);

NativeVideo.Player = ({
  videoSource,
  assetId,
  videoId,
}: {
  videoSource: VideoSource
  assetId: string
  videoId: string
  channelName: string
}) => {
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true
    player.timeUpdateEventInterval = 1
    player.play()
  })
  const videoRef = React.useRef<VideoView>(null)

  const [metadata] = React.useState(
    typeof videoSource === 'object' ? videoSource?.metadata : undefined,
  )

  const { fullscreen, setFullscreen } = React.useContext(
    NativeVideoPlayerContext,
  )

  const [resizeMode, setResizeMode] = React.useState<VideoContentFit>('contain')

  const user = useUser()

  return (
    <View style={{ backgroundColor: 'black', flex: fullscreen ? 1 : 0 }}>
      <View
        style={[
          fullscreen
            ? StyleSheet.absoluteFill // fullscreen covers whole screen
            : { aspectRatio: 16 / 9 }, // inline player
        ]}
      >
        <MuxVideo
          ref={videoRef}
          style={StyleSheet.absoluteFill}
          player={player}
          nativeControls={false}
          contentFit={resizeMode}
          muxOptions={{
            application_name: app.name, // (required) the name of your application
            application_version: app.version, // the version of your application (optional, but encouraged)
            data: {
              env_key: process.env.EXPO_PUBLIC_MUX_ENV_KEY, // (required)
              viewer_user_id: user.user?.id,
              mux_asset_id: assetId,
              video_id: videoId, // (required)
              video_title: metadata?.title,
              player_software_version: '~3.0.11', // (optional, but encouraged) the version of expo-video that you are using
              player_name: 'Expo Video View', // See metadata docs for available metadata fields /docs/web-integration-guide#section-5-add-metadata
              video_series: `${metadata?.artwork}-${metadata?.artist}`, // ex: 'Weekly Great Videos'
              video_duration: player.duration, // in milliseconds, ex: 120000
              video_stream_type: 'on-demand', // 'live' or 'on-demand'
            },
          }}
        />

        {/* Overlay controls */}
        <NativeVideoControlsOverlay
          {...{ player, fullscreen, resizeMode, metadata }}
          onChangeResizeMode={setResizeMode}
          onChangeFullScreen={setFullscreen}
        />
      </View>
    </View>
  )
}

type Timeout = ReturnType<typeof setTimeout>

function NativeVideoControlsOverlay({
  player,
  fullscreen,
  onChangeFullScreen,
  onChangeResizeMode,
  metadata,
}: {
  player: VideoPlayer
  fullscreen: boolean
  onChangeFullScreen: (fullscreen: boolean) => void
  resizeMode: VideoContentFit
  onChangeResizeMode: (value: VideoContentFit) => void
  metadata?: VideoMetadata
}) {
  const [sliding, setSliding] = React.useState(false)
  const [slidingTime, setSlidingTime] = React.useState(player.currentTime)
  const [showControls, setShowControls] = React.useState(true)
  const controlsTimeout = React.useRef<Timeout>(null)

  const startTimeToHideControls = useCallback(() => {
    // Clear any existing timeout before setting a new one
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current)
    }
    // Set a new timeout to hide the controls after 5 seconds
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false)
      controlsTimeout.current = null // Reset the timeout reference
    }, 5000) as unknown as Timeout
  }, [])

  const stopTimeToHideControls = useCallback(() => {
    // Clear any existing timeout before setting a new one
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current)
    }
  }, [])

  const enterFullscreen = useCallback(async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    )
    onChangeFullScreen(true)
    StatusBar.setHidden(true, 'slide')
    NavigationBar.setHidden(true)
  }, [onChangeFullScreen])

  const exitFullscreen = useCallback(async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    )
    onChangeFullScreen(false)
    StatusBar.setHidden(true, 'slide')
    NavigationBar.setHidden(false)
  }, [onChangeFullScreen])

  const toggleShowControls = () => {
    setShowControls(!showControls)
    if (controlsTimeout.current && showControls)
      clearTimeout(controlsTimeout.current)
    else startTimeToHideControls()
  }

  const togglePlaying = () => {
    if (player.playing) {
      player.pause()
      stopTimeToHideControls()
    } else {
      player.play()
      startTimeToHideControls()
    }
  }

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (fullscreen) {
        exitFullscreen().catch((e) => console.log(e))
        return true
      }
    })

    setShowControls(true)
    startTimeToHideControls()

    return () => sub.remove()
  }, [fullscreen, exitFullscreen, startTimeToHideControls])

  // Events
  useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    bufferedPosition: player.bufferedPosition,
    currentLiveTimestamp: player.currentLiveTimestamp,
    currentOffsetFromLive: player.currentOffsetFromLive,
  })

  const pinchGesture = Gesture.Pinch()
    .onEnd((e) => {
      try {
        // Add safety checks for the gesture event
        if (typeof e.scale !== 'number' || isNaN(e.scale)) {
          console.warn('Pinch gesture event is invalid:', e)
          return
        }

        const scale = e.scale
        // Use more conservative thresholds to avoid accidental triggers
        if (scale > 1.2) {
          // Pinch-out detected - switch to cover mode
          onChangeResizeMode('cover')
        } else if (scale < 0.8) {
          // Pinch-in detected - switch to contain mode
          onChangeResizeMode('contain')
        }
        // If scale is between 0.8 and 1.2, don't change mode (avoid accidental changes)
      } catch (error) {
        console.error('Error handling pinch gesture:', error)
      }
    })
    .enabled(fullscreen) // Only enable in fullscreen mode
    .runOnJS(true) // Ensure gesture runs on JS thread

  return (
    <GestureDetector gesture={pinchGesture}>
      <TouchableWithoutFeedback onPress={() => toggleShowControls()}>
        <View style={[styles.overlay]}>
          {/** Container */}
          <View
            style={{
              opacity: showControls ? 100 : 0,
              height: '100%',
              width: '100%',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0,0,0,0.2)',
              paddingHorizontal: fullscreen ? 24 : 8,
              paddingVertical: fullscreen ? 24 : 8,
            }}
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            {/** Controls Header*/}
            <View className="w-full flex-row justify-between">
              <Button
                size={'icon'}
                className={cn(
                  'rounded-full bg-transparent p-5 hover:bg-transparent',
                )}
                variant={'ghost'}
                onPress={() => (fullscreen ? exitFullscreen() : router.back())}
              >
                <Icon
                  weight="bold"
                  as={fullscreen ? ArrowLeftIcon : CaretDownIcon}
                  className="text-white"
                  size={24}
                />
              </Button>

              <View className="flex-row items-center gap-2">
                <Button
                  size={'icon'}
                  className="rounded-full bg-transparent p-5 hover:bg-transparent"
                  variant={'ghost'}
                  onPress={() =>
                    fullscreen ? exitFullscreen() : enterFullscreen()
                  }
                >
                  <Icon
                    weight="bold"
                    as={fullscreen ? ArrowsInSimpleIcon : ArrowsOutSimpleIcon}
                    className="text-white"
                    size={24}
                  />
                </Button>
              </View>
            </View>

            {/** Play Puase & Loading state */}
            <View className="flex-row items-center gap-6 pb-4">
              <Button
                size={'icon'}
                variant={'ghost'}
                className="rounded-full bg-black/40 p-6"
                onPress={() => {
                  player.seekBy(-10)
                  startTimeToHideControls()
                }}
              >
                <Icon
                  as={ArrowCounterClockwiseIcon}
                  className="text-white"
                  size={32}
                />
              </Button>

              {/** Loading indicator */}
              {player.status === 'loading' ? (
                <ActivityIndicator size={64} color={'white'} />
              ) : (
                <Button
                  size={'icon'}
                  className={cn('rounded-full bg-black/40 p-8')}
                  variant={'ghost'}
                  onPress={() => togglePlaying()}
                >
                  <Icon
                    as={player.playing ? PauseIcon : PlayIcon}
                    size={52}
                    className="text-white"
                    weight="fill"
                  />
                </Button>
              )}

              <Button
                onPress={() => {
                  player.seekBy(10)
                  startTimeToHideControls()
                }}
                size={'icon'}
                variant={'ghost'}
                className="rounded-full bg-black/40 p-6"
              >
                <Icon
                  as={ArrowClockwiseIcon}
                  className="text-white"
                  size={32}
                />
              </Button>
            </View>

            {/** Sliding timespamp preview */}
            {sliding && (
              <View className="absolute bottom-16 rounded-full bg-black/30 px-2 py-0.5 backdrop-blur-sm">
                <Text className="text-sm text-white">
                  {formatTime(slidingTime)}
                </Text>
              </View>
            )}

            {/** Controls footer */}
            <View className="w-full gap-2.5 py-0.5">
              <View className="w-full flex-row items-center justify-between px-4">
                {/** Video meta info */}
                <View
                  style={{ maxWidth: '50%', opacity: fullscreen ? 100 : 0 }}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    className="text-sm text-white/80"
                  >
                    {metadata?.artist}
                  </Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    variant={'h4'}
                    className="font-bold text-white"
                  >
                    {metadata?.title}
                  </Text>
                </View>

                <PlaybackSpeedButton player={player} />
              </View>
              <Slider
                style={{
                  height: 4,
                  width: '100%',
                  zIndex: 10,
                  opacity: !showControls ? 0 : 100,
                }}
                minimumTrackTintColor="#F7941D"
                maximumTrackTintColor="white"
                thumbTintColor={showControls ? '#F7941D' : 'transparent'}
                maximumValue={player.duration}
                value={player.currentTime}
                onSlidingStart={(time) => {
                  setSliding(true)
                  setSlidingTime(time)
                  player.pause()
                  stopTimeToHideControls()
                }}
                onValueChange={(time) => {
                  player.currentTime = time
                  setSlidingTime(time)
                }}
                onSlidingComplete={(time) => {
                  setSliding(false)
                  setSlidingTime(time)
                  if (!player.playing) player.play() //play if playback is paused
                  startTimeToHideControls()
                }}
              />

              <View
                className={cn(
                  'w-full flex-row items-center justify-between px-4',
                )}
              >
                <Text className="rounded-full bg-black/20 text-sm text-white">
                  {formatTime(player.currentTime)}
                </Text>
                <Text className="rounded-full bg-black/20  text-sm text-white">
                  -{formatTime(player.duration - player.currentTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </GestureDetector>
  )
}

const data: { label: string; speed: number }[] = [
  { label: '0.5x', speed: 0.5 },
  { label: '0.75x', speed: 0.75 },
  { label: '1x Normal', speed: 1.0 },
  { label: '1.5x', speed: 1.5 },
  { label: '2x', speed: 2.0 },
]

function PlaybackSpeedButton({ player }: { player: VideoPlayer }) {
  const theme = useColorScheme()
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present()
  }, [])

  const setPlaybackRate = useCallback(
    (rate: number) => {
      player.playbackRate = rate
    },
    [player],
  )

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={1} />
    ),
    [],
  )

  return (
    <>
      <View className="flex-row">
        <Button
          size={'icon'}
          className="rounded-full bg-transparent p-5 hover:bg-transparent"
          variant={'ghost'}
          onPress={handlePresentModalPress}
        >
          <Icon
            weight="bold"
            as={SpeedometerIcon}
            className="text-white"
            size={16}
          />
        </Button>
      </View>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        backgroundStyle={{
          backgroundColor: THEME[theme ?? 'light'].popover,
          borderWidth: 1,
          borderColor: THEME[theme ?? 'light'].border,
        }}
        containerStyle={{
          width: '70%',
          transform: [{ translateX: '25%' }],
        }}
        backdropComponent={renderBackdrop}
        handleStyle={{
          borderTopEndRadius: 8,
          borderTopStartRadius: 8,
        }}
        handleIndicatorStyle={{
          backgroundColor: THEME[theme ?? 'light'].mutedForeground,
        }}
        snapPoints={['60%', '60%']}
        $modal={true}
      >
        <BottomSheetView
          style={{
            ...styles.contentContainer,
          }}
        >
          <View className="pb-4">
            <Text variant={'muted'} className="text-xs">
              PLAYBACK SPEED
            </Text>
          </View>
          <FlashList
            data={data}
            renderItem={({ item }) => (
              <Button
                size={'lg'}
                variant={
                  item.speed == player.playbackRate ? 'secondary' : 'ghost'
                }
                key={item.speed}
                className="w-full justify-start"
                onPress={() => {
                  setPlaybackRate(item.speed)
                  bottomSheetModalRef.current?.close()
                }}
              >
                <Text>{item.label}</Text>
              </Button>
            )}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

const styles = StyleSheet.create({
  video: {
    width: 'auto',
    height: 'auto',
    aspectRatio: 16 / 9,
  },
  controlsContainer: {
    padding: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
})
