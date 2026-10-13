import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { ChoiceChips } from '@/components/planner/choice-chips'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SheetInput } from '@/components/ui/sheet-input'
import { Text } from '@/components/ui/text'
import { displayName } from '@/lib/friends'

export function CreateTaskSheet({
  visible,
  planId,
  members,
  saving = false,
  onDismiss,
  onSubmit,
}: {
  visible: boolean
  planId: string
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
    planId: string
  }) => void
}) {
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<'common' | 'individual'>('common')
  const [assigneeId, setAssigneeId] = useState(members[0]?.clerkUserId ?? '')

  useEffect(() => {
    if (visible) {
      setAssigneeId((current) => current || members[0]?.clerkUserId || '')
      return
    }
    setTitle('')
    setScope('common')
    setAssigneeId(members[0]?.clerkUserId ?? '')
  }, [visible, members])

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={() => {
        if (!saving) onDismiss()
      }}
      title="New task"
      snapPoints={['72%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Title</Label>
          <SheetInput
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
              options={members.map((member) => ({
                value: member.clerkUserId,
                label: displayName(member.profile),
              }))}
              onChange={setAssigneeId}
            />
          </View>
        ) : null}
        <Button
          disabled={
            title.trim().length === 0 ||
            saving ||
            planId.length === 0 ||
            (scope === 'individual' && assigneeId.length === 0)
          }
          onPress={() =>
            onSubmit({
              title: title.trim(),
              scope,
              assigneeClerkUserId:
                scope === 'individual' ? assigneeId : undefined,
              planId,
            })
          }
        >
          <Text>Create task</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
