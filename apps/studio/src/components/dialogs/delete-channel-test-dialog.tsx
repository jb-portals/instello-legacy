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

export function DeleteChannelTestDialog({
  children,
  testId,
  title,
}: {
  children: React.ReactNode
  testId: string
  title: string
}) {
  const [open, setOpen] = React.useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { channelId } = useParams<{ channelId: string }>()
  const { mutate: deleteChannelTest, isPending } = useMutation(
    trpc.lms.channelTest.remove.mutationOptions({
      async onSuccess() {
        toast.info(
          <span>
            Test <b>{title}</b> deleted
          </span>,
        )
        await queryClient.invalidateQueries(
          trpc.lms.channelTest.listChannel.queryOptions({ channelId }),
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
          <AlertDialogTitle>Delete test permanently</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting this test will remove its questions and student attempts.
            This action can not be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant={'secondary'}>Cancel</Button>
          </AlertDialogCancel>
          <Button
            loading={isPending}
            onClick={() => deleteChannelTest({ id: testId })}
            variant={'destructive'}
          >
            Delete Forever
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
