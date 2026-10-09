import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { ChoiceChips } from '@/components/planner/choice-chips'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { displayName } from '@/lib/friends'

export function CreateTaskSheet({
  visible,
  plans,
  members,
  saving = false,
  onDismiss,
  onSubmit,
}: {
  visible: boolean
  plans: { id: string; name: string }[]
  members: {
    clerkUserId: string
    profile: {
      fullName?: string | null
      firstName?: string | null
      lastName?: string | null
      emailAddress?: string | null
    }
  }[]
  saving?: boolean
  onDismiss: () => void
  onSubmit: (input: {
    title: string
    scope: 'common' | 'individual'
    assigneeClerkUserId?: string
    planId?: string
  }) => void
}) {
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<'common' | 'individual'>('common')
  const [assigneeId, setAssigneeId] = useState(members[0]?.clerkUserId ?? '')
  const [planId, setPlanId] = useState('none')

  useEffect(() => {
    if (visible) {
      setAssigneeId((current) => current || members[0]?.clerkUserId || '')
      return
    }
    setTitle('')
    setScope('common')
    setAssigneeId(members[0]?.clerkUserId ?? '')
    setPlanId('none')
  }, [visible, members])

  const activeMembers = members
  const planOptions = [
    { value: 'none', label: 'No plan' },
    ...plans.map((plan) => ({ value: plan.id, label: plan.name })),
  ]

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={() => {
        if (!saving) onDismiss()
      }}
      title="New task"
      snapPoints={['88%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Read chapter 4"
          />
        </View>
        <View className="gap-1.5">
          <Label>Who</Label>
          <ChoiceChips
            value={scope}
            options={[
              { value: 'common', label: 'Common' },
              { value: 'individual', label: 'Individual' },
            ]}
            onChange={setScope}
          />
        </View>
        {scope === 'individual' ? (
          <View className="gap-1.5">
            <Label>Assign to</Label>
            <ChoiceChips
              value={assigneeId}
              options={activeMembers.map((member) => ({
                value: member.clerkUserId,
                label: displayName(member.profile),
              }))}
              onChange={setAssigneeId}
            />
          </View>
        ) : null}
        {plans.length > 0 ? (
          <View className="gap-1.5">
            <Label>Shared plan</Label>
            <ChoiceChips
              value={planId}
              options={planOptions}
              onChange={setPlanId}
            />
          </View>
        ) : null}
        <Button
          disabled={
            title.trim().length === 0 ||
            saving ||
            (scope === 'individual' && assigneeId.length === 0)
          }
          onPress={() =>
            onSubmit({
              title: title.trim(),
              scope,
              assigneeClerkUserId:
                scope === 'individual' ? assigneeId : undefined,
              planId: planId === 'none' ? undefined : planId,
            })
          }
        >
          <Text>Create task</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
