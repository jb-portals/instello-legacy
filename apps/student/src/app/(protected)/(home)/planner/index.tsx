import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { PlusIcon } from 'phosphor-react-native'
import { useState } from 'react'
import { Alert, TouchableOpacity, View } from 'react-native'
import { CreatePlanSheet } from '@/components/planner/create-plan-sheet'
import { PlanList } from '@/components/planner/plan-list'
import { Icon } from '@/components/ui/icon'
import { trpc } from '@/utils/api'

export default function PlannerScreen() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const createPlan = useMutation(
    trpc.lms.studyPlan.create.mutationOptions({
      async onSuccess(plan) {
        await queryClient.invalidateQueries(
          trpc.lms.studyPlan.list.pathFilter(),
        )
        setCreating(false)
        router.push({
          pathname: '/planner/[planId]',
          params: { planId: plan.id },
        })
      },
      onError(error) {
        Alert.alert('Unable to create plan', error.message)
      },
    }),
  )

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
        saving={createPlan.isPending}
        onDismiss={() => setCreating(false)}
        onSubmit={(name, note) => {
          createPlan.mutate({
            name,
            note: note || undefined,
          })
        }}
      />
    </View>
  )
}
