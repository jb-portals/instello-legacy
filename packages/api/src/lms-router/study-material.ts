import {
  and,
  asc,
  eq,
  getTableColumns,
  gte,
  inArray,
  notInArray,
} from '@instello/db'
import {
  CreateStudyMaterialSchema,
  chapter,
  ReplaceStudyMaterialFilesSchema,
  studyMaterial,
  studyMaterialFile,
  subscription,
  UpdateStudyMaterialSchema,
} from '@instello/db/lms'
import { createId } from '@paralleldrive/cuid2'
import { TRPCError } from '@trpc/server'
import { endOfDay } from 'date-fns'
import { z } from 'zod/v4'

import { protectedProcedure } from '../trpc'

function isFileEdited(file: {
  createdAt: Date
  updatedAt: Date | null
}): boolean {
  if (!file.updatedAt) return false
  return file.updatedAt.getTime() > file.createdAt.getTime()
}

function withEditFlags<
  T extends {
    contentEditedAt: Date | null
    files: Array<{
      createdAt: Date
      updatedAt: Date | null
    }>
  },
>(material: T) {
  return {
    ...material,
    isContentEdited: material.contentEditedAt != null,
    files: material.files.map((file) => ({
      ...file,
      isEdited: isFileEdited(file),
    })),
  }
}

export const studyMaterialRouter = {
  create: protectedProcedure
    .input(CreateStudyMaterialSchema)
    .mutation(async ({ ctx, input }) => {
      const { files, ...materialInput } = input

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(studyMaterial)
          .values({
            ...materialInput,
            createdByClerkUserId: ctx.auth.userId,
          })
          .returning()

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to create study material',
          })
        }

        const now = new Date()
        const insertedFiles = await tx
          .insert(studyMaterialFile)
          .values(
            files.map((file, index) => ({
              id: createId(),
              studyMaterialId: created.id,
              fileId: file.fileId,
              name: file.name,
              orderIndex: file.orderIndex ?? index,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .returning()

        return withEditFlags({ ...created, files: insertedFiles })
      })
    }),

  list: protectedProcedure
    .input(z.object({ chapterId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const materials = await ctx.db.query.studyMaterial.findMany({
        where: eq(studyMaterial.chapterId, input.chapterId),
        with: {
          files: {
            orderBy: [asc(studyMaterialFile.orderIndex)],
          },
        },
        orderBy: [asc(studyMaterial.createdAt)],
      })

      return materials.map(withEditFlags)
    }),

  getById: protectedProcedure
    .input(z.object({ studyMaterialId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const material = await ctx.db.query.studyMaterial.findFirst({
        where: eq(studyMaterial.id, input.studyMaterialId),
        with: {
          files: {
            orderBy: [asc(studyMaterialFile.orderIndex)],
          },
          chapter: {
            with: { channel: { columns: { title: true } } },
          },
        },
      })

      if (!material) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study material not found',
        })
      }

      return withEditFlags(material)
    }),

  update: protectedProcedure
    .input(
      UpdateStudyMaterialSchema.and(
        z.object({ studyMaterialId: z.string().min(1) }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const { studyMaterialId, title, description, isPublished, ...rest } =
        input

      const existing = await ctx.db.query.studyMaterial.findFirst({
        where: eq(studyMaterial.id, studyMaterialId),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study material not found',
        })
      }

      const contentChanged =
        (title !== undefined && title !== existing.title) ||
        (description !== undefined && description !== existing.description)

      const now = new Date()

      const updated = await ctx.db
        .update(studyMaterial)
        .set({
          ...rest,
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(isPublished !== undefined ? { isPublished } : {}),
          updatedAt: now,
          ...(contentChanged ? { contentEditedAt: now } : {}),
        })
        .where(eq(studyMaterial.id, studyMaterialId))
        .returning()
        .then((r) => r.at(0))

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to update study material',
        })
      }

      const files = await ctx.db.query.studyMaterialFile.findMany({
        where: eq(studyMaterialFile.studyMaterialId, studyMaterialId),
        orderBy: [asc(studyMaterialFile.orderIndex)],
      })

      return withEditFlags({ ...updated, files })
    }),

  replaceFiles: protectedProcedure
    .input(ReplaceStudyMaterialFilesSchema)
    .mutation(async ({ ctx, input }) => {
      const { studyMaterialId, files } = input

      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.studyMaterial.findFirst({
          where: eq(studyMaterial.id, studyMaterialId),
          with: { files: true },
        })

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Study material not found',
          })
        }

        const now = new Date()
        const keptIds = files
          .map((file) => file.id)
          .filter((id): id is string => !!id)

        if (keptIds.length > 0) {
          await tx
            .delete(studyMaterialFile)
            .where(
              and(
                eq(studyMaterialFile.studyMaterialId, studyMaterialId),
                notInArray(studyMaterialFile.id, keptIds),
              ),
            )
        } else {
          await tx
            .delete(studyMaterialFile)
            .where(eq(studyMaterialFile.studyMaterialId, studyMaterialId))
        }

        const existingById = new Map(
          existing.files.map((file) => [file.id, file]),
        )

        const resultFiles = []

        for (const [index, file] of files.entries()) {
          const orderIndex = file.orderIndex ?? index
          const current = file.id ? existingById.get(file.id) : undefined

          if (current) {
            const keyChanged = current.fileId !== file.fileId
            const [updatedFile] = await tx
              .update(studyMaterialFile)
              .set({
                fileId: file.fileId,
                name: file.name ?? current.name,
                orderIndex,
                ...(keyChanged ? { updatedAt: now } : {}),
              })
              .where(eq(studyMaterialFile.id, current.id))
              .returning()

            if (updatedFile) resultFiles.push(updatedFile)
          } else {
            const [createdFile] = await tx
              .insert(studyMaterialFile)
              .values({
                id: createId(),
                studyMaterialId,
                fileId: file.fileId,
                name: file.name,
                orderIndex,
                createdAt: now,
                updatedAt: now,
              })
              .returning()

            if (createdFile) resultFiles.push(createdFile)
          }
        }

        const [updatedMaterial] = await tx
          .update(studyMaterial)
          .set({ updatedAt: now })
          .where(eq(studyMaterial.id, studyMaterialId))
          .returning()

        if (!updatedMaterial) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to update study material files',
          })
        }

        resultFiles.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))

        return withEditFlags({ ...updatedMaterial, files: resultFiles })
      })
    }),

  delete: protectedProcedure
    .input(z.object({ studyMaterialId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db
        .delete(studyMaterial)
        .where(eq(studyMaterial.id, input.studyMaterialId))
        .returning()
        .then((r) => r.at(0))

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study material not found',
        })
      }

      return deleted
    }),

  listPublicByChapterId: protectedProcedure
    .input(z.object({ chapterId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const materials = await tx
          .select({
            chapter: getTableColumns(chapter),
            ...getTableColumns(studyMaterial),
          })
          .from(studyMaterial)
          .innerJoin(
            chapter,
            and(
              eq(studyMaterial.chapterId, chapter.id),
              eq(chapter.isPublished, true),
            ),
          )
          .where(
            and(
              eq(studyMaterial.chapterId, input.chapterId),
              eq(studyMaterial.isPublished, true),
            ),
          )
          .orderBy(asc(studyMaterial.createdAt))

        const channelId = materials[0]?.chapter.channelId

        const userSubscription = channelId
          ? await tx.query.subscription.findFirst({
              where: and(
                eq(subscription.clerkUserId, ctx.auth.userId),
                eq(subscription.channelId, channelId),
                gte(subscription.endDate, endOfDay(new Date())),
              ),
            })
          : null

        const canAccess = !!userSubscription

        const materialIds = materials.map((material) => material.id)
        const files =
          canAccess && materialIds.length > 0
            ? await tx.query.studyMaterialFile.findMany({
                where: inArray(studyMaterialFile.studyMaterialId, materialIds),
                orderBy: [asc(studyMaterialFile.orderIndex)],
              })
            : []

        const filesByMaterialId = new Map<string, typeof files>()
        for (const file of files) {
          const list = filesByMaterialId.get(file.studyMaterialId) ?? []
          list.push(file)
          filesByMaterialId.set(file.studyMaterialId, list)
        }

        return materials.map((material) => {
          const { chapter: _chapter, ...rest } = material
          return withEditFlags({
            ...rest,
            canAccess,
            files: canAccess ? (filesByMaterialId.get(material.id) ?? []) : [],
          })
        })
      })
    }),
}
