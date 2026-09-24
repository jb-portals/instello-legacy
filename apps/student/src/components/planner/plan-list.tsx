import { Link } from 'expo-router'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { type Activity, formatUpcoming, type Plan } from '@/lib/planner'
import { usePlannerStore } from '@/lib/planner-store'

export function PlanList() {
  const plans = usePlannerStore((state) => state.plans)
  const activities = usePlannerStore((state) => state.activities)

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
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
        plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            activities={activities.filter((item) => item.planId === plan.id)}
          />
        ))
      )}
    </ScrollView>
  )
}

function PlanCard({
  plan,
  activities,
}: {
  plan: Plan
  activities: Activity[]
}) {
  const upcoming = [...activities]
    .filter(
      (activity) =>
        activity.status === 'planned' &&
        new Date(activity.end).getTime() >= Date.now(),
    )
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    )[0]

  const countLabel =
    activities.length === 1 ? '1 activity' : `${activities.length} activities`

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
