'use client'

import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@instello/ui/components/accordion'
import { Button } from '@instello/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@instello/ui/components/dropdown-menu'
import {
  DotsThreeOutlineIcon,
  FilePdfIcon,
  HashIcon,
  PenNibIcon,
  PlusSquareIcon,
  TrashSimpleIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTRPC } from '@/trpc/react'

import { ChangeVisibilityChapter } from './change-visibility-chapter-dropdown'
import { DeleteChapterDialog } from './dialogs/delete-chapter-dialog'
import { EditChapterDialog } from './dialogs/edit-chapter-dialog'
import { UploadStudyMaterialDialog } from './dialogs/upload-study-material-dialog'
import { UploadVideoDialog } from './dialogs/upload-video-dialog'
import { StudyMaterialsList } from './study-materials-list'
import { VideosList } from './videos-list'

export function ChapterList() {
  const trpc = useTRPC()
  const { channelId } = useParams<{ channelId: string }>()
  const { data } = useSuspenseQuery(
    trpc.lms.chapter.list.queryOptions({ channelId }),
  )

  const [openChapter, setOpenChapter] = useState<string | undefined>(
    data.at(0)?.id, // default open first
  )

  if (data.length === 0)
    return (
      <div className="flex min-h-40 w-full flex-col items-center justify-center gap-2.5 px-16">
        <HashIcon
          size={40}
          weight="duotone"
          className="text-muted-foreground"
        />
        <div>No chapters</div>
        <p className="text-muted-foreground max-w-md text-center text-sm">
          Chapters are the small pieces of large channel to post your knowledge.
          Create one by clicking on the new button on the top.
        </p>
      </div>
    )

  return (
    <Accordion
      type="single"
      value={openChapter}
      onValueChange={(val) => setOpenChapter(val)}
      className="space-y-3.5"
    >
      {data.map((item) => (
        <AccordionItem
          key={item.id}
          className="bg-accent/30 rounded-lg border border-b-0"
          value={item.id}
        >
          <AccordionHeader className="group inline-flex w-full flex-1 items-center justify-between space-x-3.5 px-6">
            <ChangeVisibilityChapter chapterId={item.id} />
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={'outline'}
                  size={'icon'}
                  className="size-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 [&>svg]:size-3!"
                >
                  <DotsThreeOutlineIcon weight="duotone" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[150px]">
                <UploadVideoDialog chapterName={item.title} chapterId={item.id}>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <PlusSquareIcon weight="duotone" /> Add video...
                  </DropdownMenuItem>
                </UploadVideoDialog>
                <UploadStudyMaterialDialog
                  chapterName={item.title}
                  chapterId={item.id}
                >
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <FilePdfIcon weight="duotone" /> Add study material...
                  </DropdownMenuItem>
                </UploadStudyMaterialDialog>
                <EditChapterDialog chapterId={item.id}>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <PenNibIcon weight="duotone" />
                    Rename
                  </DropdownMenuItem>
                </EditChapterDialog>
                <DeleteChapterDialog chapterId={item.id}>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                    }}
                    variant="destructive"
                  >
                    <TrashSimpleIcon weight="duotone" />
                    Delete chapter
                  </DropdownMenuItem>
                </DeleteChapterDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </AccordionHeader>
          <AccordionContent className="px-3.5">
            {/* Only fetch and render when this chapter is open */}
            {openChapter === item.id ? (
              <>
                <VideosList chapterId={item.id} />
                <StudyMaterialsList chapterId={item.id} />
              </>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
