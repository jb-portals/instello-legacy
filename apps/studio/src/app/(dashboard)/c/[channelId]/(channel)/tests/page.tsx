import { Button } from '@instello/ui/components/button'
import { PlusIcon } from '@phosphor-icons/react/dist/ssr'
import { Suspense } from 'react'
import { ChannelTestsList } from '@/components/channel-tests-list'
import { CreateChannelTestDialog } from '@/components/dialogs/create-channel-test-dialog'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function Page({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const { channelId } = await params
  prefetch(trpc.lms.channelTest.listChannel.queryOptions({ channelId }))

  return (
    <HydrateClient>
      <div className="col-span-5 space-y-3.5">
        <div className="flex w-full items-center justify-between">
          <div className="text-lg font-semibold">Tests</div>

          <CreateChannelTestDialog>
            <Button>
              New <PlusIcon />
            </Button>
          </CreateChannelTestDialog>
        </div>
        <div className="@6xl/main:grid-cols-2 grid grid-cols-1 gap-3.5">
          <Suspense>
            <ChannelTestsList />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  )
}
