import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { EventCreated } from '@/api/types'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { session } from '@/lib/session'
import { CreatedStep } from './CreatedStep'
import { type DraftErrors, type EventDraft, emptyDraft, participantNames, toPayload, validGroupSizes, validate } from './draft'
import { EventForm } from './EventForm'
import { GroupsStep } from './GroupsStep'
import { ReviewStep } from './ReviewStep'

const DRAFT_STORAGE_KEY = 'ungiven-gifts:create-draft'

// Unsent form progress survives a refresh. The password is deliberately never stored.
function loadDraft(): EventDraft {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')
    return saved ? { ...emptyDraft(), ...saved, organizerPassword: '' } : emptyDraft()
  } catch {
    return emptyDraft()
  }
}

function saveDraft(draft: EventDraft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, organizerPassword: '' }))
    else localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // Storage unavailable; the draft just won't survive a refresh.
  }
}

type Stage = { kind: 'edit' } | { kind: 'groups' } | { kind: 'review' } | { kind: 'done'; created: EventCreated }

const HEADINGS: Record<Exclude<Stage['kind'], 'done'>, { step: string; title: string }> = {
  edit: { step: 'Step 1 of 3', title: 'Create an event' },
  groups: { step: 'Step 2 of 3', title: 'Build groups' },
  review: { step: 'Step 3 of 3', title: 'Look good?' },
}

export default function CreateEventPage() {
  const [draft, setDraft] = useState(loadDraft)
  const [stage, setStage] = useState<Stage>({ kind: 'edit' })
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (stage.kind !== 'done') saveDraft(draft)
  }, [draft, stage.kind])

  // Braces matter: an effect's return value is treated as its cleanup, and modern browsers make
  // scrollTo() return a Promise, which crashes React when it tries to call it.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [stage.kind])

  function update(patch: Partial<EventDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    // Clear errors as the user fixes things, but don't add new ones until they try to continue.
    if (Object.keys(errors).length) setErrors((prev) => pick(validate({ ...draft, ...patch }), prev))
  }

  function continueToGroups() {
    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // Names may have changed since a group size was picked; drop it if it no longer splits evenly.
    const count = participantNames(draft).length
    if (draft.groupSize !== null && !validGroupSizes(count).includes(draft.groupSize)) {
      setDraft((d) => ({ ...d, groupSize: null }))
    }
    setSubmitError(null)
    setStage({ kind: 'groups' })
  }

  async function create() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = toPayload(draft)
      const created = await api.createEvent(payload)
      session.setAdminKey(created.slug, created.admin_key)
      if (created.organizer_token) session.setToken(created.slug, created.organizer_token)
      saveDraft(null)
      setStage({ kind: 'done', created })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not create the event.')
    } finally {
      setSubmitting(false)
    }
  }

  if (stage.kind === 'done') return <CreatedStep created={stage.created} eventName={draft.name} />

  const errorCount = Object.keys(errors).length
  const heading = HEADINGS[stage.kind]
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium tracking-wide text-gold uppercase">{heading.step}</p>
        <h1 className="text-3xl font-black">{heading.title}</h1>
        {stage.kind === 'review' && (
          <p className="text-muted-foreground">Names are drawn as soon as you create the event.</p>
        )}
      </div>

      {stage.kind === 'edit' && (
        <>
          {errorCount > 0 && <ErrorAlert title="A few things need fixing" message={Object.values(errors).join('\n')} />}
          <EventForm draft={draft} errors={errors} onChange={update} />
          <div className="flex justify-end">
            <Button size="lg" onClick={continueToGroups}>
              Continue <ArrowRight />
            </Button>
          </div>
        </>
      )}

      {stage.kind === 'groups' && (
        <>
          <GroupsStep
            participantCount={participantNames(draft).length}
            groupSize={draft.groupSize}
            onChange={(groupSize) => update({ groupSize })}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="lg" onClick={() => setStage({ kind: 'edit' })}>
              <ArrowLeft /> Edit
            </Button>
            <Button size="lg" onClick={() => setStage({ kind: 'review' })}>
              Review <ArrowRight />
            </Button>
          </div>
        </>
      )}

      {stage.kind === 'review' && (
        <>
          <ReviewStep payload={toPayload(draft)} />
          {submitError && <ErrorAlert title="Couldn't create the event" message={submitError} />}
          <div className="flex justify-between">
            <Button variant="ghost" size="lg" onClick={() => setStage({ kind: 'groups' })} disabled={submitting}>
              <ArrowLeft /> Back
            </Button>
            <Button variant="holly" size="lg" onClick={create} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Create event and draw names
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/** Keep only the errors that were already showing. */
function pick(next: DraftErrors, prev: DraftErrors): DraftErrors {
  return Object.fromEntries(Object.entries(next).filter(([k]) => k in prev))
}
