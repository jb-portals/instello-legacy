import { ChannelTestQuestions } from '@/components/channel-test-questions'
import { ChannelTestForm } from '@/components/forms/channel-test-form'

export default function Page() {
  return (
    <div className="space-y-10">
      <ChannelTestForm />
      <ChannelTestQuestions />
    </div>
  )
}
