import type { NavigationAction } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, useColorScheme, View } from 'react-native'
import { TestIntro } from '@/components/channel-test/test-intro'
import {
  TestExpired,
  TestResults,
} from '@/components/channel-test/test-results'
import { TestTaking } from '@/components/channel-test/test-taking'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import {
  type AttemptPayload,
  getTestAction,
  type PublicChannelTest,
  type SubmitResult,
} from '@/lib/channel-test'
import { trpc } from '@/utils/api'

type Phase = 'intro' | 'taking' | 'results' | 'expired'

export default function ChannelTestScreen() {
  usePreventScreenCapture()
  const { channelId, testId } = useLocalSearchParams<{
    channelId: string
    testId: string
  }>()
  const theme = useColorScheme()
  const navigation = useNavigation()
  const queryClient = useQueryClient()

  const testsQuery = useQuery(
    trpc.lms.channelTest.listPublic.queryOptions(
      { channelId: channelId ?? '' },
      { enabled: !!channelId },
    ),
  )

  const test = testsQuery.data?.find((item) => item.id === testId)

  const [phase, setPhase] = useState<Phase>('intro')
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [continuing, setContinuing] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const pendingLeaveAction = useRef<NavigationAction | null>(null)
  const isTakingRef = useRef(false)
  isTakingRef.current = phase === 'taking'

  function stayInTest() {
    pendingLeaveAction.current = null
    setLeaveOpen(false)
  }

  function leaveTest() {
    const action = pendingLeaveAction.current
    pendingLeaveAction.current = null
    setLeaveOpen(false)
    isTakingRef.current = false
    if (action) navigation.dispatch(action)
  }

  function enterTaking(data: AttemptPayload) {
    setAttempt(data)
    setAnswers({})
    setResult(null)
    setPhase('taking')
  }

  const startMutation = useMutation(
    trpc.lms.channelTest.start.mutationOptions({
      onSuccess(data) {
        enterTaking(data)
      },
      onError(error) {
        Alert.alert('Unable to start', error.message)
        void testsQuery.refetch()
      },
    }),
  )

  const submitMutation = useMutation(
    trpc.lms.channelTest.submit.mutationOptions({
      async onSuccess(data) {
        setResult(data)
        setPhase('results')
        await queryClient.invalidateQueries(
          trpc.lms.channelTest.listPublic.queryFilter({
            channelId: channelId ?? '',
          }),
        )
      },
      onError(error) {
        if (error.message.toLowerCase().includes('time is up')) {
          setPhase('expired')
          void queryClient.invalidateQueries(
            trpc.lms.channelTest.listPublic.queryFilter({
              channelId: channelId ?? '',
            }),
          )
          return
        }

        Alert.alert('Unable to submit', error.message)
      },
    }),
  )

  const submitAnswers = useCallback(
    (currentAnswers: Record<string, string>, attemptId: string) => {
      if (submitMutation.isPending) return

      submitMutation.mutate({
        attemptId,
        answers: Object.entries(currentAnswers).map(
          ([questionId, optionId]) => ({
            questionId,
            optionId,
          }),
        ),
      })
    },
    [submitMutation],
  )

  async function beginAttempt(currentTest: PublicChannelTest) {
    const action = getTestAction(currentTest)

    if (action === 'continue' && currentTest.latestAttempt?.id) {
      setContinuing(true)
      try {
        const data = await queryClient.fetchQuery(
          trpc.lms.channelTest.getAttempt.queryOptions({
            attemptId: currentTest.latestAttempt.id,
          }),
        )

        if (data.status === 'expired') {
          setPhase('expired')
          await testsQuery.refetch()
          return
        }

        if (data.status === 'in_progress') {
          enterTaking(data)
          return
        }

        await testsQuery.refetch()
        return
      } catch (error) {
        Alert.alert(
          'Unable to continue',
          error instanceof Error ? error.message : 'Something went wrong',
        )
        void testsQuery.refetch()
        return
      } finally {
        setContinuing(false)
      }
    }

    startMutation.mutate({ channelTestId: currentTest.id })
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isTakingRef.current) return

      e.preventDefault()
      pendingLeaveAction.current = e.data.action
      setLeaveOpen(true)
    })

    return unsubscribe
  }, [navigation])

  return (
    <>
      <Stack.Screen
        options={{
          title: test?.title ?? 'Test',
          headerShadowVisible: false,
        }}
      />
      <StatusBar style="auto" />

      {!channelId || !testId ? (
        <CenteredMessage
          title="Missing test"
          description="Open this screen from a channel to take a test."
        />
      ) : testsQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={theme === 'dark' ? 'white' : 'black'}
          />
        </View>
      ) : testsQuery.isError ? (
        <CenteredMessage
          title="Unable to load"
          description={testsQuery.error.message}
        />
      ) : !test ? (
        <CenteredMessage
          title="Not found"
          description="This test could not be found or is no longer published."
        />
      ) : phase === 'taking' && attempt ? (
        <TestTaking
          attempt={attempt}
          answers={answers}
          onChangeAnswer={(questionId, optionId) =>
            setAnswers((current) => ({ ...current, [questionId]: optionId }))
          }
          submitting={submitMutation.isPending}
          onSubmit={() => submitAnswers(answers, attempt.id)}
          onExpire={() => submitAnswers(answers, attempt.id)}
        />
      ) : phase === 'results' && result ? (
        <TestResults
          result={result}
          test={test}
          retaking={startMutation.isPending}
          onRetake={() => startMutation.mutate({ channelTestId: test.id })}
        />
      ) : phase === 'expired' ? (
        <TestExpired />
      ) : (
        <TestIntro
          test={test}
          channelId={channelId}
          starting={startMutation.isPending || continuing}
          onStart={() => {
            void beginAttempt(test)
          }}
        />
      )}

      <Dialog
        open={leaveOpen}
        onOpenChange={(open) => {
          if (!open) stayInTest()
        }}
      >
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Leave test?</DialogTitle>
            <DialogDescription>
              Your timer will keep running. You can continue later from this
              test.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onPress={stayInTest}>
              <Text>Stay</Text>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onPress={leaveTest}
            >
              <Text>Leave</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CenteredMessage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-6">
      <Text variant="large">{title}</Text>
      <Text variant="muted" className="text-center text-sm">
        {description}
      </Text>
    </View>
  )
}
