import type { ReactElement } from 'react'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  ChannelDetailsSection,
  VideosList,
} from '@/components/channel-lessons-list'
import { StudyMaterialsList } from '@/components/study-materials-list'
import { Text } from '@/components/ui/text'

const TABS = [
  { id: 'videos', label: 'Videos' },
  { id: 'materials', label: 'Study materials' },
  { id: 'tests', label: 'Tests' },
] as const

type ChannelTab = (typeof TABS)[number]['id']

export function ChannelTabs() {
  const [tab, setTab] = useState<ChannelTab>('videos')

  const header = (
    <>
      <ChannelDetailsSection />
      <TabBar activeTab={tab} onChange={setTab} />
    </>
  )

  if (tab === 'materials') {
    return (
      <View className="flex-1 bg-background">
        <StudyMaterialsList ListHeaderComponent={header} />
      </View>
    )
  }

  if (tab === 'tests') {
    return (
      <View className="flex-1 bg-background">
        <TestsPlaceholder ListHeaderComponent={header} />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <VideosList ListHeaderComponent={header} />
    </View>
  )
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: ChannelTab
  onChange: (tab: ChannelTab) => void
}) {
  return (
    <View className="flex-row border-b border-border">
      {TABS.map((item) => {
        const focused = activeTab === item.id
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => onChange(item.id)}
            className="flex-1 items-center justify-center px-1 py-3"
          >
            <Text
              numberOfLines={1}
              className={
                focused
                  ? 'text-foreground text-sm font-medium'
                  : 'text-muted-foreground text-sm'
              }
            >
              {item.label}
            </Text>
            {focused ? (
              <View className="bg-foreground absolute bottom-0 left-0 right-0 h-0.5" />
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

function TestsPlaceholder({
  ListHeaderComponent,
}: {
  ListHeaderComponent: ReactElement
}) {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {ListHeaderComponent}
      <View className="items-center justify-center px-4 py-16">
        <Text>Channel Tests</Text>
      </View>
    </ScrollView>
  )
}
