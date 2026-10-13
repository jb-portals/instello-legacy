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
  // dismiss() on a modal that was never presented sticks gorhom in
  // DISMISSING, and the portal then refuses to render the next present().
  const opened = useRef(false)
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? 'light']

  useEffect(() => {
    if (visible) {
      opened.current = true
      ref.current?.present()
      return
    }
    if (!opened.current) return
    opened.current = false
    ref.current?.dismiss()
  }, [visible])

  const handleDismiss = useCallback(() => {
    opened.current = false
    onDismiss()
  }, [onDismiss])

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
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
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
