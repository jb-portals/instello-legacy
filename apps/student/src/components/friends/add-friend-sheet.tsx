import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { displayName, isLikelyEmail } from '@/lib/friends'
import { trpc } from '@/utils/api'

export function AddFriendSheet({
  visible,
  onDismiss,
}: {
  visible: boolean
  onDismiss: () => void
}) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [lookup, setLookup] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const search = useQuery(
    trpc.lms.friend.search.queryOptions(
      { email: lookup ?? 'student@example.com' },
      { enabled: lookup !== null },
    ),
  )

  async function refresh() {
    await queryClient.invalidateQueries(trpc.lms.friend.list.pathFilter())
    await queryClient.invalidateQueries(trpc.lms.friend.search.pathFilter())
  }

  const sendRequest = useMutation(
    trpc.lms.friend.sendRequest.mutationOptions({
      onSuccess: () => refresh(),
      onError(error) {
        Alert.alert('Unable to send request', error.message)
      },
    }),
  )
  const acceptRequest = useMutation(
    trpc.lms.friend.respond.mutationOptions({
      onSuccess: () => refresh(),
      onError(error) {
        Alert.alert('Unable to accept request', error.message)
      },
    }),
  )

  useEffect(() => {
    if (!visible) {
      setEmail('')
      setLookup(null)
      setLocalError(null)
    }
  }, [visible])

  const result = lookup ? search.data : undefined
  const busy =
    sendRequest.isPending || acceptRequest.isPending || search.isFetching

  function searchEmail() {
    const next = email.trim().toLowerCase()
    if (!isLikelyEmail(next)) {
      setLookup(null)
      setLocalError('Enter a valid email')
      return
    }
    setLocalError(null)
    setLookup(next)
  }

  let actionLabel = ''
  let actionDisabled = false
  let onAction: () => void = () => undefined
  if (result) {
    const friendship = result.friendship
    if (!friendship || friendship.status === 'declined') {
      actionLabel = 'Send request'
      onAction = () =>
        sendRequest.mutate({ clerkUserId: result.profile.clerkUserId })
    } else if (friendship.status === 'pending' && friendship.incoming) {
      actionLabel = 'Accept request'
      onAction = () =>
        acceptRequest.mutate({
          friendshipId: friendship.id,
          action: 'accept',
        })
    } else if (friendship.status === 'pending') {
      actionLabel = 'Request sent'
      actionDisabled = true
    } else {
      actionLabel = 'Already friends'
      actionDisabled = true
    }
  }

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Add friend"
      snapPoints={['62%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="name@college.edu"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onSubmitEditing={searchEmail}
          />
        </View>
        <Button variant="outline" onPress={searchEmail} disabled={busy}>
          <Text>Find student</Text>
        </Button>
        {localError ? <Text variant="muted">{localError}</Text> : null}
        {lookup && search.isError ? (
          <Text variant="muted">{search.error.message}</Text>
        ) : null}
        {result ? (
          <View className="border-border gap-3 rounded-xl border p-4">
            <Text className="font-[MontserratMedium]">
              {displayName(result.profile)}
            </Text>
            {result.profile.emailAddress ? (
              <Text variant="muted">{result.profile.emailAddress}</Text>
            ) : null}
            <Button disabled={actionDisabled || busy} onPress={onAction}>
              <Text>{actionLabel}</Text>
            </Button>
          </View>
        ) : null}
      </View>
    </PlannerSheet>
  )
}
