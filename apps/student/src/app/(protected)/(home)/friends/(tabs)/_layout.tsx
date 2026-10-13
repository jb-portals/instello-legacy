import { TopTabs } from 'expo-router/js-top-tabs'
import { useColorScheme } from 'react-native'
import { THEME } from '@/lib/theme'

export default function CombineStudyTabs() {
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? 'light']

  return (
    <TopTabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarPressColor: colors.muted,
        sceneStyle: { backgroundColor: colors.background },
        tabBarIndicatorStyle: {
          backgroundColor: colors.foreground,
          height: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: 'MontserratMedium',
          fontSize: 14,
          textTransform: 'none',
        },
      }}
    >
      <TopTabs.Screen name="index" options={{ title: 'Groups' }} />
      <TopTabs.Screen name="requests" options={{ title: 'Requests' }} />
    </TopTabs>
  )
}
