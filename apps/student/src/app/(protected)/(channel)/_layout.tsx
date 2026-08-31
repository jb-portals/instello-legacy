import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs'
import type {
  ParamListBase,
  TabNavigationState,
} from '@react-navigation/native'
import { Stack, withLayoutContext } from 'expo-router'
import { View } from 'react-native'
import { ChannelDetailsSection } from '@/components/channel-lessons-list'

const { Navigator } = createMaterialTopTabNavigator()
const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator)

export default function ChannelLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1">
        <ChannelDetailsSection />
        <MaterialTopTabs>
          <MaterialTopTabs.Screen name="index" options={{ title: 'Videos' }} />
          <MaterialTopTabs.Screen name="tests" options={{ title: 'Tests' }} />
        </MaterialTopTabs>
      </View>
    </>
  )
}
