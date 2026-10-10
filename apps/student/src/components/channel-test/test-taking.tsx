import { CheckCircleIcon, ClockIcon } from 'phosphor-react-native'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { type AttemptPayload, formatCountdown } from '@/lib/channel-test'
import { cn } from '@/lib/utils'

export function TestTaking({
  attempt,
  answers,
  onChangeAnswer,
  submitting,
  onSubmit,
  onExpire,
}: {
  attempt: AttemptPayload
  answers: Record<string, string>
  onChangeAnswer: (questionId: string, optionId: string) => void
  submitting: boolean
  onSubmit: () => void
  onExpire: () => void
}) {
  const { bottom } = useSafeAreaInsets()
  const remainingMs = useRemainingTime(attempt.expiresAt, onExpire)
  const answeredCount = Object.keys(answers).length
  const totalQuestions = attempt.questions.length
  const unanswered = totalQuestions - answeredCount

  function confirmSubmit() {
    Alert.alert(
      'Submit test?',
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. You cannot change answers after submitting.`
        : 'You cannot change answers after submitting.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: onSubmit },
      ],
    )
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4"
        showsVerticalScrollIndicator={false}
      >
        {attempt.questions.length === 0 ? (
          <View className="items-center justify-center gap-2 px-6 py-16">
            <Text variant="large">No questions</Text>
            <Text variant="muted" className="text-center text-sm">
              This test does not have any questions yet.
            </Text>
          </View>
        ) : (
          attempt.questions.map((question, index) => (
            <View
              key={question.id}
              className="bg-accent/30 gap-3 rounded-md p-4"
            >
              <Text variant="muted" className="text-xs">
                Question {index + 1} of {totalQuestions}
              </Text>
              <Text className="text-base font-medium">{question.title}</Text>
              <View className="gap-2">
                {question.channelTestOptions.map((option) => {
                  const selected = answers[question.id] === option.id
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => onChangeAnswer(question.id, option.id)}
                      className={cn(
                        'flex-row items-center gap-3 rounded-md border p-3',
                        selected
                          ? 'border-foreground bg-background'
                          : 'border-border/50 bg-background/40',
                      )}
                    >
                      <Icon
                        as={CheckCircleIcon}
                        weight={selected ? 'fill' : 'regular'}
                        className={
                          selected ? 'text-foreground' : 'text-muted-foreground'
                        }
                      />
                      <Text className="flex-1 text-sm">{option.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View
        className="border-border gap-2 border-t px-4 pt-3"
        style={{ paddingBottom: bottom + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <Text variant="muted" className="text-sm">
            {answeredCount}/{totalQuestions} answered
          </Text>
          {remainingMs != null && (
            <View className="flex-row items-center gap-1.5">
              <Icon
                as={ClockIcon}
                weight="duotone"
                className="text-muted-foreground"
              />
              <Text
                className={
                  remainingMs <= 60_000
                    ? 'text-destructive text-sm font-medium'
                    : 'text-sm font-medium'
                }
              >
                {formatCountdown(remainingMs)}
              </Text>
            </View>
          )}
        </View>
        <Button
          className="rounded-full"
          disabled={submitting || totalQuestions === 0}
          onPress={confirmSubmit}
        >
          <Text>{submitting ? 'Submitting...' : 'Submit'}</Text>
        </Button>
      </View>
    </View>
  )
}

function useRemainingTime(
  expiresAt: Date | string | null,
  onExpire: () => void,
) {
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : null,
  )
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const didExpireRef = useRef(false)

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(null)
      return
    }

    didExpireRef.current = false

    const tick = () => {
      const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now())
      setRemainingMs(ms)
      if (ms <= 0 && !didExpireRef.current) {
        didExpireRef.current = true
        onExpireRef.current()
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [expiresAt])

  return remainingMs
}
