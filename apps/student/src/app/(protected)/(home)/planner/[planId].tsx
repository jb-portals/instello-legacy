import { useQuery } from '@tanstack/react-query'
import {
  router,
  Stack,
  useGlobalSearchParams,
  useLocalSearchParams,
} from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { PlanCalendar } from '@/components/planner/plan-calendar'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { trpc } from '@/utils/api'

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function PlanScreen() {
  const localParams = useLocalSearchParams<{ planId?: string | string[] }>()
  const globalParams = useGlobalSearchParams<{ planId?: string | string[] }>()
  const planId =
    firstParam(localParams.planId) ?? firstParam(globalParams.planId)
  const planQuery = useQuery(
    trpc.lms.studyPlan.getById.queryOptions(
      { planId: planId ?? '' },
      { enabled: !!planId },
    ),
  )

  if (!planId || planQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Stack.Screen options={{ title: 'Plan' }} />
        <Text variant="large">Plan not found</Text>
        <Text variant="muted" className="text-center">
          {planQuery.error?.message ?? 'Open this screen from your plans.'}
        </Text>
        <Button onPress={() => router.back()}>
          <Text>Back to plans</Text>
        </Button>
      </View>
    )
  }

  if (planQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <Stack.Screen options={{ title: 'Plan' }} />
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{ title: planQuery.data.name, headerShadowVisible: false }}
      />
      <PlanCalendar planId={planQuery.data.id} />
    </View>
  )
}
