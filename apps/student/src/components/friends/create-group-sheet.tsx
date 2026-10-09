import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'

export function CreateGroupSheet({
  visible,
  saving = false,
  onDismiss,
  onSubmit,
}: {
  visible: boolean
  saving?: boolean
  onDismiss: () => void
  onSubmit: (name: string, note: string) => void
}) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!visible) {
      setName('')
      setNote('')
    }
  }, [visible])

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={() => {
        if (!saving) onDismiss()
      }}
      title="New study group"
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
            placeholder="What are you studying together?"
            multiline
            className="h-20 py-2"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
        <Button
          disabled={name.trim().length === 0 || saving}
          onPress={() => onSubmit(name.trim(), note.trim())}
        >
          <Text>Create group</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
