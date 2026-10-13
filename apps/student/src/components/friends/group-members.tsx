import { useUser } from '@clerk/clerk-expo'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native'
import { InviteSheet } from '@/components/friends/invite-sheet'
import { PersonRow } from '@/components/friends/person-row'
import { groupAlert, useStudyGroup } from '@/components/friends/use-study-group'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { displayName, invalidateGroup } from '@/lib/friends'
import { trpc } from '@/utils/api'

export function GroupMembers() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const { groupId, query } = useStudyGroup()
  const data = query.data?.access === 'active' ? query.data : null
  const [inviting, setInviting] = useState(false)

  const invite = useMutation(
    trpc.lms.studyGroup.invite.mutationOptions({
      onSuccess: () => invalidateGroup(queryClient),
      onError: groupAlert('Unable to invite'),
    }),
  )
  const removeMember = useMutation(
    trpc.lms.studyGroup.removeMember.mutationOptions({
      onSuccess: () => invalidateGroup(queryClient),
      onError: groupAlert('Unable to remove member'),
    }),
  )

  if (!data || !groupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch()
            }}
          />
        }
      >
        <Button onPress={() => setInviting(true)}>
          <Text>Invite</Text>
        </Button>
        {data.members.map((member) => (
          <PersonRow
            key={member.clerkUserId}
            profile={member.profile}
            detail={member.profile.emailAddress}
            trailing={
              <View className="flex-row items-center gap-2">
                {member.role === 'owner' ? (
                  <Badge variant="secondary">
                    <Text>Owner</Text>
                  </Badge>
                ) : null}
                {member.status === 'invited' ? (
                  <Badge variant="outline">
                    <Text>Invited</Text>
                  </Badge>
                ) : null}
                {data.myRole === 'owner' && member.clerkUserId !== user?.id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={removeMember.isPending}
                    onPress={() =>
                      Alert.alert(
                        'Remove member',
                        `Remove ${displayName(member.profile)} from the group?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () =>
                              removeMember.mutate({
                                groupId,
                                clerkUserId: member.clerkUserId,
                              }),
                          },
                        ],
                      )
                    }
                  >
                    <Text>Remove</Text>
                  </Button>
                ) : null}
              </View>
            }
          />
        ))}
      </ScrollView>
      <InviteSheet
        visible={inviting}
        memberIds={data.members.map((member) => member.clerkUserId)}
        savingId={invite.isPending ? invite.variables?.clerkUserId : null}
        onDismiss={() => setInviting(false)}
        onInvite={(clerkUserId) => invite.mutate({ groupId, clerkUserId })}
      />
    </View>
  )
}
