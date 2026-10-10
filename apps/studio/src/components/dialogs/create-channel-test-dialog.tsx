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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@instello/ui/components/form'
import { Input } from '@instello/ui/components/input'
import { Tabs, TabsList, TabsTrigger } from '@instello/ui/components/tabs'
import { Textarea } from '@instello/ui/components/textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endOfDay, subDays } from 'date-fns'
import { useParams } from 'next/navigation'
import type React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import {
  ChannelTestEntryWindowField,
  channelTestEntryWindowSchema,
} from '@/components/channel-test-entry-window-field'
import { useTRPC } from '@/trpc/react'

const CreateChannelTestFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Required')
    .max(256, "Title can't exceed more than 256 characters"),
  description: z.string().min(1, 'Required'),
  type: z.enum(['open', 'scheduled']),
  valid: channelTestEntryWindowSchema,
  durationMinutes: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 minute'),
})

export function CreateChannelTestDialog({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { channelId } = useParams<{ channelId: string }>()
  const form = useForm({
    resolver: zodResolver(CreateChannelTestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'open' as const,
      valid: { from: new Date(), to: endOfDay(new Date()) },
      durationMinutes: 30,
    },
  })

  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { mutateAsync: createChannelTest } = useMutation(
    trpc.lms.channelTest.create.mutationOptions({
      async onSuccess() {
        await queryClient.invalidateQueries(
          trpc.lms.channelTest.listChannel.queryOptions({ channelId }),
        )
        setOpen(false)
        form.reset()
        toast.success('Test created successfully')
      },
      onError(error) {
        toast.error(error.message)
      },
    }),
  )

  const values = form.watch()

  async function onSubmit(values: z.infer<typeof CreateChannelTestFormSchema>) {
    if (values.type === 'open') {
      await createChannelTest({
        type: 'open',
        title: values.title,
        description: values.description,
        channelId,
      })
      return
    }

    await createChannelTest({
      type: 'scheduled',
      title: values.title,
      description: values.description,
      channelId,
      startsAt: values.valid.from,
      endsAt: values.valid.to,
      durationMinutes: values.durationMinutes,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">New Test</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as 'open' | 'scheduled')
                        }
                      >
                        <TabsList className="w-full">
                          <TabsTrigger value="open" className="text-xs">
                            Open Test
                          </TabsTrigger>
                          <TabsTrigger value="scheduled" className="text-xs">
                            Scheduled Test
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-11 text-2xl font-semibold"
                        placeholder="eg. Unit 1 quiz"
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
                        placeholder="What this test covers..."
                        className="h-20 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {values.type === 'scheduled' && (
                <>
                  <FormField
                    control={form.control}
                    name="valid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry window</FormLabel>
                        <ChannelTestEntryWindowField
                          value={field.value}
                          onChange={field.onChange}
                          disabled={(date) => date < subDays(new Date(), 1)}
                        />
                        <FormDescription>
                          Students can start the test only within this window
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time to finish</FormLabel>
                        <FormControl>
                          <div className="relative inline-flex w-40 rounded-md">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                              className="pr-10"
                            />
                            <div className="bg-muted text-muted-foreground absolute right-0 flex h-full items-center justify-center rounded-e-md border px-2.5 text-sm">
                              min
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Clock starts when the student enters the test
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <Button loading={form.formState.isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
