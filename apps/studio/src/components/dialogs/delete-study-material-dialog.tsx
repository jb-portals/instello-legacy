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
import React from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/trpc/react'

export function DeleteStudyMaterialDialog({
  children,
  chapterId,
  studyMaterialId,
}: {
  children: React.ReactNode
  chapterId: string
  studyMaterialId: string
}) {
  const [open, setOpen] = React.useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { mutate: deleteStudyMaterial, isPending } = useMutation(
    trpc.lms.studyMaterial.delete.mutationOptions({
      async onSuccess(data) {
        toast.info(`Study material ${data.title} deleted`)
        await queryClient.invalidateQueries(
          trpc.lms.studyMaterial.list.queryOptions({ chapterId }),
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
          <AlertDialogTitle>Delete study material permanently</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting this study material will remove it from the chapter. This
            action can not be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant={'secondary'}>Cancel</Button>
          </AlertDialogCancel>
          <Button
            loading={isPending}
            onClick={() => deleteStudyMaterial({ studyMaterialId })}
            variant={'destructive'}
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
