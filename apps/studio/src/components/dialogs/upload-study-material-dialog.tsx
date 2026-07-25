'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CreateStudyMaterialSchema } from '@instello/db/lms'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@instello/ui/components/breadcrumb'
import { Button } from '@instello/ui/components/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@instello/ui/components/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@instello/ui/components/form'
import { Input } from '@instello/ui/components/input'
import { Label } from '@instello/ui/components/label'
import { Textarea } from '@instello/ui/components/textarea'
import { cn } from '@instello/ui/lib/utils'
import { FilePdfIcon, XIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import type React from 'react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import { useTRPC } from '@/trpc/react'
import { useUploadThing } from '@/utils/uploadthing'

const FormSchema = CreateStudyMaterialSchema.omit({
  files: true,
  chapterId: true,
})

export function UploadStudyMaterialDialog({
  children,
  chapterId,
  chapterName,
}: {
  children: React.ReactNode
  chapterId: string
  chapterName: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const { startUpload, isUploading } = useUploadThing(
    'studyMaterialFileUploader',
    {
      onUploadError(error) {
        toast.error(error.message)
      },
    },
  )

  const { mutateAsync: createStudyMaterial, isPending: isCreating } =
    useMutation(
      trpc.lms.studyMaterial.create.mutationOptions({
        async onSuccess() {
          await queryClient.invalidateQueries(
            trpc.lms.studyMaterial.list.queryOptions({ chapterId }),
          )
          setOpen(false)
          form.reset()
          setSelectedFiles([])
          toast.info('Study material uploaded')
        },
        onError() {
          toast.error('Failed to create study material')
        },
      }),
    )

  const isPending = isUploading || isCreating || form.formState.isSubmitting

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    const pdfs = files.filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf'),
    )

    if (pdfs.length !== files.length) {
      toast.error('Only PDF files are allowed')
    }

    setSelectedFiles((prev) => {
      const next = [...prev, ...pdfs].slice(0, 10)
      if (prev.length + pdfs.length > 10) {
        toast.error('You can upload up to 10 PDF files')
      }
      return next
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    if (selectedFiles.length === 0) {
      toast.error('At least one PDF file is required')
      return
    }

    try {
      const uploaded = await startUpload(selectedFiles, { chapterId })

      if (!uploaded?.length) {
        toast.error('Failed to upload files')
        return
      }

      await createStudyMaterial({
        title: values.title,
        description: values.description || undefined,
        chapterId,
        files: uploaded.map((file, index) => ({
          fileId: file.serverData.key,
          name: file.serverData.name || file.name,
          orderIndex: index,
        })),
      })
    } catch (error) {
      console.error('Failed to upload study material:', error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          form.reset()
          setSelectedFiles([])
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="@container/dialog-content sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>{chapterName}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <DialogTitle className="text-sm" asChild>
                  <BreadcrumbPage>Upload Study Material</BreadcrumbPage>
                </DialogTitle>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="eg. Week 1 lecture notes"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Optional short description"
                        rows={3}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">PDF files</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  hidden
                  disabled={isPending || selectedFiles.length >= 10}
                />

                {selectedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8">
                    <div className="bg-muted relative flex size-16 items-center justify-center rounded-full">
                      {isPending ? (
                        <Image
                          src={'/loading-rocket.gif'}
                          className="scale-150"
                          alt="Loading Rocket"
                          fill
                        />
                      ) : (
                        <FilePdfIcon
                          weight="duotone"
                          className="text-muted-foreground size-8"
                        />
                      )}
                    </div>
                    <p className="text-muted-foreground max-w-xs text-center text-sm">
                      Select one or more PDF files. Study material stays private
                      until you publish it.
                    </p>
                    <Button
                      type="button"
                      className="rounded-full"
                      disabled={isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select PDFs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="bg-accent/40 flex items-center gap-2.5 rounded-md px-3 py-2"
                      >
                        <FilePdfIcon
                          weight="duotone"
                          className="text-muted-foreground size-5 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {file.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          onClick={() => removeFile(index)}
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    {selectedFiles.length < 10 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Add more PDFs
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </DialogBody>

            <DialogFooter className="sm:justify-between">
              <p
                className={cn(
                  'text-muted-foreground text-xs',
                  selectedFiles.length === 0 && 'invisible',
                )}
              >
                {selectedFiles.length} PDF
                {selectedFiles.length === 1 ? '' : 's'} selected
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    setSelectedFiles([])
                    form.reset()
                    setOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isPending}>
                  Upload
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
