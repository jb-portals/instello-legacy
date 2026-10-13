import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { ClockIcon, CrownIcon, ExamIcon } from 'phosphor-react-native'
import { ScrollView, View } from 'react-native'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import {
  getTestAction,
  type PublicChannelTest,
  testActionLabel,
} from '@/lib/channel-test'

export function TestIntro({
  test,
  channelId,
  starting,
  onStart,
}: {
  test: PublicChannelTest
  channelId: string
  starting: boolean
  onStart: () => void
}) {
  const router = useRouter()
  const action = getTestAction(test)
  const showPrimary =
    action === 'start' ||
    action === 'continue' ||
    action === 'retake' ||
    action === 'subscribe'

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 p-4"
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-accent/40 items-center justify-center self-center rounded-md border border-border/15 p-4">
        <Icon
          as={ExamIcon}
          weight="duotone"
          className="text-muted-foreground size-10"
        />
      </View>

      <Text variant="h4" className="text-center">
        {test.title}
      </Text>

      <View className="flex-row flex-wrap items-center justify-center gap-1.5">
        <Badge variant="secondary">
          <Text className="text-xs">
            {test.type === 'open' ? 'Open test' : 'Scheduled test'}
          </Text>
        </Badge>
        {test.availability !== 'open' && (
          <Badge variant="outline">
            <Text className="text-xs">
              {test.availability === 'upcoming' ? 'Upcoming' : 'Closed'}
            </Text>
          </Badge>
        )}
      </View>

      {test.description ? (
        <Text variant="muted" className="text-center text-sm">
          {test.description}
        </Text>
      ) : null}

      <View className="bg-accent/30 gap-2 rounded-md p-4">
        {test.type === 'scheduled' && test.durationMinutes != null && (
          <View className="flex-row items-center gap-2">
            <Icon
              as={ClockIcon}
              weight="duotone"
              className="text-muted-foreground"
            />
            <Text variant="muted" className="text-sm">
              {test.durationMinutes} minutes after you start
            </Text>
          </View>
        )}
        {test.type === 'scheduled' && test.startsAt && test.endsAt && (
          <Text variant="muted" className="text-sm">
            Entry window: {format(test.startsAt, 'dd MMM, hh:mm a')} –{' '}
            {format(test.endsAt, 'dd MMM, hh:mm a')}
          </Text>
        )}
        {test.type === 'open' && (
          <Text variant="muted" className="text-sm">
            You can take this test anytime, and retake it after submitting.
          </Text>
        )}
        {typeof test.latestAttempt?.score === 'number' &&
          test.latestAttempt.status === 'submitted' && (
            <Text className="text-sm font-medium">
              Last score: {test.latestAttempt.score}
            </Text>
          )}
      </View>

      {action === 'upcoming' && (
        <StatusMessage text="This test has not started yet." />
      )}
      {action === 'closed' && (
        <StatusMessage text="The entry window for this test has closed." />
      )}
      {action === 'expired' && (
        <StatusMessage text="Time is up for this test." />
      )}
      {action === 'view-score' && (
        <StatusMessage text="You have already completed this test." />
      )}

      {showPrimary && (
        <Button
          className="rounded-full"
          disabled={starting}
          onPress={() => {
            if (action === 'subscribe') {
              router.push(`/(protected)/(subscribe)?channelId=${channelId}`)
              return
            }
            onStart()
          }}
        >
          {action === 'subscribe' ? (
            <Icon
              as={CrownIcon}
              weight="duotone"
              className="text-primary-foreground"
            />
          ) : null}
          <Text>{starting ? 'Starting...' : testActionLabel(action)}</Text>
        </Button>
      )}
    </ScrollView>
  )
}

function StatusMessage({ text }: { text: string }) {
  return (
    <View className="bg-accent/30 rounded-md p-4">
      <Text variant="muted" className="text-center text-sm">
        {text}
      </Text>
    </View>
  )
}
