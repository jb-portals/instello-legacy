import { format, isToday, setHours, startOfDay } from 'date-fns'
import { useEffect, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { ActivityBlock } from '@/components/planner/activity-block'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  activitiesOnDay,
  assignLanes,
  blockGeometry,
  PLANNER_END_HOUR,
  PLANNER_START_HOUR,
} from '@/lib/planner'

const HOUR_HEIGHT = 64

const HOURS = Array.from(
  { length: PLANNER_END_HOUR - PLANNER_START_HOUR },
  (_, index) => PLANNER_START_HOUR + index,
)

export function DayView({
  date,
  activities,
  onOpen,
}: {
  date: Date
  activities: Activity[]
  onOpen: (activity: Activity) => void
}) {
  const scrollRef = useRef<ScrollView>(null)
  const dayActivities = activitiesOnDay(activities, date)
  const lanes = assignLanes(dayActivities)

  useEffect(() => {
    const hour = isToday(date) ? new Date().getHours() : 8
    const offset = Math.max(hour - PLANNER_START_HOUR - 1, 0) * HOUR_HEIGHT
    scrollRef.current?.scrollTo({ y: offset, animated: false })
  }, [date])

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 96, paddingTop: 8 }}
    >
      {dayActivities.length === 0 ? (
        <Text variant="muted" className="px-4 pb-2 text-xs">
          Nothing planned this day.
        </Text>
      ) : null}
      <View className="flex-row px-2">
        <View style={{ width: 52 }}>
          {HOURS.map((hour) => (
            <View key={hour} style={{ height: HOUR_HEIGHT }} className="pr-2">
              <Text className="text-muted-foreground text-right text-[10px]">
                {format(setHours(startOfDay(date), hour), 'h a')}
              </Text>
            </View>
          ))}
        </View>
        <View
          className="relative flex-1"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {HOURS.map((hour) => (
            <View
              key={hour}
              className="border-border absolute right-0 left-0 border-t"
              style={{ top: (hour - PLANNER_START_HOUR) * HOUR_HEIGHT }}
            />
          ))}
          {dayActivities.map((activity) => {
            const geometry = blockGeometry(activity, date, HOUR_HEIGHT)
            const placement = lanes.get(activity.id) ?? { lane: 0, lanes: 1 }
            return (
              <ActivityBlock
                key={activity.id}
                activity={activity}
                top={geometry.top}
                height={geometry.height}
                lane={placement.lane}
                lanes={placement.lanes}
                onPress={() => onOpen(activity)}
              />
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}
