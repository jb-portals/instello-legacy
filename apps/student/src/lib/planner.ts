import {
  addDays,
  addMinutes,
  addWeeks,
  differenceInMinutes,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  setHours,
  setMinutes,
  startOfDay,
} from 'date-fns'

export type ActivityKind =
  | 'study'
  | 'revision'
  | 'assignment'
  | 'practice'
  | 'test_preparation'
  | 'project'
  | 'personal'
  | 'other'
  | 'break'
  | 'stretch'

export type ActivityPriority = 'low' | 'medium' | 'high'

export type ActivityReminder = 'none' | '5m' | '15m' | '30m' | '1h'

export type ActivityRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly'

export type ActivityStatus =
  | 'planned'
  | 'completed_successfully'
  | 'partially_completed'
  | 'not_completed'
  | 'skipped'
  | 'rescheduled'

export type Plan = {
  id: string
  name: string
  note: string
}

export type Activity = {
  id: string
  planId: string
  title: string
  kind: ActivityKind
  start: string
  end: string
  priority: ActivityPriority
  reminder: ActivityReminder
  recurrence: ActivityRecurrence
  seriesId?: string
  status: ActivityStatus
}

export type ActivityDraft = {
  title: string
  kind: ActivityKind
  start: Date
  end: Date
  priority: ActivityPriority
  reminder: ActivityReminder
  recurrence: ActivityRecurrence
}

export type CalendarView = 'day' | 'week' | 'month'

export const PLANNER_START_HOUR = 6
export const PLANNER_END_HOUR = 22
export const WEEK_STARTS_ON = 1 as const

export const KIND_OPTIONS: { value: ActivityKind; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'revision', label: 'Revision' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practice', label: 'Practice' },
  { value: 'test_preparation', label: 'Test preparation' },
  { value: 'project', label: 'Project' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
  { value: 'break', label: 'Break' },
  { value: 'stretch', label: 'Stretch' },
]

export const PRIORITY_OPTIONS: { value: ActivityPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const REMINDER_OPTIONS: { value: ActivityReminder; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hour' },
]

export const RECURRENCE_OPTIONS: {
  value: ActivityRecurrence
  label: string
}[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
]

export const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed_successfully', label: 'Completed successfully' },
  { value: 'partially_completed', label: 'Partially completed' },
  { value: 'not_completed', label: 'Not completed' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

const STATUS_SHORT: Record<ActivityStatus, string | null> = {
  planned: null,
  completed_successfully: 'Done',
  partially_completed: 'Partial',
  not_completed: 'Not done',
  skipped: 'Skipped',
  rescheduled: 'Moved',
}

let idCounter = 0

export function createId(prefix: string) {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

export function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value
}

export function isQuietKind(kind: ActivityKind) {
  return kind === 'break' || kind === 'stretch'
}

export function statusShortLabel(status: ActivityStatus) {
  return STATUS_SHORT[status]
}

export function withDate(base: Date, picked: Date) {
  const next = new Date(base)
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate())
  return next
}

export function withTime(base: Date, picked: Date) {
  const next = new Date(base)
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0)
  return next
}

export function formatActivityDuration(start: Date, end: Date) {
  const minutes = Math.max(differenceInMinutes(end, start), 0)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours && remainder) return `${hours}h ${remainder}m`
  if (hours) return `${hours}h`
  return `${remainder}m`
}

export function formatTimeRange(start: string | Date, end: string | Date) {
  return `${format(new Date(start), 'h:mm a')} – ${format(new Date(end), 'h:mm a')}`
}

export function formatUpcoming(activity: Activity | undefined) {
  if (!activity) return 'Nothing coming up'
  const start = new Date(activity.start)
  const time = format(start, 'h:mm a')
  const day = isToday(start)
    ? 'Today'
    : isTomorrow(start)
      ? 'Tomorrow'
      : format(start, 'EEE d MMM')
  return `Next: ${activity.title} · ${day}, ${time}`
}

export function activitiesOnDay(activities: Activity[], date: Date) {
  return activities
    .filter((activity) => isSameDay(new Date(activity.start), date))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

export function makeActivityDraft(input: {
  mode: 'create' | 'edit' | 'reschedule'
  date: Date
  activity?: Activity
}): ActivityDraft {
  if (input.mode === 'create' || !input.activity) {
    const start = setMinutes(setHours(startOfDay(input.date), 9), 0)
    return {
      title: '',
      kind: 'study',
      start,
      end: addMinutes(start, 60),
      priority: 'medium',
      reminder: 'none',
      recurrence: 'none',
    }
  }

  const shift = input.mode === 'reschedule' ? 1 : 0
  return {
    title: input.activity.title,
    kind: input.activity.kind,
    start: addDays(new Date(input.activity.start), shift),
    end: addDays(new Date(input.activity.end), shift),
    priority: input.activity.priority,
    reminder: input.activity.reminder,
    recurrence:
      input.mode === 'reschedule' ? 'none' : input.activity.recurrence,
  }
}

export function recurrenceOccurrences(
  start: Date,
  end: Date,
  recurrence: ActivityRecurrence,
) {
  const duration = Math.max(differenceInMinutes(end, start), 15)
  const last = addWeeks(start, 8).getTime()
  const dates: { start: Date; end: Date }[] = []
  let cursor = start

  while (cursor.getTime() <= last) {
    const day = cursor.getDay()
    const isFirst = cursor.getTime() === start.getTime()
    const matches =
      recurrence === 'none' ||
      recurrence === 'daily' ||
      recurrence === 'weekly' ||
      (recurrence === 'weekdays' && day !== 0 && day !== 6) ||
      isFirst

    if (matches) {
      dates.push({ start: cursor, end: addMinutes(cursor, duration) })
    }

    if (recurrence === 'none') break
    cursor = recurrence === 'weekly' ? addWeeks(cursor, 1) : addDays(cursor, 1)
  }

  return dates
}

export function blockGeometry(
  activity: Activity,
  date: Date,
  hourHeight: number,
) {
  const rangeStart = setMinutes(
    setHours(startOfDay(date), PLANNER_START_HOUR),
    0,
  )
  const rangeEnd = setMinutes(setHours(startOfDay(date), PLANNER_END_HOUR), 0)
  const start = new Date(activity.start)
  const end = new Date(activity.end)

  if (end.getTime() <= rangeStart.getTime()) {
    return { top: 0, height: 22 }
  }

  const gridHeight = (PLANNER_END_HOUR - PLANNER_START_HOUR) * hourHeight
  if (start.getTime() >= rangeEnd.getTime()) {
    return { top: gridHeight - 22, height: 22 }
  }

  const visibleStart = start < rangeStart ? rangeStart : start
  const visibleEnd = end > rangeEnd ? rangeEnd : end
  const top = (differenceInMinutes(visibleStart, rangeStart) / 60) * hourHeight
  const height = Math.max(
    (differenceInMinutes(visibleEnd, visibleStart) / 60) * hourHeight - 3,
    22,
  )

  return { top, height }
}

export function assignLanes(activities: Activity[]) {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  )
  const laneEnds: number[] = []
  const assigned: { id: string; lane: number }[] = []

  for (const activity of sorted) {
    const start = new Date(activity.start).getTime()
    const end = new Date(activity.end).getTime()
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    assigned.push({ id: activity.id, lane })
  }

  const lanes = Math.max(laneEnds.length, 1)
  return new Map(assigned.map((item) => [item.id, { lane: item.lane, lanes }]))
}
