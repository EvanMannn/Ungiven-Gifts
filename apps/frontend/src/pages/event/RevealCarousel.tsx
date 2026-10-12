import { ArrowLeft, ArrowRight, Gift, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type { Dashboard } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RecipientAnswers } from './RecipientAnswers'
import { RestrictionPicker } from './RestrictionPicker'

type Step = 'recipient' | 'answers' | 'restriction' | 'group'

const TITLES: Record<Step, string> = {
  recipient: 'Your giftee',
  answers: 'What they told us',
  restriction: 'Pick your restriction',
  group: 'Your build group',
}

/** Only the steps that apply to this event. Questionnaire, restrictions and groups are all optional. */
function stepsFor(d: Dashboard): Step[] {
  const steps: Step[] = ['recipient']
  if (d.event.has_questionnaire) steps.push('answers')
  if (d.restriction_options.length > 0) steps.push('restriction')
  if (d.group_mates !== null) steps.push('group')
  return steps
}

interface Props {
  slug: string
  token: string
  dashboard: Dashboard
  onChange: (d: Dashboard) => void
  onFinish: (d: Dashboard) => void
}

export function RevealCarousel({ slug, token, dashboard, onChange, onFinish }: Props) {
  const steps = stepsFor(dashboard)
  const [index, setIndex] = useState(0)
  const [unwrapped, setUnwrapped] = useState(dashboard.onboarded)
  const [finishing, setFinishing] = useState(false)
  const step = steps[index]
  const isLast = index === steps.length - 1

  const canContinue =
    (step !== 'recipient' || unwrapped) && (step !== 'restriction' || dashboard.chosen_restriction !== null)

  async function finish() {
    if (dashboard.onboarded) return onFinish(dashboard)
    setFinishing(true)
    try {
      onFinish(await api.finishOnboarding(slug, token))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.')
      setFinishing(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        {dashboard.event.name} · Hi, {dashboard.name}
      </p>
      <Card className="overflow-hidden border-highlight/40 pt-0">
        <Progress value={((index + 1) / steps.length) * 100} className="h-1 rounded-none [&>*]:bg-highlight" />
        <CardContent className="flex min-h-80 flex-col gap-4 pt-2">
          <p className="text-xs font-bold tracking-widest text-highlight uppercase">
            {TITLES[step]} · {index + 1}/{steps.length}
          </p>

          {step === 'recipient' &&
            (unwrapped ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                <p className="text-muted-foreground">You're building a deck for</p>
                <p className="animate-in text-5xl font-black text-brand-light duration-500 zoom-in-50 fade-in">
                  {dashboard.recipient.name}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">Keep it secret!</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUnwrapped(true)}
                className="group flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-highlight/40 p-8 transition-colors hover:border-highlight hover:bg-selected/30"
              >
                <Gift className="size-16 text-brand transition-transform group-hover:scale-110 group-hover:-rotate-6" aria-hidden />
                <span className="font-bold">Click to unwrap your giftee</span>
              </button>
            ))}

          {step === 'answers' && (
            <RecipientAnswers
              name={dashboard.recipient.name}
              answers={dashboard.recipient.answers}
              className="flex-1"
            />
          )}

          {step === 'restriction' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {dashboard.restriction_options.length > 1
                  ? `Choose the restriction you'll build ${dashboard.recipient.name}'s deck around.`
                  : `This is the restriction you'll build ${dashboard.recipient.name}'s deck around. Click it to accept.`}
              </p>
              <RestrictionPicker slug={slug} token={token} dashboard={dashboard} onChange={onChange} />
            </div>
          )}

          {step === 'group' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm">
                None of these people are building for each other, so you can talk decks freely with them:
              </p>
              <div className="flex flex-wrap gap-2">
                {dashboard.group_mates?.map((n) => (
                  <Badge key={n} className="px-3 py-1 text-sm">
                    {n}
                  </Badge>
                ))}
                {dashboard.group_mates?.length === 0 && (
                  <p className="text-sm text-muted-foreground">It's just you in your group this time.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
            <ArrowLeft /> Back
          </Button>
          {isLast ? (
            <Button variant="brand" onClick={finish} disabled={!canContinue || finishing}>
              {finishing && <Loader2 className="animate-spin" />}
              Go to my dashboard
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)} disabled={!canContinue}>
              Next <ArrowRight />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
