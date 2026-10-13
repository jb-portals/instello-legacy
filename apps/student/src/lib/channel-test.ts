import type { RouterOutputs } from '@/utils/api'

export type PublicChannelTest =
  RouterOutputs['lms']['channelTest']['listPublic'][number]

export type AttemptPayload = RouterOutputs['lms']['channelTest']['start']

export type SubmitResult = RouterOutputs['lms']['channelTest']['submit']

export type TestAction =
  | 'subscribe'
  | 'upcoming'
  | 'closed'
  | 'expired'
  | 'continue'
  | 'retake'
  | 'view-score'
  | 'start'

export function getTestAction(test: PublicChannelTest): TestAction {
  if (!test.canAttend) return 'subscribe'

  const status = test.latestAttempt?.status

  if (status === 'in_progress') return 'continue'
  if (test.availability === 'upcoming') return 'upcoming'
  if (status === 'expired') return 'expired'
  if (status === 'submitted') {
    if (test.type === 'open' && test.availability === 'open') return 'retake'
    return 'view-score'
  }
  if (test.availability === 'closed') return 'closed'

  return 'start'
}

export function testActionLabel(action: TestAction): string {
  switch (action) {
    case 'subscribe':
      return 'Subscribe to attend'
    case 'upcoming':
      return 'Not started yet'
    case 'closed':
      return 'Closed'
    case 'expired':
      return 'Time expired'
    case 'continue':
      return 'Continue'
    case 'retake':
      return 'Retake'
    case 'view-score':
      return 'View score'
    case 'start':
      return 'Start test'
  }
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
