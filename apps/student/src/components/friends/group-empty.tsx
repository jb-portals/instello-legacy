import type { ReactNode } from 'react'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function GroupEmpty({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="gap-4 py-8">
      <CardHeader className="items-center">
        <CardTitle className="text-center">{title}</CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      {action ? (
        <CardFooter className="justify-center">{action}</CardFooter>
      ) : null}
    </Card>
  )
}
