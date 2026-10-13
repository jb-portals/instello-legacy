import { useRef, useState } from 'react'
import { View } from 'react-native'
import { ChoiceChips } from '@/components/planner/choice-chips'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  type ActivityStatus,
  formatActivityDuration,
  formatTimeRange,
  KIND_OPTIONS,
  labelFor,
  PRIORITY_OPTIONS,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
  STATUS_OPTIONS,
} from '@/lib/planner'

export function ActivityDetailSheet({
  activity,
  onDismiss,
  onEdit,
  onReschedule,
  onDelete,
  onStatus,
}: {
  activity: Activity | null
  onDismiss: () => void
  onEdit: (activity: Activity) => void
  onReschedule: (activity: Activity) => void
  onDelete: (activity: Activity) => void
  onStatus: (activity: Activity, status: ActivityStatus) => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const shownRef = useRef<Activity | null>(null)
  if (activity) shownRef.current = activity
  const shown = activity ?? shownRef.current
  if (shown && confirmId !== shown.id) {
    setConfirmId(shown.id)
    setConfirmingDelete(false)
  }

  function handleDismiss() {
    setConfirmingDelete(false)
    onDismiss()
  }

  return (
    <PlannerSheet
      visible={activity !== null}
      onDismiss={handleDismiss}
      title={shown?.title ?? 'Activity'}
      snapPoints={['72%']}
    >
      {shown ? (
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-2">
            <Badge variant="secondary">
              <Text>{labelFor(KIND_OPTIONS, shown.kind)}</Text>
            </Badge>
            <Badge variant="outline">
              <Text>{labelFor(PRIORITY_OPTIONS, shown.priority)} priority</Text>
            </Badge>
          </View>

          <View className="gap-1">
            <Text variant="small">
              {formatTimeRange(shown.start, shown.end)}
            </Text>
            <Text variant="muted">
              {formatActivityDuration(
                new Date(shown.start),
                new Date(shown.end),
              )}
              {' · '}
              Reminder{' '}
              {labelFor(REMINDER_OPTIONS, shown.reminder).toLowerCase()}
              {' · '}
              Repeat{' '}
              {labelFor(RECURRENCE_OPTIONS, shown.recurrence).toLowerCase()}
            </Text>
          </View>

          {shown.status === 'rescheduled' ? (
            <Text variant="muted">
              This time was moved. The new copy is a separate activity.
            </Text>
          ) : null}

          <View className="gap-1.5">
            <Text variant="small">Mark as</Text>
            <ChoiceChips
              value={shown.status}
              options={STATUS_OPTIONS}
              onChange={(status) => onStatus(shown, status)}
            />
          </View>

          {confirmingDelete ? (
            <View className="gap-2">
              <Text variant="muted">Delete this activity?</Text>
              <View className="flex-row gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onPress={() => setConfirmingDelete(false)}
                >
                  <Text>Cancel</Text>
                </Button>
                <Button
                  className="flex-1"
                  variant="destructive"
                  onPress={() => {
                    setConfirmingDelete(false)
                    onDelete(shown)
                  }}
                >
                  <Text>Delete</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View className="gap-2">
              <Button variant="outline" onPress={() => onEdit(shown)}>
                <Text>Edit</Text>
              </Button>
              <Button variant="secondary" onPress={() => onReschedule(shown)}>
                <Text>Reschedule</Text>
              </Button>
              <Button variant="ghost" onPress={() => setConfirmingDelete(true)}>
                <Text>Delete</Text>
              </Button>
            </View>
          )}
        </View>
      ) : null}
    </PlannerSheet>
  )
}
