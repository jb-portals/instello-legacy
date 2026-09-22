import { useRouter } from 'expo-router'
import { ClockIcon, ExamIcon } from 'phosphor-react-native'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import type { PublicChannelTest, SubmitResult } from '@/lib/channel-test'

export function TestResults({
  result,
  test,
  retaking,
  onRetake,
}: {
  result: SubmitResult
  test: PublicChannelTest
  retaking: boolean
  onRetake: () => void
}) {
  const router = useRouter()

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <View className="bg-accent/40 items-center justify-center rounded-md border border-border/15 p-4">
        <Icon
          as={ExamIcon}
          weight="duotone"
          className="text-muted-foreground size-10"
        />
      </View>
      <Text variant="h4">Test submitted</Text>
      <Text variant="muted" className="text-center text-sm">
        You scored {result.score} out of {result.totalQuestions}
      </Text>
      <Button className="rounded-full" onPress={() => router.back()}>
        <Text>Back to tests</Text>
      </Button>
      {test.type === 'open' && (
        <Button
          variant="outline"
          className="rounded-full"
          disabled={retaking}
          onPress={onRetake}
        >
          <Text>{retaking ? 'Starting...' : 'Retake'}</Text>
        </Button>
      )}
    </View>
  )
}

export function TestExpired() {
  const router = useRouter()

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Icon
        as={ClockIcon}
        weight="duotone"
        className="text-muted-foreground size-12"
      />
      <Text variant="large">Time is up</Text>
      <Text variant="muted" className="text-center text-sm">
        The time limit for this test has ended. Your attempt was not submitted.
      </Text>
      <Button className="rounded-full" onPress={() => router.back()}>
        <Text>Back to tests</Text>
      </Button>
    </View>
  )
}
