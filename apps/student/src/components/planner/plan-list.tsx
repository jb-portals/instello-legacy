import { useQuery } from '@tanstack/react-query'
import { Link } from 'expo-router'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { formatUpcoming } from '@/lib/planner'
import { type RouterOutputs, trpc } from '@/utils/api'

type StudyPlanListItem = RouterOutputs['lms']['studyPlan']['list'][number]

export function PlanList() {
  const plansQuery = useQuery(trpc.lms.studyPlan.list.queryOptions())
  const plans = plansQuery.data ?? []

  if (plansQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (plansQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text variant="large">Unable to load plans</Text>
        <Text variant="muted" className="text-center">
          {plansQuery.error.message}
        </Text>
        <Button onPress={() => plansQuery.refetch()}>
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={plansQuery.isRefetching}
          onRefresh={() => plansQuery.refetch()}
        />
      }
    >
      <Text variant="muted">
        Academic and personal plans in one place. Open a plan to schedule it.
      </Text>
      {plans.length === 0 ? (
        <View className="items-center py-16">
          <Text variant="large">No plans yet</Text>
          <Text variant="muted" className="mt-1 text-center">
            Create a plan to start adding activities.
          </Text>
        </View>
      ) : (
        plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
      )}
    </ScrollView>
  )
}

function PlanCard({ plan }: { plan: StudyPlanListItem }) {
  const countLabel =
    plan.activityCount === 1 ? '1 activity' : `${plan.activityCount} activities`
  const upcoming = plan.nextActivity
    ? {
        title: plan.nextActivity.title,
        start: plan.nextActivity.startsAt,
      }
    : null

  return (
    <Link
      href={{
        pathname: '/planner/[planId]',
        params: { planId: plan.id },
      }}
      asChild
    >
      <TouchableOpacity activeOpacity={0.8}>
        <Card className="gap-3 py-4">
          <CardHeader className="gap-1">
            <CardTitle>{plan.name}</CardTitle>
            {plan.note ? <CardDescription>{plan.note}</CardDescription> : null}
          </CardHeader>
          <View className="px-6">
            <Text variant="muted" className="text-xs" numberOfLines={2}>
              {countLabel}
              {' · '}
              {formatUpcoming(upcoming)}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    </Link>
  )
}
