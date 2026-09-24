import { format } from 'date-fns'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/ui/text'
import {
  type Activity,
  type ActivityKind,
  isQuietKind,
  statusShortLabel,
} from '@/lib/planner'
import { cn } from '@/lib/utils'

const KIND_CLASS: Record<ActivityKind, string> = {
  study: 'bg-blue-600',
  revision: 'bg-violet-600',
  assignment: 'bg-amber-600',
  practice: 'bg-emerald-600',
  test_preparation: 'bg-rose-600',
  project: 'bg-sky-600',
  personal: 'bg-orange-600',
  other: 'bg-zinc-500',
  break: 'bg-muted',
  stretch: 'bg-muted',
}

export function kindDotClass(kind: ActivityKind) {
  if (isQuietKind(kind)) return 'bg-muted-foreground'
  return KIND_CLASS[kind]
}

export function ActivityBlock({
  activity,
  top,
  height,
  lane,
  lanes,
  onPress,
  dense = false,
}: {
  activity: Activity
  top: number
  height: number
  lane: number
  lanes: number
  onPress: () => void
  dense?: boolean
}) {
  const quiet = isQuietKind(activity.kind)
  const status = statusShortLabel(activity.status)
  const showMeta = !dense && height > 36

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={activity.title}
      onPress={onPress}
      style={{
        position: 'absolute',
        top,
        height,
        left: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        paddingHorizontal: 2,
      }}
    >
      <View
        className={cn(
          'h-full overflow-hidden rounded-md px-1 py-0.5',
          quiet
            ? 'border-border bg-muted border border-dashed'
            : KIND_CLASS[activity.kind],
          activity.status === 'rescheduled' && 'opacity-40',
        )}
      >
        <Text
          numberOfLines={dense ? 1 : 2}
          className={cn(
            'text-[11px] leading-4',
            quiet ? 'text-foreground' : 'text-white',
          )}
        >
          {activity.title}
        </Text>
        {showMeta ? (
          <Text
            numberOfLines={1}
            className={cn(
              'text-[10px]',
              quiet ? 'text-muted-foreground' : 'text-white opacity-80',
            )}
          >
            {format(new Date(activity.start), 'h:mm a')}
            {status ? ` · ${status}` : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
