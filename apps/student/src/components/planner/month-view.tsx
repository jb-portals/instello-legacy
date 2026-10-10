import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { Pressable, ScrollView, View } from 'react-native'
import { kindDotClass } from '@/components/planner/activity-block'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  activitiesOnDay,
  formatTimeRange,
  KIND_OPTIONS,
  labelFor,
  statusShortLabel,
  WEEK_STARTS_ON,
} from '@/lib/planner'
import { cn } from '@/lib/utils'

export function MonthView({
  date,
  activities,
  onOpen,
  onSelectDay,
}: {
  date: Date
  activities: Activity[]
  onOpen: (activity: Activity) => void
  onSelectDay: (date: Date) => void
}) {
  const monthStart = startOfMonth(date)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: WEEK_STARTS_ON }),
  })
  const weekdays = days.slice(0, 7)
  const selectedActivities = activitiesOnDay(activities, date)
  const weeks: Date[][] = []
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7))
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 96, paddingHorizontal: 12 }}
    >
      <View className="flex-row">
        {weekdays.map((day) => (
          <View key={day.toISOString()} className="flex-1 items-center py-2">
            <Text className="text-muted-foreground text-[10px]">
              {format(day, 'EEE')}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.toISOString()} className="flex-row">
          {week.map((day) => {
            const inMonth = isSameMonth(day, date)
            const selected = isSameDay(day, date)
            const today = isToday(day)
            const kinds = [
              ...new Set(
                activitiesOnDay(activities, day).map((item) => item.kind),
              ),
            ].slice(0, 3)

            return (
              <Pressable
                key={day.toISOString()}
                accessibilityRole="button"
                onPress={() => onSelectDay(day)}
                className="h-16 flex-1 items-center gap-1 py-1"
              >
                <View
                  className={cn(
                    'size-7 items-center justify-center rounded-full',
                    selected && 'bg-primary',
                    today && !selected && 'border-primary border',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      selected && 'text-primary-foreground',
                      !inMonth && !selected && 'text-muted-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                <View className="h-2 flex-row gap-0.5">
                  {kinds.map((kind) => (
                    <View
                      key={kind}
                      className={cn(
                        'size-1.5 rounded-full',
                        kindDotClass(kind),
                      )}
                    />
                  ))}
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}

      <View className="mt-4 gap-2">
        <Text variant="small">{format(date, 'EEEE, d MMMM')}</Text>
        {selectedActivities.length === 0 ? (
          <Text variant="muted">Nothing planned.</Text>
        ) : (
          selectedActivities.map((activity) => {
            const status = statusShortLabel(activity.status)
            return (
              <Pressable
                key={activity.id}
                accessibilityRole="button"
                onPress={() => onOpen(activity)}
                className={cn(
                  'border-border flex-row items-center gap-3 rounded-xl border px-3 py-3',
                  activity.status === 'rescheduled' && 'opacity-40',
                )}
              >
                <View
                  className={cn(
                    'h-10 w-1 rounded-full',
                    kindDotClass(activity.kind),
                  )}
                />
                <View className="flex-1 gap-1">
                  <Text numberOfLines={1} variant="small">
                    {activity.title}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {formatTimeRange(activity.start, activity.end)}
                    {' · '}
                    {labelFor(KIND_OPTIONS, activity.kind)}
                    {status ? ` · ${status}` : ''}
                  </Text>
                </View>
              </Pressable>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}
