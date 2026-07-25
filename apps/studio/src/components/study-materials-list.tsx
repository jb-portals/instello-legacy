'use client'

import { Badge } from '@instello/ui/components/badge'
import { Button } from '@instello/ui/components/button'
import { Skeleton } from '@instello/ui/components/skeleton'
import { FilePdfIcon, TrashIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/react'
import { ChangeVisibilityStudyMaterialDropdown } from './change-visibility-study-material-dropdown'
import { DeleteStudyMaterialDialog } from './dialogs/delete-study-material-dialog'

export function StudyMaterialsList({ chapterId }: { chapterId: string }) {
  const trpc = useTRPC()
  const { data, isLoading, isError } = useQuery(
    trpc.lms.studyMaterial.list.queryOptions({ chapterId }),
  )

  if (isLoading)
    return (
      <div className="mt-3 space-y-2">
        {Array.from({ length: 1 })
          .fill(0)
          .flatMap((_, i) => (
            <Skeleton className="h-14 w-full" key={i} />
          ))}
      </div>
    )

  if (isError)
    return (
      <div className="text-muted-foreground mt-3 px-2.5 text-sm">
        Couldn&apos;t fetch study materials for this chapter
      </div>
    )

  if (!data || data.length === 0)
    return (
      <div className="text-muted-foreground mt-3 px-2.5 text-sm">
        No study materials yet.
      </div>
    )

  return (
    <div className="mt-3 w-full space-y-2">
      <p className="text-muted-foreground px-2.5 text-xs font-medium tracking-wide uppercase">
        Study materials
      </p>
      {data.map((material) => (
        <div
          key={material.id}
          className="hover:bg-accent/25 hover:text-accent-foreground flex h-14 max-h-14 w-full items-center gap-2.5 overflow-hidden rounded-md px-2"
        >
          <div className="bg-accent flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/15">
            <FilePdfIcon
              weight="duotone"
              className="text-muted-foreground size-5"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="max-w-md truncate text-sm">
                {material.title}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {material.files.length}{' '}
                {material.files.length === 1 ? 'file' : 'files'}
              </Badge>
            </div>
            {material.description ? (
              <p className="text-muted-foreground max-w-md truncate text-xs">
                {material.description}
              </p>
            ) : null}
          </div>

          <ChangeVisibilityStudyMaterialDropdown
            studyMaterialId={material.id}
            isPublished={!!material.isPublished}
            chapterId={chapterId}
          />

          <DeleteStudyMaterialDialog
            chapterId={chapterId}
            studyMaterialId={material.id}
          >
            <Button variant="ghost" size="icon-sm">
              <TrashIcon weight="duotone" className="size-4" />
            </Button>
          </DeleteStudyMaterialDialog>
        </div>
      ))}
    </div>
  )
}
