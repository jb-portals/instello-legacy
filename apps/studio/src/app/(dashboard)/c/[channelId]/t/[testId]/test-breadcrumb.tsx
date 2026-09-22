'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@instello/ui/components/breadcrumb'
import { CircleIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTRPC } from '@/trpc/react'

export function ChannelTestPageBreadcrumb() {
  const trpc = useTRPC()
  const { channelId, testId } = useParams<{
    channelId: string
    testId: string
  }>()
  const { data: channel } = useSuspenseQuery(
    trpc.lms.channel.getById.queryOptions({ channelId }),
  )
  const { data: test } = useSuspenseQuery(
    trpc.lms.channelTest.getById.queryOptions({ id: testId }),
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="flex items-center gap-1.5">
            <Link href={`/c/${channelId}`}>
              <CircleIcon weight="duotone" />
              {channel.title}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/c/${channelId}/tests`}>Tests</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{test.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
