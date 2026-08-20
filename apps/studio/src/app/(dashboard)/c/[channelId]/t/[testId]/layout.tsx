import Container from '@/components/container'
import { SiteHeader } from '@/components/site-header'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

import { ChannelTestPageBreadcrumb } from './test-breadcrumb'

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ channelId: string; testId: string }>
}) {
  const { testId } = await params
  prefetch(trpc.lms.channelTest.getById.queryOptions({ id: testId }))

  return (
    <HydrateClient>
      <SiteHeader startElement={<ChannelTestPageBreadcrumb />} />
      <Container className="px-16">{children}</Container>
    </HydrateClient>
  )
}
