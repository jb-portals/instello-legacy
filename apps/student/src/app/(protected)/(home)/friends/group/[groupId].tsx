import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { GroupHub } from '@/components/friends/group-hub'
import { Text } from '@/components/ui/text'

export default function StudyGroupScreen() {
  const params = useLocalSearchParams<{ groupId: string }>()
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId

  if (!groupId) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text variant="muted">Study group not found.</Text>
      </View>
    )
  }

  return <GroupHub groupId={groupId} />
}
