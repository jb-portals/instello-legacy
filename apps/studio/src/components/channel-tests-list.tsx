'use client'

import type { RouterOutputs } from '@instello/api'
import { Alert, AlertDescription } from '@instello/ui/components/alert'
import { Badge } from '@instello/ui/components/badge'
import { Card, CardContent, CardHeader } from '@instello/ui/components/card'
import { Skeleton } from '@instello/ui/components/skeleton'
import { cn } from '@instello/ui/lib/utils'
import { CalendarIcon, ExamIcon, TimerIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'
import { useRouter } from 'nextjs-toploader/app'
import { ChangeVisibilityChannelTest } from '@/components/change-visibility-channel-test'
import { ChannelTestContextMenu } from '@/components/channel-test-context-menu'
import { useTRPC } from '@/trpc/react'

type ChannelTest = RouterOutputs['lms']['channelTest']['listChannel'][number]

function getWindowStatus(test: ChannelTest) {
  if (test.type !== 'scheduled' || !test.startsAt || !test.endsAt) return null

  const now = new Date()
  if (now < test.startsAt) return 'upcoming' as const
  if (now > test.endsAt) return 'closed' as const
  return 'open' as const
}

function ChannelTestCard({ test }: { test: ChannelTest }) {
  const { channelId } = useParams<{ channelId: string }>()
  const router = useRouter()
  const windowStatus = getWindowStatus(test)
  const isClosed = windowStatus === 'closed'

  const formatDate = (date: string | Date) =>
    format(new Date(date), 'MMM dd, yyyy')

  return (
    <Card
      className={cn(
        'bg-accent relative cursor-pointer overflow-hidden border-0 transition-all hover:shadow-lg',
        isClosed && 'bg-accent/50 border border-dashed shadow-none',
        windowStatus === 'open' && 'ring-primary',
      )}
      onClick={() => router.push(`/c/${channelId}/t/${test.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {test.type === 'open' ? 'Open' : 'Scheduled'}
              </Badge>
              <Badge variant={test.isPublished ? 'default' : 'secondary'}>
                {test.isPublished ? 'Published' : 'Draft'}
              </Badge>
              {windowStatus && (
                <Badge
                  variant={
                    windowStatus === 'open'
                      ? 'default'
                      : windowStatus === 'closed'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {windowStatus === 'open'
                    ? 'Open'
                    : windowStatus === 'closed'
                      ? 'Closed'
                      : 'Upcoming'}
                </Badge>
              )}
            </div>
            <div className="text-foreground text-lg font-semibold">
              {test.title}
            </div>
          </div>
          <ChangeVisibilityChannelTest
            testId={test.id}
            isPublished={test.isPublished}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
          {test.description}
        </p>

        <div className="space-y-2">
          {test.type === 'scheduled' && test.startsAt && test.endsAt && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarIcon weight="duotone" className="h-4 w-4" />
              <span>
                {format(new Date(test.startsAt), 'MMM dd, yyyy p')} -{' '}
                {format(new Date(test.endsAt), 'MMM dd, yyyy p')}
              </span>
            </div>
          )}

          {test.type === 'scheduled' && test.durationMinutes != null && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <TimerIcon weight="duotone" className="h-4 w-4" />
              <span>{test.durationMinutes} min to finish</span>
            </div>
          )}
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              Created {formatDate(test.createdAt)}
            </span>
            <ChannelTestContextMenu test={test} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <div className="bg-muted mb-4 rounded-full p-6">
        <ExamIcon
          weight="duotone"
          className="text-muted-foreground h-12 w-12"
        />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No tests yet</h3>
      <p className="text-muted-foreground max-w-sm text-center">
        Create your first test so students can practice and take assessments in
        this channel.
      </p>
    </div>
  )
}

export function ChannelTestsListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-5 w-16 animate-pulse rounded" />
              <Skeleton className="h-5 w-20 animate-pulse rounded" />
            </div>
            <Skeleton className="h-6 w-40 animate-pulse rounded" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full animate-pulse rounded" />
              <Skeleton className="h-4 w-3/4 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

export function ChannelTestsList() {
  const { channelId } = useParams<{ channelId: string }>()
  const trpc = useTRPC()

  const { data, error } = useSuspenseQuery(
    trpc.lms.channelTest.listChannel.queryOptions({ channelId }),
  )

  if (error) {
    return (
      <div className="col-span-full">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load tests: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (data.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      {data.map((test) => (
        <ChannelTestCard key={test.id} test={test} />
      ))}
    </>
  )
}
