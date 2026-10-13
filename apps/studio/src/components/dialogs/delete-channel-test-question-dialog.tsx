'use client'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@instello/ui/components/alert-dialog'
import { Button } from '@instello/ui/components/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import React from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/trpc/react'

export function DeleteChannelTestQuestionDialog({
  children,
  questionId,
  title,
}: {
  children: React.ReactNode
  questionId: string
  title: string
}) {
  const [open, setOpen] = React.useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { testId } = useParams<{ testId: string }>()
  const { mutate: deleteQuestion, isPending } = useMutation(
    trpc.lms.channelTest.removeQuestion.mutationOptions({
      async onSuccess() {
        toast.info(
          <span>
            Question <b>{title}</b> deleted
          </span>,
        )
        await queryClient.invalidateQueries(
          trpc.lms.channelTest.getById.queryOptions({ id: testId }),
        )
        setOpen(false)
      },
      onError(error) {
        toast.error(error.message)
      },
    }),
  )

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete question permanently</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting this question will remove its options and any student
            answers for it. This action can not be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant={'secondary'}>Cancel</Button>
          </AlertDialogCancel>
          <Button
            loading={isPending}
            onClick={() => deleteQuestion({ id: questionId })}
            variant={'destructive'}
          >
            Delete Forever
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
