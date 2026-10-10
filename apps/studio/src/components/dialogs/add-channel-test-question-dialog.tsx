'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { RouterOutputs } from '@instello/api'
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

const QuestionSchema = z
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

type ChannelTestQuestion =
  RouterOutputs['lms']['channelTest']['getById']['channelTestQuestions'][number]

const emptyDefaults = {
  title: '',
  options: [
    { label: '', isCorrect: false },
    { label: '', isCorrect: false },
    { label: '', isCorrect: false },
    { label: '', isCorrect: false },
  ],
}

function valuesFromQuestion(question?: ChannelTestQuestion) {
  if (!question) return emptyDefaults

  return {
    title: question.title,
    options: question.channelTestOptions.map((option) => ({
      label: option.label,
      isCorrect: option.isCorrect,
    })),
  }
}

export function ChannelTestQuestionDialog({
  children,
  question,
}: {
  children: React.ReactNode
  question?: ChannelTestQuestion
}) {
  const [open, setOpen] = useState(false)
  const { testId } = useParams<{ testId: string }>()
  const isEditing = !!question
  const form = useForm({
    resolver: zodResolver(QuestionSchema),
    defaultValues: valuesFromQuestion(question),
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const trpc = useTRPC()
  const queryClient = useQueryClient()

  async function afterSave(message: string) {
    await queryClient.invalidateQueries(
      trpc.lms.channelTest.getById.queryOptions({ id: testId }),
    )
    setOpen(false)
    form.reset(valuesFromQuestion(question))
    toast.success(message)
  }

  const { mutateAsync: addQuestion } = useMutation(
    trpc.lms.channelTest.addQuestion.mutationOptions({
      async onSuccess() {
        await afterSave('Question added')
      },
      onError(error) {
        toast.error(error.message)
      },
    }),
  )

  const { mutateAsync: updateQuestion } = useMutation(
    trpc.lms.channelTest.updateQuestion.mutationOptions({
      async onSuccess() {
        await afterSave('Question updated')
      },
      onError(error) {
        toast.error(error.message)
      },
    }),
  )

  async function onSubmit(values: z.infer<typeof QuestionSchema>) {
    if (question) {
      await updateQuestion({
        id: question.id,
        title: values.title,
        options: values.options,
      })
      return
    }

    await addQuestion({
      channelTestId: testId,
      title: values.title,
      options: values.options,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) form.reset(valuesFromQuestion(question))
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditing ? 'Edit question' : 'Add question'}
          </DialogTitle>
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
                {isEditing ? 'Save question' : 'Add question'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export { ChannelTestQuestionDialog as AddChannelTestQuestionDialog }
