import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Text } from '@/components/ui/text'
import { displayName, nameInitial } from '@/lib/friends'

export function PersonRow({
  profile,
  detail,
  onPress,
  trailing,
}: {
  profile: {
    fullName?: string | null
    firstName?: string | null
    lastName?: string | null
    emailAddress?: string | null
    imageUrl?: string | null
  }
  detail?: string | null
  onPress?: () => void
  trailing?: ReactNode
}) {
  const name = displayName(profile)
  const body = (
    <>
      <Avatar alt={name} className="size-10">
        {profile.imageUrl ? (
          <AvatarImage source={{ uri: profile.imageUrl }} />
        ) : null}
        <AvatarFallback>
          <Text className="font-semibold">{nameInitial(name)}</Text>
        </AvatarFallback>
      </Avatar>
      <View className="min-w-0 flex-1">
        <Text className="font-[MontserratMedium]" numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text variant="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  )

  if (!onPress) {
    return <View className="flex-row items-center gap-3 py-2">{body}</View>
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 py-2"
    >
      {body}
    </Pressable>
  )
}
