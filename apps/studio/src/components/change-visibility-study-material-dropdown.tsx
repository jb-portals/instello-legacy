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
  CaretDownIcon,
  GlobeHemisphereEastIcon,
  LockLaminatedIcon,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTRPC } from '@/trpc/react'

export function ChangeVisibilityStudyMaterialDropdown({
  studyMaterialId,
  isPublished,
  chapterId,
}: {
  studyMaterialId: string
  isPublished: boolean
  chapterId: string
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { mutate: updateStudyMaterial, isPending } = useMutation(
    trpc.lms.studyMaterial.update.mutationOptions({
      async onSuccess(_, v) {
        await queryClient.invalidateQueries(
          trpc.lms.studyMaterial.list.queryOptions({ chapterId }),
        )
        toast.info(
          `Visibility changed to ${v.isPublished ? 'Published' : 'Private'}`,
        )
      },
      onError() {
        toast.error(`Couldn't able to change the visibility of study material`)
      },
    }),
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size={'sm'}
          className="rounded-full"
          loading={isPending}
        >
          {isPublished ? (
            <span className="inline-flex items-center gap-1.5">
              <GlobeHemisphereEastIcon
                className={cn('size-3.5', isPending && 'hidden')}
                weight="duotone"
              />{' '}
              Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <LockLaminatedIcon
                className={cn('size-3.5', isPending && 'hidden')}
                weight="duotone"
              />{' '}
              Private
            </span>
          )}

          <CaretDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Study Material Visibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={isPublished ? 'published' : 'private'}
          onValueChange={(value) =>
            updateStudyMaterial({
              isPublished: value == 'published',
              studyMaterialId,
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
