import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { ChoiceChips } from '@/components/planner/choice-chips'
import { DateTimeField } from '@/components/planner/date-time-field'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { eveningWindow } from '@/lib/friends'

export function ScheduleSessionSheet({
  visible,
  plans,
  saving = false,
  onDismiss,
  onSubmit,
}: {
  visible: boolean
  plans: { id: string; name: string }[]
  saving?: boolean
  onDismiss: () => void
  onSubmit: (input: {
    title: string
    planId?: string
    startsAt: Date
    endsAt: Date
  }) => void
}) {
  const [title, setTitle] = useState('')
  const [planId, setPlanId] = useState('none')
  const [startsAt, setStartsAt] = useState(() => eveningWindow().start)
  const [endsAt, setEndsAt] = useState(() => eveningWindow().end)

  useEffect(() => {
    if (!visible) {
      const window = eveningWindow()
      setTitle('')
      setPlanId('none')
      setStartsAt(window.start)
      setEndsAt(window.end)
    }
  }, [visible])

  const planOptions = [
    { value: 'none', label: 'No plan' },
    ...plans.map((plan) => ({ value: plan.id, label: plan.name })),
  ]

  function changeStart(next: Date) {
    setStartsAt(next)
    setEndsAt((current) => {
      const updated = new Date(next)
      updated.setHours(current.getHours(), current.getMinutes(), 0, 0)
      if (updated <= next) return new Date(next.getTime() + 60 * 60 * 1000)
      return updated
    })
  }

  function submit() {
    if (endsAt <= startsAt) {
      Alert.alert('Check the time', 'End time must be after start time')
      return
    }
    onSubmit({
      title: title.trim(),
      planId: planId === 'none' ? undefined : planId,
      startsAt,
      endsAt,
    })
  }

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={() => {
        if (!saving) onDismiss()
      }}
      title="Schedule session"
      snapPoints={['88%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Spring Boot Study"
          />
        </View>
        <View className="gap-1.5">
          <Label>Date</Label>
          <DateTimeField mode="date" value={startsAt} onChange={changeStart} />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label>Starts</Label>
            <DateTimeField
              mode="time"
              value={startsAt}
              onChange={changeStart}
            />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>Ends</Label>
            <DateTimeField mode="time" value={endsAt} onChange={setEndsAt} />
          </View>
        </View>
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
        <Button disabled={title.trim().length === 0 || saving} onPress={submit}>
          <Text>Schedule</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
