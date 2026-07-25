import { and, asc, eq, getTableColumns, gt, gte } from '@instello/db'
import {
  CreateVideoSchema,
  channel,
  chapter,
  subscription,
  UpdateVideoSchema,
  video,
} from '@instello/db/lms'
import { createId } from '@paralleldrive/cuid2'
import { TRPCError } from '@trpc/server'
import { endOfDay } from 'date-fns'
import { z } from 'zod/v4'

import type { withTx } from '../router.helpers'
import type { Context } from '../trpc'
import { protectedProcedure } from '../trpc'

export const videoRouter = {
  create: protectedProcedure
    .input(CreateVideoSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .insert(video)
        .values({ ...input, createdByClerkUserId: ctx.auth.userId })
    }),

  createUpload: protectedProcedure
    .input(CreateVideoSchema.omit({ uploadId: true, status: true }))
    .mutation(async ({ ctx, input }) => {
      const id = createId()

      const upload = await ctx.mux.video.uploads.create({
        cors_origin:
          process.env.NODE_ENV === 'production'
            ? (process.env.VERCEL_URL ?? 'No url found')
            : `http://localhost:${process.env.PORT}`,
        new_asset_settings: {
          playback_policies: ['public'],
          passthrough: id,
          meta: { creator_id: ctx.auth.userId, external_id: input.chapterId },
        },
        // test: process.env.NODE_ENV !== "production",
      })

      await ctx.db.insert(video).values({
        ...input,
        id,
        uploadId: upload.id,
        status: 'waiting',
        createdByClerkUserId: ctx.auth.userId,
      })

      return upload
    }),

  list: protectedProcedure.input(z.object({ chapterId: z.string() })).query(
    async ({ ctx, input }) =>
      await ctx.db.query.video.findMany({
        where: eq(video.chapterId, input.chapterId),
        orderBy: [asc(video.orderIndex)],
      }),
  ),

  // Used in Student App  =< v1.3.0
  listPublicByChapterId: protectedProcedure
    .input(
      z.object({
        chapterId: z.string(),
        cursor: z.string().optional().nullish(), // video.id cursor
        limit: z.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { chapterId, cursor, limit } = input

      return await ctx.db.transaction(async (tx) => {
        const videos = await tx
          .select({
            chapter: getTableColumns(chapter),
            ...getTableColumns(video),
          })
          .from(video)
          .innerJoin(
            chapter,
            and(eq(video.chapterId, chapter.id), eq(chapter.isPublished, true)),
          )
          .where(
            and(
              eq(video.chapterId, chapterId),
              eq(video.isPublished, true),
              cursor ? gt(video.id, cursor) : undefined,
            ),
          )
          .orderBy(
            asc(video.orderIndex),
            asc(video.id), // ensures stable pagination
          )
          .limit(limit + 1) // fetch one extra to detect next page

        const hasNextPage = videos.length > limit
        const items = hasNextPage ? videos.slice(0, -1) : videos

        const channelId = videos[0]?.chapter.channelId

        const userSubscription = channelId
          ? await tx.query.subscription.findFirst({
              where: and(
                eq(subscription.clerkUserId, ctx.auth.userId),
                eq(subscription.channelId, channelId),
                gte(subscription.endDate, endOfDay(new Date())),
              ),
            })
          : null

        const videosWithAuthorization = items.map((video) => {
          // const overallValues = await ctx.mux.data.metrics.getOverallValues(
          //   "views",
          //   {
          //     filters: [`video_id:${video.id}`],
          //     timeframe: ["3:months"],
          //   },
          // );

          return {
            ...video,
            canWatch: video.isPreview || !!userSubscription,
            overallValues: { data: { total_views: 0 } },
          }
        })

        return {
          items: videosWithAuthorization,
          nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
        }
      })
    }),

  update: protectedProcedure
    .input(UpdateVideoSchema.and(z.object({ videoId: z.string().min(1) })))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(video)
        .set({ ...input })
        .where(eq(video.id, input.videoId))
        .returning()
        .then((r) => r.at(0))
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        reorderedVideos: z.array(
          z.object({ videoId: z.string(), orderIndex: z.number() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.reorderedVideos.map(async ({ orderIndex, videoId }) =>
          ctx.db
            .update(video)
            .set({ orderIndex })
            .where(eq(video.id, videoId))
            .returning()
            .then((r) => r.at(0)),
        ),
      )
    }),

  setPreviewMode: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        isPreview: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const singleVideo = await tx.query.video.findFirst({
          where: eq(video.id, input.videoId),
        })

        if (!singleVideo)
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No video found to set it as preview mode.',
          })

        // 1. Turn off all video's previw mode first
        await tx
          .update(video)
          .set({ isPreview: false })
          .where(and(eq(video.chapterId, singleVideo.chapterId)))

        // 2. Turn on provided video's previw mode
        await tx
          .update(video)
          .set({ isPreview: input.isPreview })
          .where(and(eq(video.id, input.videoId)))
      })
    }),

  getById: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const singleVideo = await ctx.db.query.video.findFirst({
        where: eq(video.id, input.videoId),
        with: {
          chapter: {
            with: { channel: { columns: { title: true } } },
          },
          author: true,
        },
      })

      if (!singleVideo)
        throw new TRPCError({ message: 'No video found', code: 'NOT_FOUND' })

      const overallValues = await ctx.mux.data.metrics.getOverallValues(
        'views',
        {
          filters: [`video_id:${input.videoId}`],
          timeframe: ['3:months'],
        },
      )

      return { ...singleVideo, overallValues }
    }),

  delete: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ ctx, input }) => await deleteVideo(input, ctx)),

  getMetrics: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const metrics = await ctx.mux.data.metrics.getTimeseries('views', {
        filters: [`video_id:${input.videoId}`],
        timeframe: ['3:months'],
        group_by: 'day',
      })

      const overallValues = await ctx.mux.data.metrics.getOverallValues(
        'views',
        {
          filters: [`video_id:${input.videoId}`],
          timeframe: ['3:months'],
        },
      )

      return {
        overallValues,
        timeseries: metrics.data.map((m) => ({
          date: m[0],
          metricValue: m[1],
          views: m[2],
        })),
      }
    }),

  getMatricsByChannel: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const channelVideos = await ctx.db.query.channel
        .findFirst({
          where: eq(channel.id, input.channelId),
          columns: {},
          with: {
            chapters: {
              columns: {},
              with: {
                videos: true,
              },
            },
          },
        })
        .then((channel) =>
          channel?.chapters.flatMap((c) => c.videos.map((v) => v)),
        )

      const filters = channelVideos?.flatMap((v) => `video_id:${v.id}`)

      const metrics = await ctx.mux.data.metrics.getTimeseries('views', {
        filters,
        timeframe: ['3:months'],
        measurement: 'count',
        metric_filters: [],
      })

      const overallValues = await ctx.mux.data.metrics.getOverallValues(
        'views',
        {
          filters,
          timeframe: ['3:months'],
        },
      )

      return {
        overallValues,
        timeseries: metrics.data.map((m) => ({
          date: m[0],
          metricValue: m[1],
          views: m[2],
        })),
      }
    }),
}

export function deleteVideo(
  input: { videoId: string },
  ctx: Context | ReturnType<typeof withTx>,
) {
  return ctx.db.transaction(async (tx) => {
    const singleVideo = await tx.query.video.findFirst({
      where: eq(video.id, input.videoId),
    })

    if (!singleVideo)
      throw new TRPCError({
        message: 'Video not found',
        code: 'BAD_REQUEST',
      })

    await tx.delete(video).where(eq(video.id, input.videoId))

    if (singleVideo.assetId)
      await ctx.mux.video.assets.delete(singleVideo.assetId)

    return singleVideo
  })
}
