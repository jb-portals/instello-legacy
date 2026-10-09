import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'

export function PlanSheet({
  visible,
  title,
  submitLabel,
  initialName = '',
  initialNote = '',
  saving = false,
  onDismiss,
  onSubmit,
}: {
  visible: boolean
  title: string
  submitLabel: string
  initialName?: string
  initialNote?: string
  saving?: boolean
  onDismiss: () => void
  onSubmit: (name: string, note: string) => void
}) {
  const [name, setName] = useState(initialName)
  const [note, setNote] = useState(initialNote)

  useEffect(() => {
    if (visible) {
      setName(initialName)
      setNote(initialNote)
    }
  }, [visible, initialName, initialNote])

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={() => {
        if (!saving) onDismiss()
      }}
      title={title}
      snapPoints={['58%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Spring Boot Study"
          />
        </View>
        <View className="gap-1.5">
          <Label>Note</Label>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="What this plan covers"
            multiline
            className="h-20 py-2"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
        <Button
          disabled={name.trim().length === 0 || saving}
          onPress={() => onSubmit(name.trim(), note.trim())}
        >
          <Text>{submitLabel}</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
