import { sql } from 'drizzle-orm'
import { check, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { z } from 'zod/v4'

import { initialColumns } from '../columns.helpers'
import { lmsPgTable } from '../table.helpers'

export const friendshipStatuses = ['pending', 'accepted', 'declined'] as const

export const friendship = lmsPgTable(
  'friendship',
  (d) => ({
    ...initialColumns,
    clerkUserIdLow: d.text().notNull(),
    clerkUserIdHigh: d.text().notNull(),
    requesterClerkUserId: d.text().notNull(),
    addresseeClerkUserId: d.text().notNull(),
    status: d.text({ enum: friendshipStatuses }).notNull().default('pending'),
    requesterSharesActivity: d.boolean().notNull().default(false),
    addresseeSharesActivity: d.boolean().notNull().default(false),
  }),
  (t) => [
    uniqueIndex().on(t.clerkUserIdLow, t.clerkUserIdHigh),
    index().on(t.requesterClerkUserId),
    index().on(t.addresseeClerkUserId),
    check(
      'friendship_distinct_users',
      sql`${t.clerkUserIdLow} <> ${t.clerkUserIdHigh}`,
    ),
  ],
)

export const FriendEmailSchema = z.object({
  email: z.email('Enter a valid email'),
})

export const SendFriendRequestSchema = z.object({
  clerkUserId: z.string().min(1, 'Student is required'),
})

export const RespondFriendRequestSchema = z.object({
  friendshipId: z.string().min(1, 'Request is required'),
  action: z.enum(['accept', 'decline']),
})

export const SetFriendSharingSchema = z.object({
  friendshipId: z.string().min(1, 'Friend is required'),
  sharesActivity: z.boolean(),
})

export const FriendUserSchema = z.object({
  clerkUserId: z.string().min(1, 'Student is required'),
})
