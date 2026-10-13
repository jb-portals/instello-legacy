import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import { Pressable, ScrollView, View } from 'react-native'
import { ActivityBlock } from '@/components/planner/activity-block'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  activitiesOnDay,
  assignLanes,
  blockGeometry,
  PLANNER_END_HOUR,
  PLANNER_START_HOUR,
  WEEK_STARTS_ON,
} from '@/lib/planner'
import { cn } from '@/lib/utils'

const HOUR_HEIGHT = 48

const HOURS = Array.from(
  { length: PLANNER_END_HOUR - PLANNER_START_HOUR },
  (_, index) => PLANNER_START_HOUR + index,
)

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'p' : 'a'
  const value = hour % 12 || 12
  return `${value}${suffix}`
}

export function WeekView({
  date,
  activities,
  onOpen,
  onFocusDay,
}: {
  date: Date
  activities: Activity[]
  onOpen: (activity: Activity) => void
  onFocusDay: (date: Date) => void
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  })

  return (
    <View className="flex-1">
      <View className="flex-row px-2">
        <View style={{ width: 32 }} />
        {days.map((day) => {
          const selected = isSameDay(day, date)
          const hasActivities = activitiesOnDay(activities, day).length > 0
          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              onPress={() => onFocusDay(day)}
              className={cn(
                'flex-1 items-center rounded-md py-1',
                selected && 'bg-secondary',
              )}
            >
              <Text className="text-muted-foreground text-[10px]">
                {format(day, 'EEE')}
              </Text>
              <Text
                className={cn(
                  'text-sm',
                  selected && 'font-[MontserratSemiBold]',
                )}
              >
                {format(day, 'd')}
              </Text>
              <View
                className={cn(
                  'mt-0.5 size-1 rounded-full',
                  hasActivities ? 'bg-primary' : 'bg-transparent',
                )}
              />
            </Pressable>
          )
        })}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="flex-row px-2">
          <View style={{ width: 32 }}>
            {HOURS.map((hour) => (
              <View key={hour} style={{ height: HOUR_HEIGHT }}>
                <Text className="text-muted-foreground text-[9px]">
                  {formatHour(hour)}
                </Text>
              </View>
            ))}
          </View>
          {days.map((day) => {
            const dayActivities = activitiesOnDay(activities, day)
            const lanes = assignLanes(dayActivities)
            return (
              <View
                key={day.toISOString()}
                className="relative flex-1"
                style={{ height: HOURS.length * HOUR_HEIGHT }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'EEEE d MMMM')}
                  onPress={() => onFocusDay(day)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  }}
                />
                {HOURS.map((hour) => (
                  <View
                    key={hour}
                    pointerEvents="none"
                    className="border-border absolute right-0 left-0 border-t"
                    style={{ top: (hour - PLANNER_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {dayActivities.map((activity) => {
                  const geometry = blockGeometry(activity, day, HOUR_HEIGHT)
                  const placement = lanes.get(activity.id) ?? {
                    lane: 0,
                    lanes: 1,
                  }
                  return (
                    <ActivityBlock
                      key={activity.id}
                      activity={activity}
                      dense
                      top={geometry.top}
                      height={geometry.height}
                      lane={placement.lane}
                      lanes={placement.lanes}
                      onPress={() => onOpen(activity)}
                    />
                  )
                })}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
