import { useState } from 'react'
import { View } from 'react-native'
import { PlannerSheet } from '@/components/planner/planner-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'

export function CreatePlanSheet({
  visible,
  onDismiss,
  onSubmit,
}: {
  visible: boolean
  onDismiss: () => void
  onSubmit: (name: string, note: string) => void
}) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  function handleDismiss() {
    setName('')
    setNote('')
    onDismiss()
  }

  return (
    <PlannerSheet
      visible={visible}
      onDismiss={handleDismiss}
      title="New plan"
      snapPoints={['58%']}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Exam revision"
          />
        </View>
        <View className="gap-1.5">
          <Label>Note</Label>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="What is this plan for?"
            multiline
            className="h-20 py-2"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
        <Button
          disabled={name.trim().length === 0}
          onPress={() => {
            onSubmit(name, note)
            setName('')
            setNote('')
          }}
        >
          <Text>Create plan</Text>
        </Button>
      </View>
    </PlannerSheet>
  )
}
