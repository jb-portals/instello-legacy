'use client'

import { Badge } from '@instello/ui/components/badge'
import { Button } from '@instello/ui/components/button'
import { Card, CardContent } from '@instello/ui/components/card'
import { CheckCircleIcon, ExamIcon, PlusIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { AddChannelTestQuestionDialog } from '@/components/dialogs/add-channel-test-question-dialog'
import { useTRPC } from '@/trpc/react'

export function ChannelTestQuestions() {
  const { testId } = useParams<{ testId: string }>()
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.lms.channelTest.getById.queryOptions({ id: testId }),
  )

  const questions = data.channelTestQuestions

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Questions
        </h3>
        <AddChannelTestQuestionDialog>
          <Button>
            Add <PlusIcon />
          </Button>
        </AddChannelTestQuestionDialog>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted mb-4 rounded-full p-6">
            <ExamIcon
              weight="duotone"
              className="text-muted-foreground h-12 w-12"
            />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No questions yet</h3>
          <p className="text-muted-foreground max-w-sm text-center">
            Add questions and mark the correct options before publishing this
            test.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card key={question.id} className="border-0 bg-accent">
              <CardContent className="space-y-3 pt-6">
                <div className="text-sm font-semibold">
                  {index + 1}. {question.title}
                </div>
                <div className="space-y-2">
                  {question.channelTestOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{option.label}</span>
                      {option.isCorrect && (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircleIcon weight="duotone" />
                          Correct
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
