import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { StatusBar } from 'expo-status-bar'
import {
  CrownIcon,
  FilePdfIcon,
  LockLaminatedIcon,
} from 'phosphor-react-native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'
import { PdfViewer } from '@/components/pdf-viewer'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { trpc } from '@/utils/api'

type StudyMaterialFile = {
  id: string
  fileId: string
  name: string | null
  orderIndex: number | null
}

export default function StudyMaterialScreen() {
  usePreventScreenCapture()
  const { studyMaterialId } = useLocalSearchParams<{
    studyMaterialId: string
  }>()
  const theme = useColorScheme()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const { data, isPending, isError, error } = useQuery(
    trpc.lms.studyMaterial.getPublicById.queryOptions(
      { studyMaterialId: studyMaterialId ?? '' },
      { enabled: !!studyMaterialId },
    ),
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.title ?? 'Study material',
          headerShadowVisible: false,
        }}
      />
      <StatusBar style="auto" />

      {!studyMaterialId ? (
        <CenteredMessage
          title="Missing study material"
          description="Open this screen from a chapter to view a study material."
        />
      ) : isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={theme === 'dark' ? 'white' : 'black'}
          />
        </View>
      ) : isError ? (
        <CenteredMessage
          title="Unable to load"
          description={
            error instanceof Error ? error.message : 'Something went wrong'
          }
        />
      ) : !data ? (
        <CenteredMessage
          title="Not found"
          description="This study material could not be found."
        />
      ) : !data.canAccess ? (
        <LockedState channelId={data.channelId} />
      ) : (
        <ContentState
          description={data.description}
          files={data.files}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
        />
      )}
    </>
  )
}

function CenteredMessage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-6">
      <Text variant="large">{title}</Text>
      <Text variant="muted" className="text-center text-sm">
        {description}
      </Text>
    </View>
  )
}

function LockedState({ channelId }: { channelId: string }) {
  const router = useRouter()

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Icon
        as={LockLaminatedIcon}
        weight="duotone"
        className="text-muted-foreground size-12"
      />
      <Text variant="large" className="text-center">
        Subscribe to view
      </Text>
      <Text variant="muted" className="text-center text-sm">
        Study materials are available to subscribers of this channel.
      </Text>
      <Button
        className="rounded-full"
        onPress={() =>
          router.push(`/(protected)/(subscribe)?channelId=${channelId}`)
        }
      >
        <Icon
          as={CrownIcon}
          weight="duotone"
          className="text-primary-foreground"
        />
        <Text>Subscribe to View</Text>
      </Button>
    </View>
  )
}

function ContentState({
  description,
  files,
  selectedFileId,
  onSelectFile,
}: {
  description: string | null
  files: StudyMaterialFile[]
  selectedFileId: string | null
  onSelectFile: (fileId: string) => void
}) {
  const selectedFile =
    files.find((file) => file.fileId === selectedFileId) ?? files[0] ?? null

  return (
    <View className="flex-1">
      {(description || files.length > 1) && (
        <View className="border-border gap-2 border-b px-4 pb-3">
          {description ? (
            <Text variant="muted" numberOfLines={2} className="text-sm">
              {description}
            </Text>
          ) : null}

          {files.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pt-1"
            >
              {files.map((file) => {
                const isActive = file.fileId === selectedFile?.fileId
                return (
                  <Pressable
                    key={file.id}
                    onPress={() => onSelectFile(file.fileId)}
                    className={
                      isActive
                        ? 'bg-secondary flex-row items-center gap-1.5 rounded-full px-3 py-2'
                        : 'bg-accent/40 flex-row items-center gap-1.5 rounded-full px-3 py-2'
                    }
                  >
                    <Icon
                      as={FilePdfIcon}
                      weight="duotone"
                      className="text-muted-foreground size-4"
                    />
                    <Text
                      numberOfLines={1}
                      className={
                        isActive
                          ? 'max-w-40 text-xs font-medium'
                          : 'text-muted-foreground max-w-40 text-xs'
                      }
                    >
                      {file.name ?? `PDF ${(file.orderIndex ?? 0) + 1}`}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : null}
        </View>
      )}

      {selectedFile ? (
        <PdfViewer key={selectedFile.fileId} fileId={selectedFile.fileId} />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="muted">No files available.</Text>
        </View>
      )}
    </View>
  )
}
