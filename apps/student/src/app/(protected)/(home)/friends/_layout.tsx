import { Stack } from 'expo-router'

export default function FriendsLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="[userId]" options={{ title: 'Friend' }} />
      <Stack.Screen name="group" options={{ headerShown: false }} />
    </Stack>
  )
}
