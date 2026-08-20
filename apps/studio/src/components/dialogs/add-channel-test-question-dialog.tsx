'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import { Switch } from '@instello/ui/components/switch'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type React from 'react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import { useTRPC } from '@/trpc/react'

const AddQuestionSchema = z
  .object({
    title: z.string().min(1, 'Required'),
    options: z
      .array(
        z.object({
          label: z.string().min(1, 'Required'),
          isCorrect: z.boolean(),
        }),
      )
      .min(2, 'Add at least two options'),
  })
  .check((ctx) => {
    if (!ctx.value.options.some((option) => option.isCorrect)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.options,
        values: [],
        message: 'At least one option must be correct',
        path: ['options'],
      })
    }
  })

export function AddChannelTestQuestionDialog({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { testId } = useParams<{ testId: string }>()
  const form = useForm({
    resolver: zodResolver(AddQuestionSchema),
    defaultValues: {
      title: '',
      options: [
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { mutateAsync: addQuestion } = useMutation(
    trpc.lms.channelTest.addQuestion.mutationOptions({
      async onSuccess() {
        await queryClient.invalidateQueries(
          trpc.lms.channelTest.getById.queryOptions({ id: testId }),
        )
        setOpen(false)
        form.reset()
        toast.success('Question added')
      },
      onError(error) {
        toast.error(error.message)
      },
    }),
  )

  async function onSubmit(values: z.infer<typeof AddQuestionSchema>) {
    await addQuestion({
      channelTestId: testId,
      title: values.title,
      options: values.options,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Add question</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-11 text-lg font-semibold"
                        placeholder="eg. Which of the following is true?"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Label>Options</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`options.${index}.label`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={`Option ${index + 1}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.isCorrect`}
                      render={({ field }) => (
                        <FormItem className="flex h-9 items-center gap-2">
                          <FormLabel className="text-muted-foreground text-xs font-normal">
                            Correct
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              size="sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length <= 2}
                      onClick={() => remove(index)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                ))}
                <FormField
                  control={form.control}
                  name="options"
                  render={() => <FormMessage />}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ label: '', isCorrect: false })}
                >
                  <PlusIcon />
                  Add option
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button loading={form.formState.isSubmitting}>
                Add question
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
