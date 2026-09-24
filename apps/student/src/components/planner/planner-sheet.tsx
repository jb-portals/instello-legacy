import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useColorScheme, View } from 'react-native'
import { Text } from '@/components/ui/text'
import { THEME } from '@/lib/theme'

export function PlannerSheet({
  visible,
  onDismiss,
  title,
  snapPoints = ['88%'],
  children,
}: {
  visible: boolean
  onDismiss: () => void
  title: string
  snapPoints?: string[]
  children: ReactNode
}) {
  const ref = useRef<BottomSheetModal>(null)
  const presented = useRef(false)
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? 'light']

  useEffect(() => {
    if (visible) {
      presented.current = true
      ref.current?.present()
      return
    }

    if (!presented.current) return
    presented.current = false
    ref.current?.dismiss()
  }, [visible])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  )

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: colors.popover,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
    >
      <View className="px-5 pb-3">
        <Text variant="large">{title}</Text>
      </View>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
}
