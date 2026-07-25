import { getAuth } from '@clerk/nextjs/server'
import { eq } from '@instello/db'
import { db } from '@instello/db/client'
import { author, channel, chapter, video } from '@instello/db/lms'
import type { FileRouter } from 'uploadthing/next'
import { createUploadthing } from 'uploadthing/next'
import { UploadThingError, UTApi, UTFiles } from 'uploadthing/server'
import { z } from 'zod/v4'

const f = createUploadthing()

const ut = new UTApi()

// FileRouter for your app, can contain multiple FileRoutes
export const studioFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  channelThumbneilUploader: f({
    'image/jpeg': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/png': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/avif': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/webp': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
  })
    .input(z.object({ channelId: z.string().min(1, 'Channel Id is required') }))
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req, input, files }) => {
      // This code runs on your server before upload
      const { userId } = getAuth(req)

      // If you throw, the user will not be able to upload
      if (!userId)
        throw new UploadThingError({
          message: 'Unauthorized',
          code: 'BAD_REQUEST',
        }) as Error

      const singleChannel = await db.query.channel.findFirst({
        where: eq(channel.id, input.channelId),
      })

      if (!singleChannel)
        throw new UploadThingError({
          message: 'No channel found',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error

      const fileOverrides = files.map((file) => {
        const newName = `channel-${singleChannel.id}`
        return { ...file, name: newName }
      })

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId, channel: singleChannel, [UTFiles]: fileOverrides }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // 1. If already there is uploaded file delete that
      if (metadata.channel.thumbneilId) {
        await ut.deleteFiles(metadata.channel.thumbneilId)
      }

      // 2. Updae new file key to the channel row
      const updatedChannel = await db
        .update(channel)
        .set({ thumbneilId: file.key })
        .where(eq(channel.id, metadata.channel.id))
        .returning()
        .then((r) => r[0])

      if (!updatedChannel) {
        await ut.deleteFiles(file.key)
        throw new UploadThingError({
          message: 'DB not updated',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error
      }

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return {
        uploadedBy: metadata.userId,
        channelId: updatedChannel.id,
        newThumbneilId: updatedChannel.thumbneilId,
      }
    }),

  videoThumbneilUploader: f({
    'image/jpeg': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/png': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/avif': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/webp': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
  })
    .input(z.object({ videoId: z.string().min(1, 'Video Id is required') }))
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req, input, files }) => {
      // This code runs on your server before upload
      const { userId } = getAuth(req)

      // If you throw, the user will not be able to upload
      if (!userId)
        throw new UploadThingError({
          message: 'Unauthorized',
          code: 'BAD_REQUEST',
        }) as Error

      const singleVideo = await db.query.video.findFirst({
        where: eq(video.id, input.videoId),
      })

      if (!singleVideo)
        throw new UploadThingError({
          message: 'No channel found',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error

      const fileOverrides = files.map((file) => {
        const newName = `video-${singleVideo.id}`
        return { ...file, name: newName }
      })

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId, video: singleVideo, [UTFiles]: fileOverrides }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // 1. If already there is uploaded file delete that
      if (metadata.video.thumbnailId) {
        await ut.deleteFiles(metadata.video.thumbnailId)
      }

      // 2. Updae new file key to the channel row
      const updatedChannel = await db
        .update(video)
        .set({ thumbnailId: file.key })
        .where(eq(video.id, metadata.video.id))
        .returning()
        .then((r) => r[0])

      if (!updatedChannel) {
        await ut.deleteFiles(file.key)
        throw new UploadThingError({
          message: 'DB not updated',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error
      }

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return {
        uploadedBy: metadata.userId,
        channelId: updatedChannel.id,
        newThumbnailId: updatedChannel.thumbnailId,
      }
    }),

  authorProfileUploader: f({
    'image/jpeg': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/png': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/avif': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
    'image/webp': {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '4MB',
      maxFileCount: 1,
      minFileCount: 1,
      additionalProperties: {
        height: 720,
        width: 1280,
      },
    },
  })
    .input(z.object({ authorId: z.string().min(1, 'Author Id is required') }))
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req, input, files }) => {
      // This code runs on your server before upload
      const { userId } = getAuth(req)

      // If you throw, the user will not be able to upload
      if (!userId)
        throw new UploadThingError({
          message: 'Unauthorized',
          code: 'BAD_REQUEST',
        }) as Error

      const singleAuthor = await db.query.author.findFirst({
        where: eq(author.id, input.authorId),
      })

      if (!singleAuthor)
        throw new UploadThingError({
          message: 'No author found',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error

      const fileOverrides = files.map((file) => {
        const newName = `author-${singleAuthor.id}`
        return { ...file, name: newName }
      })

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId, author: singleAuthor, [UTFiles]: fileOverrides }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // 1. If already there is uploaded file delete that
      if (metadata.author.imageUTFileId) {
        await ut.deleteFiles(metadata.author.imageUTFileId)
      }

      // 2. Updae new file key to the author row
      const updatedChannel = await db
        .update(author)
        .set({ imageUTFileId: file.key })
        .where(eq(author.id, metadata.author.id))
        .returning()
        .then((r) => r[0])

      if (!updatedChannel) {
        await ut.deleteFiles(file.key)
        throw new UploadThingError({
          message: 'DB not updated',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error
      }

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return {
        uploadedBy: metadata.userId,
        channelId: updatedChannel.id,
        newimageUTFileId: updatedChannel.imageUTFileId,
      }
    }),

  studyMaterialFileUploader: f({
    pdf: {
      maxFileSize: '32MB',
      maxFileCount: 10,
      minFileCount: 1,
      contentDisposition: 'inline',
    },
  })
    .input(z.object({ chapterId: z.string().min(1, 'Chapter Id is required') }))
    .middleware(async ({ req, input }) => {
      const { userId } = getAuth(req)

      if (!userId)
        throw new UploadThingError({
          message: 'Unauthorized',
          code: 'BAD_REQUEST',
        }) as Error

      const singleChapter = await db.query.chapter.findFirst({
        where: eq(chapter.id, input.chapterId),
      })

      if (!singleChapter)
        throw new UploadThingError({
          message: 'No chapter found',
          code: 'INTERNAL_SERVER_ERROR',
        }) as Error

      return { userId, chapter: singleChapter }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        chapterId: metadata.chapter.id,
        key: file.key,
        name: file.name,
      }
    }),
} satisfies FileRouter

export type StudioFileRouter = typeof studioFileRouter
