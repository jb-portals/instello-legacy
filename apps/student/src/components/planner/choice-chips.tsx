import { Pressable, View } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

export function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            className={cn(
              'border-border rounded-full border px-3 py-1.5',
              selected ? 'bg-primary border-primary' : 'bg-background',
            )}
          >
            <Text
              className={cn(
                'text-sm',
                selected ? 'text-primary-foreground' : 'text-foreground',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
