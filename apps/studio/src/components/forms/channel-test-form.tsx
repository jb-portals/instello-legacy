'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@instello/ui/components/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@instello/ui/components/select'
import { Tabs, TabsList, TabsTrigger } from '@instello/ui/components/tabs'
import { Textarea } from '@instello/ui/components/textarea'
import {
  GlobeHemisphereEastIcon,
  LockLaminatedIcon,
} from '@phosphor-icons/react'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { endOfDay } from 'date-fns'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import {
  ChannelTestEntryWindowField,
  channelTestEntryWindowSchema,
} from '@/components/channel-test-entry-window-field'
import { DeleteChannelTestDialog } from '@/components/dialogs/delete-channel-test-dialog'
import { useTRPC } from '@/trpc/react'

const ChannelTestFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Required')
    .max(256, "Title can't exceed more than 256 characters"),
  description: z.string().min(1, 'Required'),
  type: z.enum(['open', 'scheduled']),
  isPublished: z.boolean(),
  valid: channelTestEntryWindowSchema,
  durationMinutes: z.int().min(1, 'Duration must be at least 1 minute'),
})

export function ChannelTestForm() {
  const { testId, channelId } = useParams<{
    testId: string
    channelId: string
  }>()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data, isError } = useSuspenseQuery(
    trpc.lms.channelTest.getById.queryOptions({ id: testId }),
  )

  const form = useForm({
    resolver: zodResolver(ChannelTestFormSchema),
    defaultValues: {
      title: data.title,
      description: data.description,
      type: data.type,
      isPublished: data.isPublished,
      valid: {
        from: data.startsAt ?? new Date(),
        to: data.endsAt ?? endOfDay(new Date()),
      },
      durationMinutes: data.durationMinutes ?? 30,
    },
  })

  const { mutateAsync: updateChannelTest } = useMutation(
    trpc.lms.channelTest.update.mutationOptions({
      async onSuccess(updated) {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.lms.channelTest.getById.queryOptions({ id: testId }),
          ),
          queryClient.invalidateQueries(
            trpc.lms.channelTest.listChannel.queryOptions({ channelId }),
          ),
        ])
        if (updated)
          form.reset({
            title: updated.title,
            description: updated.description,
            type: updated.type,
            isPublished: updated.isPublished,
            valid: {
              from: updated.startsAt ?? new Date(),
              to: updated.endsAt ?? endOfDay(new Date()),
            },
            durationMinutes: updated.durationMinutes ?? 30,
          })
        toast.info('Details updated')
      },
      onError(error) {
        toast.error(error.message)
      },
    }),
  )

  const values = form.watch()

  async function onSubmit(values: z.infer<typeof ChannelTestFormSchema>) {
    if (values.type === 'open') {
      await updateChannelTest({
        id: testId,
        title: values.title,
        description: values.description,
        type: 'open',
        isPublished: values.isPublished,
      })
      return
    }

    await updateChannelTest({
      id: testId,
      title: values.title,
      description: values.description,
      type: 'scheduled',
      isPublished: values.isPublished,
      startsAt: values.valid.from,
      endsAt: values.valid.to,
      durationMinutes: values.durationMinutes,
    })
  }

  if (isError)
    return (
      <div className="flex h-full w-full items-center justify-center"></div>
    )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
        <div className="flex w-full justify-between">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Test details
          </h3>

          <div className="space-x-3">
            <DeleteChannelTestDialog testId={testId} title={data.title}>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                size={'lg'}
              >
                Delete
              </Button>
            </DeleteChannelTestDialog>
            <Button
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
              variant={'secondary'}
              className="rounded-full"
              onClick={() => form.reset()}
              type="button"
              size={'lg'}
            >
              Discard changes
            </Button>
            <Button
              type="submit"
              loading={form.formState.isSubmitting}
              disabled={!form.formState.isDirty}
              className="rounded-full"
              size={'lg'}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="grid w-full grid-cols-8 gap-6">
          <div className="col-span-5 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (required)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Title of the test"
                      {...field}
                      maxLength={256}
                      className="resize-none"
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
                      placeholder="Add description..."
                      className="h-40 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as 'open' | 'scheduled')
                      }
                    >
                      <TabsList>
                        <TabsTrigger value="open" className="text-xs">
                          Open Test
                        </TabsTrigger>
                        <TabsTrigger value="scheduled" className="text-xs">
                          Scheduled Test
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormDescription>
                    Open tests can be taken anytime. Scheduled tests have an
                    entry window and a time limit after starting.
                  </FormDescription>
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
                        className="max-w-sm"
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
          </div>

          <div className="col-span-3">
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <FormDescription>
                    Published tests are visible to subscribed students.
                  </FormDescription>
                  <FormControl>
                    <Select
                      {...field}
                      onValueChange={(value) =>
                        field.onChange(value == 'public')
                      }
                      value={field.value ? 'public' : 'private'}
                    >
                      <SelectTrigger className="min-w-sm">
                        <SelectValue placeholder={'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">
                          <LockLaminatedIcon weight="duotone" /> Private
                        </SelectItem>
                        <SelectItem value="public">
                          <GlobeHemisphereEastIcon weight="duotone" /> Public
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}
