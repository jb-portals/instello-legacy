import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import { create } from 'zustand'
import {
  type Activity,
  type ActivityDraft,
  type ActivityKind,
  type ActivityPriority,
  type ActivityReminder,
  type ActivityStatus,
  createId,
  type Plan,
  recurrenceOccurrences,
} from '@/lib/planner'

type PlannerState = {
  plans: Plan[]
  activities: Activity[]
  createPlan: (input: { name: string; note: string }) => Plan
  createActivity: (planId: string, draft: ActivityDraft) => Activity | null
  updateActivity: (id: string, draft: ActivityDraft) => void
  deleteActivity: (id: string) => void
  setStatus: (id: string, status: ActivityStatus) => void
  rescheduleActivity: (id: string, draft: ActivityDraft) => Activity | null
}

function buildCopies(planId: string, draft: ActivityDraft): Activity[] {
  const seriesId = draft.recurrence === 'none' ? undefined : createId('series')

  return recurrenceOccurrences(draft.start, draft.end, draft.recurrence).map(
    (slot) => ({
      id: createId('activity'),
      planId,
      title: draft.title.trim(),
      kind: draft.kind,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      priority: draft.priority,
      reminder: draft.reminder,
      recurrence: draft.recurrence,
      seriesId,
      status: 'planned' as const,
    }),
  )
}

function at(today: Date, day: number, hour: number, minute = 0) {
  return setMinutes(setHours(addDays(today, day), hour), minute).toISOString()
}

function seedActivity(
  today: Date,
  input: {
    planId: string
    title: string
    kind: ActivityKind
    day: number
    startHour: number
    startMinute?: number
    endHour: number
    endMinute?: number
    priority?: ActivityPriority
    reminder?: ActivityReminder
    status?: ActivityStatus
  },
): Activity {
  return {
    id: createId('activity'),
    planId: input.planId,
    title: input.title,
    kind: input.kind,
    start: at(today, input.day, input.startHour, input.startMinute),
    end: at(today, input.day, input.endHour, input.endMinute),
    priority: input.priority ?? 'medium',
    reminder: input.reminder ?? 'none',
    recurrence: 'none',
    status: input.status ?? 'planned',
  }
}

function buildSeed(): Pick<PlannerState, 'plans' | 'activities'> {
  const today = startOfDay(new Date())
  const plans: Plan[] = [
    {
      id: 'plan_exam',
      name: 'Exam revision',
      note: 'Physics and chemistry before the mock test.',
    },
    {
      id: 'plan_college',
      name: 'College work',
      note: 'Assignments, practice, and the group project.',
    },
    {
      id: 'plan_personal',
      name: 'Personal',
      note: 'Errands and short breaks away from study.',
    },
  ]

  const activities: Activity[] = [
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Mechanics problems',
      kind: 'study',
      day: 0,
      startHour: 8,
      endHour: 10,
      priority: 'high',
      reminder: '15m',
    }),
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Break',
      kind: 'break',
      day: 0,
      startHour: 10,
      endHour: 10,
      endMinute: 15,
    }),
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Chapter 4 recap',
      kind: 'revision',
      day: -1,
      startHour: 11,
      endHour: 12,
      status: 'rescheduled',
    }),
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Chapter 4 recap',
      kind: 'revision',
      day: 0,
      startHour: 11,
      endHour: 12,
      priority: 'medium',
      reminder: '15m',
    }),
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Organic chemistry notes',
      kind: 'revision',
      day: 0,
      startHour: 18,
      endHour: 19,
      endMinute: 30,
      priority: 'medium',
    }),
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Mock paper 3',
      kind: 'test_preparation',
      day: 1,
      startHour: 9,
      endHour: 11,
      priority: 'high',
      reminder: '30m',
    }),
    seedActivity(today, {
      planId: 'plan_exam',
      title: 'Morning stretch',
      kind: 'stretch',
      day: 2,
      startHour: 7,
      endHour: 7,
      endMinute: 20,
    }),
    seedActivity(today, {
      planId: 'plan_college',
      title: 'Lab report draft',
      kind: 'assignment',
      day: 0,
      startHour: 14,
      endHour: 16,
      priority: 'high',
      reminder: '30m',
    }),
    seedActivity(today, {
      planId: 'plan_college',
      title: 'Problem set review',
      kind: 'practice',
      day: -1,
      startHour: 16,
      endHour: 17,
      status: 'partially_completed',
    }),
    seedActivity(today, {
      planId: 'plan_college',
      title: 'Calculus problem set',
      kind: 'practice',
      day: 1,
      startHour: 15,
      endHour: 16,
      endMinute: 30,
    }),
    seedActivity(today, {
      planId: 'plan_college',
      title: 'Group presentation slides',
      kind: 'project',
      day: 3,
      startHour: 11,
      endHour: 13,
      priority: 'medium',
      reminder: '1h',
    }),
    seedActivity(today, {
      planId: 'plan_personal',
      title: 'Call home',
      kind: 'personal',
      day: 0,
      startHour: 20,
      endHour: 21,
      priority: 'low',
      reminder: '5m',
    }),
    seedActivity(today, {
      planId: 'plan_personal',
      title: 'Return library books',
      kind: 'other',
      day: 1,
      startHour: 17,
      endHour: 18,
      priority: 'low',
    }),
    seedActivity(today, {
      planId: 'plan_personal',
      title: 'Skipped workout',
      kind: 'personal',
      day: -1,
      startHour: 7,
      endHour: 8,
      status: 'skipped',
    }),
  ]

  return { plans, activities }
}

const seeded = buildSeed()

export const usePlannerStore = create<PlannerState>((set, get) => ({
  plans: seeded.plans,
  activities: seeded.activities,
  createPlan: ({ name, note }) => {
    const plan: Plan = {
      id: createId('plan'),
      name: name.trim(),
      note: note.trim(),
    }
    set((state) => ({ plans: [plan, ...state.plans] }))
    return plan
  },
  createActivity: (planId, draft) => {
    const copies = buildCopies(planId, draft)
    if (copies.length === 0) return null
    set((state) => ({ activities: [...state.activities, ...copies] }))
    return copies[0] ?? null
  },
  updateActivity: (id, draft) => {
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === id
          ? {
              ...activity,
              title: draft.title.trim(),
              kind: draft.kind,
              start: draft.start.toISOString(),
              end: draft.end.toISOString(),
              priority: draft.priority,
              reminder: draft.reminder,
              recurrence: draft.recurrence,
            }
          : activity,
      ),
    }))
  },
  deleteActivity: (id) => {
    set((state) => ({
      activities: state.activities.filter((activity) => activity.id !== id),
    }))
  },
  setStatus: (id, status) => {
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === id ? { ...activity, status } : activity,
      ),
    }))
  },
  rescheduleActivity: (id, draft) => {
    const source = get().activities.find((activity) => activity.id === id)
    if (!source) return null
    const copies = buildCopies(source.planId, draft)
    const created = copies[0]
    if (!created) return null
    set((state) => ({
      activities: [
        ...state.activities.map((activity) =>
          activity.id === id
            ? { ...activity, status: 'rescheduled' as const }
            : activity,
        ),
        ...copies,
      ],
    }))
    return created
  },
}))
