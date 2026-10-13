import { Stack } from 'expo-router'

export default function PlannerLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Planner' }} />
      <Stack.Screen name="[planId]" options={{ title: 'Plan' }} />
    </Stack>
  )
}
