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
import { Pressable, View } from 'react-native'
import { ActivityDetailSheet } from '@/components/planner/activity-detail-sheet'
import { ActivitySheet } from '@/components/planner/activity-sheet'
import { DayView } from '@/components/planner/day-view'
import { MonthView } from '@/components/planner/month-view'
import { WeekView } from '@/components/planner/week-view'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  type ActivityDraft,
  type ActivityStatus,
  type CalendarView,
  WEEK_STARTS_ON,
} from '@/lib/planner'
import { usePlannerStore } from '@/lib/planner-store'
import { cn } from '@/lib/utils'

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

type EditorState = {
  mode: 'create' | 'edit' | 'reschedule'
  activity?: Activity
} | null

export function PlanCalendar({ planId }: { planId: string }) {
  const activities = usePlannerStore((state) => state.activities)
  const createActivity = usePlannerStore((state) => state.createActivity)
  const updateActivity = usePlannerStore((state) => state.updateActivity)
  const deleteActivity = usePlannerStore((state) => state.deleteActivity)
  const setStatus = usePlannerStore((state) => state.setStatus)
  const rescheduleActivity = usePlannerStore(
    (state) => state.rescheduleActivity,
  )

  const planActivities = activities.filter((item) => item.planId === planId)
  const [view, setView] = useState<CalendarView>('day')
  const [cursor, setCursor] = useState(() => new Date())
  const [editor, setEditor] = useState<EditorState>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected =
    planActivities.find((activity) => activity.id === selectedId) ?? null

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
    if (!editor) return
    if (editor.mode === 'create') {
      const created = createActivity(planId, draft)
      if (created) setCursor(new Date(created.start))
    } else if (editor.mode === 'edit' && editor.activity) {
      updateActivity(editor.activity.id, draft)
      setCursor(draft.start)
    } else if (editor.mode === 'reschedule' && editor.activity) {
      const created = rescheduleActivity(editor.activity.id, draft)
      if (created) {
        setCursor(new Date(created.start))
        setView('day')
      }
    }
    setEditor(null)
  }

  function markStatus(activity: Activity, status: ActivityStatus) {
    if (status === 'rescheduled') {
      setSelectedId(null)
      setEditor({ mode: 'reschedule', activity })
      return
    }
    setStatus(activity.id, status)
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

      {view === 'day' ? (
        <DayView
          date={cursor}
          activities={planActivities}
          onOpen={(activity) => setSelectedId(activity.id)}
        />
      ) : null}
      {view === 'week' ? (
        <WeekView
          date={cursor}
          activities={planActivities}
          onOpen={(activity) => setSelectedId(activity.id)}
          onFocusDay={focusDay}
        />
      ) : null}
      {view === 'month' ? (
        <MonthView
          date={cursor}
          activities={planActivities}
          onOpen={(activity) => setSelectedId(activity.id)}
          onSelectDay={setCursor}
        />
      ) : null}

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
          deleteActivity(activity.id)
          setSelectedId(null)
        }}
        onStatus={markStatus}
      />
    </View>
  )
}
