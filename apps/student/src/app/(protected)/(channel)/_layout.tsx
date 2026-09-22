import { Slot, Stack } from 'expo-router'

export default function ChannelLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Slot />
    </>
  )
}
