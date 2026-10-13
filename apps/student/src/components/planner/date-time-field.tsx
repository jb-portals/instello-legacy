import DateTimePicker from '@react-native-community/datetimepicker'
import { format, parse } from 'date-fns'
import { type ComponentType, createElement, useState } from 'react'
import { Platform, useColorScheme, View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { THEME } from '@/lib/theme'

const WebInput = 'input' as unknown as ComponentType<{
  type: 'date' | 'time'
  value: string
  onChange: (event: { target: { value: string } }) => void
  style?: object
}>

export function DateTimeField({
  value,
  mode,
  onChange,
}: {
  value: Date
  mode: 'date' | 'time'
  onChange: (date: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const scheme = useColorScheme()
  const color = THEME[scheme ?? 'light'].foreground

  if (Platform.OS === 'web') {
    const inputValue =
      mode === 'date' ? format(value, 'yyyy-MM-dd') : format(value, 'HH:mm')

    return (
      <View className="border-input bg-background h-10 justify-center rounded-md border px-3">
        {createElement(WebInput, {
          type: mode,
          value: inputValue,
          onChange: (event) => {
            const next = event.target.value
            if (!next) return
            if (mode === 'date') {
              const parsed = parse(next, 'yyyy-MM-dd', value)
              if (!Number.isNaN(parsed.getTime())) onChange(parsed)
              return
            }
            const [hours, minutes] = next.split(':').map(Number)
            if (hours === undefined || minutes === undefined) return
            const updated = new Date(value)
            updated.setHours(hours, minutes, 0, 0)
            onChange(updated)
          },
          style: {
            width: '100%',
            border: 'none',
            background: 'transparent',
            color,
            fontSize: 14,
            outline: 'none',
          },
        })}
      </View>
    )
  }

  const label =
    mode === 'date' ? format(value, 'EEE, d MMM yyyy') : format(value, 'h:mm a')

  return (
    <View className="gap-2">
      <Button
        variant="outline"
        className="justify-start"
        onPress={() => setOpen(true)}
      >
        <Text>{label}</Text>
      </Button>
      {open && Platform.OS === 'ios' ? (
        <View className="gap-2">
          <DateTimePicker
            display="spinner"
            mode={mode}
            value={value}
            onChange={(_event, date) => {
              if (date) onChange(date)
            }}
          />
          <Button size="sm" variant="secondary" onPress={() => setOpen(false)}>
            <Text>Done</Text>
          </Button>
        </View>
      ) : null}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          mode={mode}
          value={value}
          onChange={(_event, date) => {
            setOpen(false)
            if (date) onChange(date)
          }}
        />
      ) : null}
    </View>
  )
}
