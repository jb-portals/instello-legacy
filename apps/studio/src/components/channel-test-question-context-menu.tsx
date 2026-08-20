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

import { ChannelTestQuestionDialog } from './dialogs/add-channel-test-question-dialog'
import { DeleteChannelTestQuestionDialog } from './dialogs/delete-channel-test-question-dialog'

type ChannelTestQuestion =
  RouterOutputs['lms']['channelTest']['getById']['channelTestQuestions'][number]

export function ChannelTestQuestionContextMenu({
  question,
}: {
  question: ChannelTestQuestion
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <DotsThreeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ChannelTestQuestionDialog question={question}>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
            }}
          >
            <PenNibIcon />
            Edit
          </DropdownMenuItem>
        </ChannelTestQuestionDialog>

        <DropdownMenuSeparator />

        <DeleteChannelTestQuestionDialog
          questionId={question.id}
          title={question.title}
        >
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => e.preventDefault()}
          >
            <TrashIcon />
            Delete
          </DropdownMenuItem>
        </DeleteChannelTestQuestionDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
