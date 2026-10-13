import type { db } from '@instello/db/client'

import type { Context } from './trpc'

export type ClerkStudentProfile = {
  clerkUserId: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  imageUrl: string
  emailAddress: string | null
}

export type DbClient = typeof db
export type DbTransaction = Parameters<DbClient['transaction']>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never

export type DbLike = DbTransaction

export function withTx(ctx: Context, tx: DbTransaction) {
  return { ...ctx, db: tx }
}

export async function getClerkUserById(userId: string, ctx: Context) {
  return ctx.clerk.users
    .getUser(userId)
    .then(({ firstName, fullName, lastName, imageUrl, hasImage }) => ({
      firstName,
      lastName,
      fullName,
      imageUrl,
      hasImage,
    }))
}

export async function getClerkProfiles(ctx: Context, userIds: string[]) {
  const unique = [...new Set(userIds.filter((id) => id.length > 0))]
  const profiles = new Map<string, ClerkStudentProfile>()
  if (unique.length === 0) return profiles

  for (let index = 0; index < unique.length; index += 100) {
    const userId = unique.slice(index, index + 100)
    const listed = await ctx.clerk.users.getUserList({
      userId,
      limit: userId.length,
    })

    for (const user of listed.data) {
      profiles.set(user.id, {
        clerkUserId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        emailAddress: user.primaryEmailAddress?.emailAddress ?? null,
      })
    }
  }

  return profiles
}

export function profileOrFallback(
  profiles: Map<string, ClerkStudentProfile>,
  clerkUserId: string,
): ClerkStudentProfile {
  return (
    profiles.get(clerkUserId) ?? {
      clerkUserId,
      firstName: null,
      lastName: null,
      fullName: null,
      imageUrl: '',
      emailAddress: null,
    }
  )
}

export async function getClerkUserByEmail(email: string, ctx: Context) {
  return ctx.clerk.users.getUserList({ emailAddress: [email] }).then((r) => {
    const user = r.data[0]

    return {
      firstName: user?.firstName,
      lastName: user?.lastName,
      fullName: user?.fullName,
      imageUrl: user?.imageUrl,
      hasImage: user?.hasImage,
    }
  })
}
