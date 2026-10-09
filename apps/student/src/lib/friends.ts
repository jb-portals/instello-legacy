import type { QueryClient } from '@tanstack/react-query'
import { format, isToday, isTomorrow } from 'date-fns'

import { trpc } from '@/utils/api'

const SESSION_OPEN_MS = 15 * 60 * 1000

export function displayName(profile: {
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  emailAddress?: string | null
}) {
  const named = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  return profile.fullName?.trim() || named || profile.emailAddress || 'Student'
}

export function nameInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'S'
}

export function sessionPhase(
  startsAt: Date,
  endsAt: Date,
  status: string,
  now = new Date(),
) {
  if (status === 'ended' || now.getTime() >= endsAt.getTime()) return 'ended'
  if (now.getTime() < startsAt.getTime() - SESSION_OPEN_MS) return 'upcoming'
  return 'open'
}

export function formatSessionRange(startsAt: Date, endsAt: Date) {
  const day = isToday(startsAt)
    ? 'Today'
    : isTomorrow(startsAt)
      ? 'Tomorrow'
      : format(startsAt, 'EEE, d MMM')
  return `${day} · ${format(startsAt, 'h:mm a')} – ${format(endsAt, 'h:mm a')}`
}

export function formatActivityRange(startsAt: Date, endsAt: Date) {
  return `${format(startsAt, 'EEE, d MMM')} · ${format(startsAt, 'h:mm a')} – ${format(endsAt, 'h:mm a')}`
}

export function eveningWindow(from = new Date()) {
  const start = new Date(from)
  start.setSeconds(0, 0)
  start.setMinutes(0)
  start.setHours(18)
  const end = new Date(start)
  end.setHours(19)
  return { start, end }
}

export function invalidateGroup(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries(trpc.lms.studyGroup.list.pathFilter()),
    queryClient.invalidateQueries(trpc.lms.studyGroup.get.pathFilter()),
    queryClient.invalidateQueries(trpc.lms.studyGroup.progress.pathFilter()),
  ])
}

export function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
