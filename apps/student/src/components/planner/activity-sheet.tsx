import { addMinutes, differenceInMinutes } from 'date-fns'
import { useState } from 'react'
import { View } from 'react-native'
import { ChoiceChips } from '@/components/planner/choice-chips'
import { DateTimeField } from '@/components/planner/date-time-field'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  type ActivityDraft,
  formatActivityDuration,
  KIND_OPTIONS,
  labelFor,
  makeActivityDraft,
  PRIORITY_OPTIONS,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
  withDate,
  withTime,
} from '@/lib/planner'

const TITLES = {
  create: 'New activity',
  edit: 'Edit activity',
  reschedule: 'Reschedule activity',
} as const

export function ActivitySheet({
  visible,
  mode,
  date,
  activity,
  saving = false,
  onDismiss,
  onSave,
}: {
  visible: boolean
  mode: 'create' | 'edit' | 'reschedule'
  date: Date
  activity?: Activity
  saving?: boolean
  onDismiss: () => void
  onSave: (draft: ActivityDraft) => void
}) {
  const draftKey = visible
    ? `${mode}:${activity?.id ?? 'new'}:${date.toDateString()}`
    : null
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<ActivityDraft>(() =>
    makeActivityDraft({ mode, date, activity }),
  )

  if (draftKey !== appliedKey) {
    setAppliedKey(draftKey)
    if (draftKey) setDraft(makeActivityDraft({ mode, date, activity }))
  }

  function updateStart(next: Date) {
    setDraft((current) => {
      const duration = Math.max(
        differenceInMinutes(current.end, current.start),
        15,
      )
      const start = withTime(current.start, next)
      return { ...current, start, end: addMinutes(start, duration) }
    })
  }

  function updateEnd(next: Date) {
    setDraft((current) => {
      let end = withTime(current.end, next)
      if (end <= current.start) end = addMinutes(current.start, 15)
      return { ...current, end }
    })
  }

  function updateDate(next: Date) {
    setDraft((current) => ({
      ...current,
      start: withDate(current.start, next),
      end: withDate(current.end, next),
    }))
  }

  function nudgeDuration(minutes: number) {
    setDraft((current) => {
      const end = addMinutes(current.end, minutes)
      if (differenceInMinutes(end, current.start) < 15) return current
      return { ...current, end }
    })
  }

  const canSave =
    draft.title.trim().length > 0 && draft.end.getTime() > draft.start.getTime()

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={onDismiss}
      title={TITLES[mode]}
      snapPoints={['92%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Title</Label>
          <Input
            value={draft.title}
            onChangeText={(title) =>
              setDraft((current) => ({ ...current, title }))
            }
            placeholder="Mechanics problems"
          />
        </View>

        <View className="gap-1.5">
          <Label>Kind</Label>
          <ChoiceChips
            value={draft.kind}
            options={KIND_OPTIONS}
            onChange={(kind) => setDraft((current) => ({ ...current, kind }))}
          />
        </View>

        <View className="gap-1.5">
          <Label>Date</Label>
          <DateTimeField
            mode="date"
            value={draft.start}
            onChange={updateDate}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label>Start</Label>
            <DateTimeField
              mode="time"
              value={draft.start}
              onChange={updateStart}
            />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>End</Label>
            <DateTimeField mode="time" value={draft.end} onChange={updateEnd} />
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text variant="small">
            {formatActivityDuration(draft.start, draft.end)}
          </Text>
          <View className="flex-row gap-2">
            <Button
              size="xs"
              variant="outline"
              onPress={() => nudgeDuration(-15)}
            >
              <Text>-15m</Text>
            </Button>
            <Button
              size="xs"
              variant="outline"
              onPress={() => nudgeDuration(15)}
            >
              <Text>+15m</Text>
            </Button>
          </View>
        </View>

        <View className="gap-1.5">
          <Label>Priority</Label>
          <ChoiceChips
            value={draft.priority}
            options={PRIORITY_OPTIONS}
            onChange={(priority) =>
              setDraft((current) => ({ ...current, priority }))
            }
          />
        </View>

        <View className="gap-1.5">
          <Label>Reminder</Label>
          <ChoiceChips
            value={draft.reminder}
            options={REMINDER_OPTIONS}
            onChange={(reminder) =>
              setDraft((current) => ({ ...current, reminder }))
            }
          />
        </View>

        <View className="gap-1.5">
          <Label>Repeat</Label>
          {mode === 'edit' ? (
            <Text variant="muted" className="text-xs">
              {labelFor(RECURRENCE_OPTIONS, draft.recurrence)}. Saving changes
              this time only.
            </Text>
          ) : (
            <ChoiceChips
              value={draft.recurrence}
              options={RECURRENCE_OPTIONS}
              onChange={(recurrence) =>
                setDraft((current) => ({ ...current, recurrence }))
              }
            />
          )}
          {mode !== 'edit' && draft.recurrence !== 'none' ? (
            <Text variant="muted" className="text-xs">
              Adds copies for the next eight weeks.
            </Text>
          ) : null}
        </View>

        <Button disabled={!canSave || saving} onPress={() => onSave(draft)}>
          <Text>{mode === 'reschedule' ? 'Place activity' : 'Save'}</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
