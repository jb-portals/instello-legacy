import { useUser } from '@clerk/clerk-expo'
import { MuxVideoView, useMuxVideoPlayer } from '@mux/mux-react-native-player'
import React from 'react'
import { THEME } from '@/lib/theme'

export function MuxPlayer({
  videoId,
  videoTitle,
  playbackId,
  assetId,
}: {
  videoId: string
  channelName: string
  videoTitle: string
  playbackId: string
  assetId: string
}) {
  const user = useUser()
  const player = useMuxVideoPlayer(
    {
      playbackId,
      assetId,
      metadata: {
        videoId,
        videoTitle,
        envKey: process.env.EXPO_PUBLIC_MUX_ENV_KEY,
        playerName: 'Expo Video View',
        playerVersion: '~3.0.11',
        viewerUserId: user.user?.id,
      },
    },
    async (player) => {
      await player.play()
    },
  )

  return (
    <MuxVideoView
      player={player}
      controls="custom"
      contentFit="contain"
      robots={{
        enabled: true,
        assetId,
      }}
      controlsTheme={{
        trackHeight: 4,
        buttonSize: 40,
      }}
      style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000' }}
    />
  )
}
