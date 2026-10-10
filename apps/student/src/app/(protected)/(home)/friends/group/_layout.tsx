import { Stack } from 'expo-router'

export default function StudyGroupLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="[groupId]" options={{ title: 'Study group' }} />
    </Stack>
  )
}
