import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns'
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from 'phosphor-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, View } from 'react-native'
import { ActivityDetailSheet } from '@/components/planner/activity-detail-sheet'
import { ActivitySheet } from '@/components/planner/activity-sheet'
import { DayView } from '@/components/planner/day-view'
import { MonthView } from '@/components/planner/month-view'
import { WeekView } from '@/components/planner/week-view'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  type ActivityDraft,
  type ActivityStatus,
  type CalendarView,
  toActivity,
  WEEK_STARTS_ON,
} from '@/lib/planner'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/api'

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

type EditorState = {
  mode: 'create' | 'edit' | 'reschedule'
  activity?: Activity
} | null

function activityInput(draft: ActivityDraft) {
  return {
    title: draft.title.trim(),
    kind: draft.kind,
    startsAt: draft.start,
    endsAt: draft.end,
    priority: draft.priority,
    reminder: draft.reminder,
    recurrence: draft.recurrence,
  }
}

export function PlanCalendar({ planId }: { planId: string }) {
  const queryClient = useQueryClient()
  const activitiesQuery = useQuery(
    trpc.lms.studyPlan.activity.list.queryOptions({ planId }),
  )
  const planActivities = (activitiesQuery.data ?? []).map(toActivity)
  const [view, setView] = useState<CalendarView>('day')
  const [cursor, setCursor] = useState(() => new Date())
  const [editor, setEditor] = useState<EditorState>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function refreshActivities() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.lms.studyPlan.activity.list.queryFilter({ planId }),
      ),
      queryClient.invalidateQueries(trpc.lms.studyPlan.list.pathFilter()),
    ])
  }

  const createActivity = useMutation(
    trpc.lms.studyPlan.activity.create.mutationOptions({
      async onSuccess(created) {
        setEditor(null)
        setCursor(new Date(created.startsAt))
        await refreshActivities()
      },
      onError(error) {
        Alert.alert('Unable to save activity', error.message)
      },
    }),
  )
  const updateActivity = useMutation(
    trpc.lms.studyPlan.activity.update.mutationOptions({
      async onSuccess(updated) {
        setEditor(null)
        setCursor(new Date(updated.startsAt))
        await refreshActivities()
      },
      onError(error) {
        Alert.alert('Unable to save activity', error.message)
      },
    }),
  )
  const deleteActivity = useMutation(
    trpc.lms.studyPlan.activity.delete.mutationOptions({
      async onSuccess() {
        setSelectedId(null)
        await refreshActivities()
      },
      onError(error) {
        Alert.alert('Unable to delete activity', error.message)
      },
    }),
  )
  const setStatus = useMutation(
    trpc.lms.studyPlan.activity.setStatus.mutationOptions({
      async onSuccess() {
        await refreshActivities()
      },
      onError(error) {
        Alert.alert('Unable to update activity', error.message)
      },
    }),
  )
  const rescheduleActivity = useMutation(
    trpc.lms.studyPlan.activity.reschedule.mutationOptions({
      async onSuccess(created) {
        setEditor(null)
        setSelectedId(null)
        setCursor(new Date(created.startsAt))
        setView('day')
        await refreshActivities()
      },
      onError(error) {
        Alert.alert('Unable to reschedule activity', error.message)
      },
    }),
  )

  const selected =
    planActivities.find((activity) => activity.id === selectedId) ?? null
  const saving =
    createActivity.isPending ||
    updateActivity.isPending ||
    rescheduleActivity.isPending

  function shift(direction: -1 | 1) {
    setCursor((current) => {
      if (view === 'day') return addDays(current, direction)
      if (view === 'week') return addWeeks(current, direction)
      return addMonths(current, direction)
    })
  }

  function focusDay(date: Date) {
    setCursor(date)
    setView('day')
  }

  function handleSave(draft: ActivityDraft) {
    if (!editor || saving) return
    const input = activityInput(draft)
    if (editor.mode === 'create') {
      createActivity.mutate({ planId, ...input })
    } else if (editor.mode === 'edit' && editor.activity) {
      updateActivity.mutate({ activityId: editor.activity.id, ...input })
    } else if (editor.mode === 'reschedule' && editor.activity) {
      rescheduleActivity.mutate({
        activityId: editor.activity.id,
        ...input,
      })
    }
  }

  function markStatus(activity: Activity, status: ActivityStatus) {
    if (status === 'rescheduled') {
      setSelectedId(null)
      setEditor({ mode: 'reschedule', activity })
      return
    }
    setStatus.mutate({ activityId: activity.id, status })
  }

  const rangeLabel =
    view === 'day'
      ? format(cursor, 'EEEE, d MMM')
      : view === 'week'
        ? `${format(startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }), 'd MMM')} – ${format(endOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }), 'd MMM')}`
        : format(cursor, 'MMMM yyyy')

  return (
    <View className="relative flex-1">
      <View className="gap-3 px-4 pt-3 pb-2">
        <View className="bg-secondary flex-row rounded-full p-1">
          {VIEWS.map((item) => {
            const selectedView = view === item.value
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                onPress={() => setView(item.value)}
                className={cn(
                  'flex-1 items-center rounded-full py-1.5',
                  selectedView && 'bg-background',
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
                    selectedView && 'font-[MontserratSemiBold]',
                  )}
                >
                  {item.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous"
            onPress={() => shift(-1)}
            className="px-2 py-1"
          >
            <Icon as={CaretLeftIcon} size={18} />
          </Pressable>
          <View className="items-center">
            <Text variant="small">{rangeLabel}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCursor(new Date())}
            >
              <Text className="text-muted-foreground text-xs">Today</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            onPress={() => shift(1)}
            className="px-2 py-1"
          >
            <Icon as={CaretRightIcon} size={18} />
          </Pressable>
        </View>
      </View>

      {activitiesQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : activitiesQuery.isError ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text variant="large">Unable to load activities</Text>
          <Text variant="muted" className="text-center">
            {activitiesQuery.error.message}
          </Text>
          <Button onPress={() => activitiesQuery.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : view === 'day' ? (
        <DayView
          date={cursor}
          activities={planActivities}
          onOpen={(activity) => setSelectedId(activity.id)}
        />
      ) : view === 'week' ? (
        <WeekView
          date={cursor}
          activities={planActivities}
          onOpen={(activity) => setSelectedId(activity.id)}
          onFocusDay={focusDay}
        />
      ) : (
        <MonthView
          date={cursor}
          activities={planActivities}
          onOpen={(activity) => setSelectedId(activity.id)}
          onSelectDay={setCursor}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add activity"
        onPress={() => setEditor({ mode: 'create' })}
        className="bg-primary absolute right-4 bottom-4 size-14 items-center justify-center rounded-full shadow-sm"
      >
        <Icon as={PlusIcon} size={24} className="text-primary-foreground" />
      </Pressable>

      <ActivitySheet
        visible={editor !== null}
        mode={editor?.mode ?? 'create'}
        date={cursor}
        activity={editor?.activity}
        saving={saving}
        onDismiss={() => setEditor(null)}
        onSave={handleSave}
      />
      <ActivityDetailSheet
        activity={selected}
        onDismiss={() => setSelectedId(null)}
        onEdit={(activity) => {
          setSelectedId(null)
          setEditor({ mode: 'edit', activity })
        }}
        onReschedule={(activity) => {
          setSelectedId(null)
          setEditor({ mode: 'reschedule', activity })
        }}
        onDelete={(activity) => {
          if (deleteActivity.isPending) return
          deleteActivity.mutate({ activityId: activity.id })
        }}
        onStatus={markStatus}
      />
    </View>
  )
}
