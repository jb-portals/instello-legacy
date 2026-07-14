import { Image } from 'expo-image'
import { Stack, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

export default function GetStarted() {
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-between gap-6 px-6 py-8">
        <Image
          source={require('@/assets/images/instello.png')}
          style={{ height: 80, width: 140 }}
          contentFit="contain"
          transition={200}
          useAppleWebpCodec
          importantForAccessibility="yes"
        />

        <View className="bg-accent border-border size-32 items-center justify-center rounded-2xl border shadow-lg">
          <Image
            source={require('@/assets/images/instello-feather.png')}
            style={{ height: 100, width: 100 }}
            contentFit="contain"
            transition={200}
            useAppleWebpCodec
            importantForAccessibility="yes"
          />
        </View>

        <View className="gap-3.5">
          <Text variant={'h1'} className="max-w-sm text-center font-medium">
            One Platform. Every Possibility.
          </Text>
          <Text variant={'lead'} className="text-center">
            Learn anywhere. Teach better. Manage with ease.
          </Text>
        </View>

        <View className="w-full gap-3.5">
          <Text variant={'muted'} className="text-center">
            by continuing you'll accept all our terms and conditions
          </Text>
          <Button
            className="w-full"
            onPress={() => router.push('/(auth)/sign-up')}
            size={'lg'}
          >
            <Text>Get Started</Text>
          </Button>
          <Button
            className="w-full"
            onPress={() => router.push('/(auth)/sign-in')}
            variant={'secondary'}
            size={'lg'}
          >
            <Text>Sign in</Text>
          </Button>
        </View>
      </View>
    </>
  )
}
