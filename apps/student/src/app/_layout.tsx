import '../global.css'

import { ClerkProvider, useAuth, useClerk, useSession } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { focusManager, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { PostHogProvider } from 'posthog-react-native'
import * as React from 'react'
import { AppState, Platform, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NAV_THEME } from '@/lib/theme'
import { queryClient } from '@/utils/api'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export default function RootLayout() {
  const colorScheme = useColorScheme()

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PostHogProvider
          apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
          options={{
            disabled: process.env.NODE_ENV !== 'production',
            host: 'https://eu.i.posthog.com',
            enableSessionReplay: true,
            defaultOptIn: true,
            errorTracking: {
              autocapture: {
                console: ['error', 'warn'],
                unhandledRejections: true,
                uncaughtExceptions: true,
              },
            },
          }}
        >
          <ClerkProvider
            polling
            touchSession
            publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
            tokenCache={tokenCache}
          >
            <QueryClientProvider client={queryClient}>
              <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <Routes />
                <PortalHost />
              </ThemeProvider>
            </QueryClientProvider>
          </ClerkProvider>
        </PostHogProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

void SplashScreen.preventAutoHideAsync()

function Routes() {
  const { isSignedIn, isLoaded } = useAuth()
  const { session } = useSession()
  const { setActive } = useClerk()
  const [fontLoaded, error] = useFonts({
    MontserratRegular: require('@/assets/fonts/Montserrat-Regular.ttf'),
    MontserratMedium: require('@/assets/fonts/Montserrat-Medium.ttf'),
    MontserratSemiBold: require('@/assets/fonts/Montserrat-SemiBold.ttf'),
    MontserratBold: require('@/assets/fonts/Montserrat-Bold.ttf'),
    MontserratExtraBold: require('@/assets/fonts/Montserrat-ExtraBold.ttf'),
    MontserratBlack: require('@/assets/fonts/Montserrat-Black.ttf'),
  })

  const isResolvingOrgTask =
    session?.status === 'pending' &&
    session.currentTask?.key === 'choose-organization'

  React.useEffect(() => {
    if (isLoaded && fontLoaded) {
      void SplashScreen.hideAsync()
    }
  }, [isLoaded, fontLoaded])

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(state === 'active')
      }
    })

    return () => subscription.remove()
  }, [])

  // Resolve stuck pending sessions (e.g. after a previous login attempt)
  const pendingSessionId = isResolvingOrgTask ? session.id : null
  React.useEffect(() => {
    if (!isLoaded || !session || !setActive || !pendingSessionId) return
  }, [isLoaded, session, setActive, pendingSessionId])

  if (!isLoaded || error || isResolvingOrgTask) {
    console.log(error)
    return null
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'MontserratSemiBold' },
      }}
    >
      {/* Screens only shown when the user is NOT signed in */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen
          name="(auth)/index"
          options={DEFAULT_AUTH_SCREEN_OPTIONS}
        />
        <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
        <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />
        <Stack.Screen
          name="(auth)/reset-password"
          options={DEFAULT_AUTH_SCREEN_OPTIONS}
        />
        <Stack.Screen
          name="(auth)/forgot-password"
          options={DEFAULT_AUTH_SCREEN_OPTIONS}
        />
      </Stack.Protected>

      {/* Screens only shown when the user IS signed in */}
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Screens outside the guards are accessible to everyone (e.g. not found) */}
    </Stack>
  )
}

const SIGN_IN_SCREEN_OPTIONS = {
  presentation: 'modal',
  title: '',
  headerTransparent: true,
  gestureEnabled: false,
} as const

const SIGN_UP_SCREEN_OPTIONS = {
  presentation: 'modal',
  title: '',
  headerTransparent: true,
  gestureEnabled: false,
} as const

const DEFAULT_AUTH_SCREEN_OPTIONS = {
  title: '',
  headerShadowVisible: false,
  headerTransparent: true,
}
