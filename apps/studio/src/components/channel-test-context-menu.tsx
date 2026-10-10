'use client'

import type { RouterOutputs } from '@instello/api'
import { Button } from '@instello/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@instello/ui/components/dropdown-menu'
import { DotsThreeIcon, PenNibIcon, TrashIcon } from '@phosphor-icons/react'
import { useParams } from 'next/navigation'
import { useRouter } from 'nextjs-toploader/app'

import { DeleteChannelTestDialog } from './dialogs/delete-channel-test-dialog'

type ChannelTest = RouterOutputs['lms']['channelTest']['listChannel'][number]

export function ChannelTestContextMenu({ test }: { test: ChannelTest }) {
  const { channelId } = useParams<{ channelId: string }>()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onClick={() => router.push(`/c/${channelId}/t/${test.id}`)}
        >
          <PenNibIcon />
          Open
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DeleteChannelTestDialog testId={test.id} title={test.title}>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => e.preventDefault()}
          >
            <TrashIcon />
            Delete Test
          </DropdownMenuItem>
        </DeleteChannelTestDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
