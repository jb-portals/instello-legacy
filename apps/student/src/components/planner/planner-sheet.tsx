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
  const visibleRef = useRef(visible)
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? 'light']

  useEffect(() => {
    visibleRef.current = visible
    if (!visible) {
      ref.current?.dismiss()
      return
    }

    ref.current?.present()
    // present() is ignored while a previous close is still running.
    const retry = setTimeout(() => {
      if (visibleRef.current) ref.current?.present()
    }, 300)
    return () => clearTimeout(retry)
  }, [visible])

  const handleDismiss = useCallback(() => {
    visibleRef.current = false
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
