'use client'

import { Button } from '@instello/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@instello/ui/components/dropdown-menu'
import { cn } from '@instello/ui/lib/utils'
import {
  GlobeHemisphereEastIcon,
  LockLaminatedIcon,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useTRPC } from '@/trpc/react'

export function ChangeVisibilityChannelTest({
  testId,
  isPublished,
}: {
  testId: string
  isPublished: boolean
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { channelId } = useParams<{ channelId: string }>()

  const { mutate: updateChannelTest, isPending } = useMutation(
    trpc.lms.channelTest.update.mutationOptions({
      async onSuccess(_, v) {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.lms.channelTest.listChannel.queryOptions({ channelId }),
          ),
          queryClient.invalidateQueries(
            trpc.lms.channelTest.getById.queryOptions({ id: testId }),
          ),
        ])
        toast.info(
          `Visibility changed to ${v.isPublished ? 'Published' : 'Private'}`,
        )
      },
      onError() {
        toast.error(`Couldn't able to change the visibility of test`)
      },
    }),
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-6"
          size={'icon'}
          loading={isPending}
          onClick={(e) => e.stopPropagation()}
        >
          {isPublished ? (
            <GlobeHemisphereEastIcon
              className={cn('size-3.5', isPending && 'hidden')}
              weight="duotone"
            />
          ) : (
            <LockLaminatedIcon
              className={cn('size-3.5', isPending && 'hidden')}
              weight="duotone"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Test Visibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={isPublished ? 'published' : 'private'}
          onValueChange={(value) =>
            updateChannelTest({
              isPublished: value == 'published',
              id: testId,
            })
          }
        >
          <DropdownMenuRadioItem value="private">
            <LockLaminatedIcon weight="duotone" />
            Private
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="published">
            <GlobeHemisphereEastIcon weight="duotone" />
            Published
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
