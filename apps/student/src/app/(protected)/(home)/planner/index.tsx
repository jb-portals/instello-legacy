import { router, Stack } from 'expo-router'
import { PlusIcon } from 'phosphor-react-native'
import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { CreatePlanSheet } from '@/components/planner/create-plan-sheet'
import { PlanList } from '@/components/planner/plan-list'
import { Icon } from '@/components/ui/icon'
import { usePlannerStore } from '@/lib/planner-store'

export default function PlannerScreen() {
  const createPlan = usePlannerStore((state) => state.createPlan)
  const [creating, setCreating] = useState(false)

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: 'Planner',
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="New plan"
              onPress={() => setCreating(true)}
              className="mr-4"
              hitSlop={12}
            >
              <Icon as={PlusIcon} size={22} />
            </TouchableOpacity>
          ),
        }}
      />
      <PlanList />
      <CreatePlanSheet
        visible={creating}
        onDismiss={() => setCreating(false)}
        onSubmit={(name, note) => {
          const plan = createPlan({ name, note })
          setCreating(false)
          router.push({
            pathname: '/planner/[planId]',
            params: { planId: plan.id },
          })
        }}
      />
    </View>
  )
}
