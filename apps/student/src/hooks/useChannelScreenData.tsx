import { useQueries } from '@tanstack/react-query'
import { trpc } from '@/utils/api'

export function useChannelScreenData(channelId: string) {
  const queries = useQueries({
    queries: [
      trpc.lms.channel.getById.queryOptions({ channelId }),
      trpc.lms.subscription.getByChannelId.queryOptions({ channelId }),
      trpc.lms.chapter.list.queryOptions({ channelId, published: true }),
    ],
  })

  return {
    channelQuery: queries[0],
    subscriptionQuery: queries[1],
    chaptersQuery: queries[2],
  }
}
