import type { QuestionAnswer } from '@/api/types'
import { cn } from '@/lib/utils'

export function RecipientAnswers({
  name,
  answers,
  className,
}: {
  name: string
  answers: QuestionAnswer[]
  className?: string
}) {
  if (answers.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {name} didn't answer the questionnaire. Time to do some detective work!
      </p>
    )
  }
  return (
    <dl className={cn('flex flex-col gap-4', className)}>
      {answers.map((qa) => (
        <div key={qa.question}>
          <dt className="text-sm text-muted-foreground">{qa.question}</dt>
          <dd className="whitespace-pre-line">{qa.answer}</dd>
        </div>
      ))}
    </dl>
  )
}
