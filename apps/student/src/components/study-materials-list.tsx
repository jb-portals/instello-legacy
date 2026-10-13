import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { type Href, Link, useLocalSearchParams } from 'expo-router'
import { FilePdfIcon, LockLaminatedIcon } from 'phosphor-react-native'
import type { ReactElement } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native'
import { ChapterButton } from '@/components/channel-lessons-list'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useChannelScreenData } from '@/hooks/useChannelScreenData'
import { trpc } from '@/utils/api'
import { Badge } from './ui/badge'
import { Card, CardFooter, CardHeader, CardTitle } from './ui/card'

export function StudyMaterialsList({
  ListHeaderComponent,
}: {
  ListHeaderComponent?: ReactElement
} = {}) {
  const { channelId, chapterId } = useLocalSearchParams() as {
    channelId: string
    chapterId: string
  }
  const { chaptersQuery } = useChannelScreenData(channelId)
  const materialsQuery = useQuery(
    trpc.lms.studyMaterial.listPublicByChapterId.queryOptions({ chapterId }),
  )

  const materials = materialsQuery.data ?? []

  return (
    <FlashList
      data={materials}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {ListHeaderComponent}
          <View className="px-4 py-3">
            <ChapterButton chaptersQuery={chaptersQuery} />
          </View>
        </>
      }
      refreshControl={
        <RefreshControl
          onRefresh={() => materialsQuery.refetch()}
          refreshing={materialsQuery.isRefetching}
        />
      }
      ListEmptyComponent={
        materialsQuery.isLoading ? (
          <View className="px-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={`skeleton-${index + 1}`} className="mb-2.5">
                <View className="bg-accent/40 flex-row gap-2 rounded-md p-2">
                  <Skeleton
                    className="size-14 rounded-md"
                    style={{ height: 56, width: 56, borderRadius: 8 }}
                  />
                  <View className="flex-1 justify-center gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="px-4 py-6">
            <View className="bg-accent/30 items-center justify-center rounded-md p-6">
              <Text variant="large" className="mb-1 text-base font-medium">
                No study materials yet
              </Text>
              <Text
                variant="muted"
                className="text-muted-foreground text-center text-sm"
              >
                Study materials will appear here when this chapter adds PDFs.
              </Text>
            </View>
          </View>
        )
      }
      ListFooterComponent={
        <View className="items-center justify-center py-8">
          {materialsQuery.isFetching && !materialsQuery.isRefetching && (
            <ActivityIndicator style={{ marginBottom: 16 }} size={'small'} />
          )}
          <Text variant={'muted'} className="text-xs">
            © All rights reserved to this channel
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View className="h-2.5 w-full" />}
      renderItem={({ item }) => (
        <Link
          asChild
          href={`/study-material?studyMaterialId=${item.id}` as unknown as Href}
          disabled={!item.canAccess}
        >
          <TouchableOpacity
            disabled={!item.canAccess}
            style={{ paddingHorizontal: 16 }}
          >
            <Card className="bg-accent/40 flex-row items-center gap-2 p-2">
              <View className="bg-accent items-center justify-center rounded-md border border-border/15 p-3">
                <Icon
                  as={FilePdfIcon}
                  weight="duotone"
                  className="text-muted-foreground size-6"
                />
              </View>
              <CardHeader className="flex-1 justify-center pl-0">
                <CardTitle
                  numberOfLines={2}
                  className="w-full text-sm font-medium"
                >
                  {item.title}
                </CardTitle>
                <View className="flex-row items-center gap-1.5">
                  <Badge variant={'secondary'}>
                    <Text className="text-xs">
                      {item.canAccess
                        ? `${item.files.length} ${item.files.length === 1 ? 'file' : 'files'}`
                        : 'PDF'}
                    </Text>
                  </Badge>
                  {item.description ? (
                    <Text
                      variant={'muted'}
                      numberOfLines={1}
                      className="text-muted-foreground flex-1 text-xs"
                    >
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </CardHeader>
              <CardFooter className="p-0">
                {!item.canAccess && (
                  <View className="p-4">
                    <Icon
                      weight="duotone"
                      as={LockLaminatedIcon}
                      className="text-muted-foreground"
                    />
                  </View>
                )}
              </CardFooter>
            </Card>
          </TouchableOpacity>
        </Link>
      )}
    />
  )
}
