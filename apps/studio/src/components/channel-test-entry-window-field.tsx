'use client'

import { Button } from '@instello/ui/components/button'
import { Calendar } from '@instello/ui/components/calendar'
import { FormControl } from '@instello/ui/components/form'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@instello/ui/components/input-group'
import { Label } from '@instello/ui/components/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@instello/ui/components/popover'
import { cn } from '@instello/ui/lib/utils'
import { ArrowRightIcon, CalendarIcon, ClockIcon } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { useId } from 'react'
import { z } from 'zod/v4'

export const channelTestEntryWindowSchema = z
  .object({
    from: z.date(),
    to: z.date(),
  })
  .check((ctx) => {
    if (ctx.value.to <= ctx.value.from) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.to,
        values: [],
        message: 'End time must be after start time',
        path: [],
      })
    }
  })

export type ChannelTestEntryWindow = z.infer<
  typeof channelTestEntryWindowSchema
>

function applyDateKeepingTime(nextDate: Date, previous: Date) {
  const merged = new Date(nextDate)
  merged.setHours(
    previous.getHours(),
    previous.getMinutes(),
    previous.getSeconds(),
    previous.getMilliseconds(),
  )
  return merged
}

function applyTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const next = new Date(date)
  next.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return next
}

const timeInputClassName =
  'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'

export function ChannelTestEntryWindowField({
  value,
  onChange,
  disabled,
  className,
}: {
  value: ChannelTestEntryWindow
  onChange: (value: ChannelTestEntryWindow) => void
  disabled?: (date: Date) => boolean
  className?: string
}) {
  const id = useId()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant={'outline'}
            className={cn('w-full pl-3 text-left font-normal', className)}
          >
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 truncate">
              {format(value.from, 'PPp')}
              <ArrowRightIcon
                weight="duotone"
                className="text-muted-foreground shrink-0"
              />
              {format(value.to, 'PPp')}
            </span>
            <CalendarIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            if (range?.from && range.to)
              onChange({
                from: applyDateKeepingTime(range.from, value.from),
                to: applyDateKeepingTime(range.to, value.to),
              })
          }}
          disabled={disabled}
          captionLayout="dropdown"
        />
        <div className="flex flex-col gap-3 border-t px-3 py-3">
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor={`${id}-start`} className="text-xs font-medium">
              Start time
            </Label>
            <InputGroup>
              <InputGroupInput
                id={`${id}-start`}
                type="time"
                step={60}
                value={format(value.from, 'HH:mm')}
                onChange={(e) =>
                  onChange({
                    ...value,
                    from: applyTime(value.from, e.target.value),
                  })
                }
                className={timeInputClassName}
              />
              <InputGroupAddon>
                <ClockIcon weight="duotone" />
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor={`${id}-end`} className="text-xs font-medium">
              End time
            </Label>
            <InputGroup>
              <InputGroupInput
                id={`${id}-end`}
                type="time"
                step={60}
                value={format(value.to, 'HH:mm')}
                onChange={(e) =>
                  onChange({
                    ...value,
                    to: applyTime(value.to, e.target.value),
                  })
                }
                className={timeInputClassName}
              />
              <InputGroupAddon>
                <ClockIcon weight="duotone" />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
