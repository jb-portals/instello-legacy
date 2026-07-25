import { useAuth } from '@clerk/clerk-expo'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Image } from 'expo-image'
import { Link, Stack } from 'expo-router'
import {
  BrowserIcon,
  DeviceMobileIcon,
  DevicesIcon,
  QuestionIcon,
} from 'phosphor-react-native'
import { TouchableOpacity, View } from 'react-native'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { useDeviceLimit } from '@/hooks/useDeviceLimit'

export default function ProtectedLayout() {
  const { sessionClaims } = useAuth()
  const { blocked, signOutOtherDevices, loading, otherSessions } =
    useDeviceLimit()

  return (
    <BottomSheetModalProvider>
      <View className="flex-1">
        {blocked ? (
          <View className="flex-1 items-center justify-center gap-6 p-4">
            <Image
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
              source={require('@/assets/images/instello.png')}
              style={{ height: 28, width: 128, aspectRatio: 'auto' }}
            />
            <Card>
              <CardContent className="items-center justify-center py-2">
                <Icon
                  as={DevicesIcon}
                  mirrored
                  weight="duotone"
                  className="text-primary"
                  size={100}
                />
              </CardContent>
              <CardHeader className="items-center">
                <CardTitle className="text-center">
                  Device Limit Reached
                </CardTitle>
                <CardDescription className="text-center">
                  There are multiple sessions detected with this email address.
                  Only one session at a time is allowed, so please sign out from
                  other devices to continue.
                </CardDescription>
              </CardHeader>

              <CardFooter className="flex-col gap-2.5">
                <View className="w-full">
                  {otherSessions.map((session) => (
                    <View
                      key={session.id}
                      className="border-border w-full flex-row items-center gap-3.5 rounded-sm border p-4"
                    >
                      <Icon
                        size={32}
                        weight="thin"
                        className="text-muted-foreground"
                        as={
                          session.latestActivity.isMobile
                            ? DeviceMobileIcon
                            : BrowserIcon
                        }
                      />
                      <View>
                        <Text variant={'small'}>
                          {session.latestActivity.deviceType}{' '}
                          {session.latestActivity.browserName}
                        </Text>
                        <Text
                          variant={'muted'}
                          className="text-muted-foreground text-xs"
                        >
                          {session.latestActivity.city},{' '}
                          {session.latestActivity.country}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Button
                  onPressIn={() => signOutOtherDevices()}
                  size={'lg'}
                  className="w-full"
                >
                  <Text className="font-[MontserratBold] font-bold">
                    {loading
                      ? 'Signing out...'
                      : `Sign out from (${otherSessions.length}) devices`}
                  </Text>
                </Button>
              </CardFooter>
            </Card>
          </View>
        ) : (
          <Stack>
            {/** Screens only shown when the user is NOT completed the onboarding process */}
            <Stack.Protected
              guard={!sessionClaims?.metadata?.onBoardingCompleted}
            >
              <Stack.Screen
                name="(onboarding)"
                options={{ headerShown: false }}
              />
            </Stack.Protected>

            {/** Screens only shown when the user Is completed the onboarding process */}
            <Stack.Protected
              guard={!!sessionClaims?.metadata?.onBoardingCompleted}
            >
              <Stack.Screen name="(home)" options={{ headerShown: false }} />
              <Stack.Screen
                name="profile"
                options={{
                  title: 'My Profile',
                  headerTitleAlign: 'center',
                  headerShadowVisible: false,
                  headerRight(props) {
                    return (
                      <Link {...props} href={'/help'} asChild>
                        <TouchableOpacity>
                          <View className="flex-row items-center  gap-1">
                            <Icon as={QuestionIcon} />
                            <Text className="text-sm">Help</Text>
                          </View>
                        </TouchableOpacity>
                      </Link>
                    )
                  },
                }}
              />
              <Stack.Screen name="channel" options={{ headerShown: false }} />
              <Stack.Screen
                name="(subscribe)/index"
                options={{
                  presentation: 'modal',
                  title: 'Subscribe Now',
                  headerTitleAlign: 'center',
                }}
              />
              <Stack.Screen
                name="(subscribe)/apply-coupon"
                options={{
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="(subscribe)/coupon-success"
                options={{
                  title: '',
                }}
              />
              <Stack.Screen
                name="video"
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                  gestureDirection: 'vertical',
                }}
              />
              <Stack.Screen
                name="study-material"
                options={{
                  title: 'Study material',
                  headerShadowVisible: false,
                }}
              />
            </Stack.Protected>
          </Stack>
        )}
      </View>
    </BottomSheetModalProvider>
  )
}
