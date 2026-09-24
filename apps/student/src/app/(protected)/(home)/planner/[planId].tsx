import {
  router,
  Stack,
  useGlobalSearchParams,
  useLocalSearchParams,
} from 'expo-router'
import { View } from 'react-native'
import { PlanCalendar } from '@/components/planner/plan-calendar'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { usePlannerStore } from '@/lib/planner-store'

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function PlanScreen() {
  const localParams = useLocalSearchParams<{ planId?: string | string[] }>()
  const globalParams = useGlobalSearchParams<{ planId?: string | string[] }>()
  const planId =
    firstParam(localParams.planId) ?? firstParam(globalParams.planId)
  const plan = usePlannerStore((state) =>
    state.plans.find((item) => item.id === planId),
  )

  if (!plan || !planId) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Stack.Screen options={{ title: 'Plan' }} />
        <Text variant="large">Plan not found</Text>
        <Button onPress={() => router.back()}>
          <Text>Back to plans</Text>
        </Button>
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{ title: plan.name, headerShadowVisible: false }}
      />
      <PlanCalendar planId={plan.id} />
    </View>
  )
}
