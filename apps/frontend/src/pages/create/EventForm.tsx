import { Download, FileUp, Lightbulb, Plus, ShieldAlert, X } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/Field'
import { SimpleSelect } from '@/components/SimpleSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { importQuestionnaire } from '@/lib/csv'
import { MTG_FORMATS, RESTRICTION_IDEAS } from '@/lib/format'
import {
  type DraftErrors,
  type EventDraft,
  OTHER_FORMAT,
  activeExclusions,
  answeredCount,
  applyImport,
  key,
  participantNames,
  restrictions,
} from './draft'

interface Props {
  draft: EventDraft
  errors: DraftErrors
  onChange: (patch: Partial<EventDraft>) => void
}

export function EventForm({ draft, errors, onChange }: Props) {
  const names = participantNames(draft)
  return (
    <div className="flex flex-col gap-6">
      <DetailsSection draft={draft} errors={errors} onChange={onChange} />
      <ParticipantsSection draft={draft} errors={errors} onChange={onChange} names={names} />
      <RestrictionsSection draft={draft} onChange={onChange} />
      <ExclusionsSection draft={draft} onChange={onChange} names={names} />
      <OrganizerSection draft={draft} errors={errors} onChange={onChange} names={names} />
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  )
}

function DetailsSection({ draft, errors, onChange }: Props) {
  return (
    <Section title="Event details">
      <Field label="Event name" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          placeholder="Thursday Night Commander Secret Santa"
          value={draft.name}
          maxLength={60}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Format" htmlFor="format" error={errors.format}>
          <SimpleSelect
            id="format"
            value={draft.format}
            onChange={(format) => onChange({ format })}
            options={[...MTG_FORMATS, OTHER_FORMAT]}
          />
          {draft.format === OTHER_FORMAT && (
            <Input
              aria-label="Format name"
              placeholder="Format name"
              value={draft.customFormat}
              maxLength={60}
              onChange={(e) => onChange({ customFormat: e.target.value })}
            />
          )}
        </Field>
        <Field label="Budget" htmlFor="budget" hint="Optional">
          <Input
            id="budget"
            placeholder="$40"
            value={draft.budget}
            maxLength={60}
            onChange={(e) => onChange({ budget: e.target.value })}
          />
        </Field>
        <Field label="Gift exchange date" htmlFor="date" hint="Optional">
          <Input id="date" type="date" value={draft.exchangeDate} onChange={(e) => onChange({ exchangeDate: e.target.value })} />
        </Field>
      </div>
      <Field label="Notes for participants" htmlFor="description" hint="Optional. House rules, where the swap happens, and so on.">
        <Textarea
          id="description"
          rows={3}
          maxLength={2000}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
    </Section>
  )
}

const TEMPLATE_CSV =
  'Name,What colors do you like to play?,Any pet cards?,What do you hate playing against?\n' +
  'Alice,Golgari,Mulldrifter,Stax\n'

function ParticipantsSection({ draft, errors, onChange, names }: Props & { names: string[] }) {
  const fileInput = useRef<HTMLInputElement>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const imported = importQuestionnaire(await file.text())
      onChange(applyImport(draft, imported))
      toast.success(
        `Imported ${imported.participants.length} participants` +
          (imported.questions.length ? ` and ${imported.questions.length} questions` : ''),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file.")
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'ungiven-gifts-template.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Section
      title="Participants"
      description="Type names one per line, or import a CSV of questionnaire answers. A Google Forms export works as-is."
    >
      <Field
        label={
          <>
            Names <Badge variant="secondary">{names.length}</Badge>
          </>
        }
        htmlFor="names"
        error={errors.participants}
      >
        <Textarea
          id="names"
          rows={6}
          placeholder={'Alice\nBob\nCara'}
          value={draft.namesText}
          onChange={(e) => onChange({ namesText: e.target.value })}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
          <FileUp /> Import CSV
        </Button>
        <Button type="button" variant="ghost" onClick={downloadTemplate}>
          <Download /> CSV template
        </Button>
      </div>

      <div className="rounded-lg border border-dashed p-4 text-sm">
        {draft.questions.length ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                Questionnaire: {draft.questions.length} questions, answered by {answeredCount(draft)} of {names.length}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ questions: [], answersByName: {} })}>
                Remove
              </Button>
            </div>
            <ul className="list-inside list-disc text-muted-foreground">
              {draft.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">
            No questionnaire. Import a CSV with one column per question and each builder will see their giftee's answers.
          </p>
        )}
      </div>
    </Section>
  )
}

function RestrictionsSection({ draft, onChange }: Omit<Props, 'errors'>) {
  const current = restrictions(draft)

  function addIdeas() {
    const fresh = RESTRICTION_IDEAS.filter((idea) => !current.includes(idea))
    onChange({ restrictionsText: [...current, ...fresh].join('\n') })
  }

  return (
    <Section
      title="Deckbuilding restrictions"
      description="Optional. Each builder is offered a few of these at random and picks one to build around."
    >
      <Field label="Restrictions, one per line" htmlFor="restrictions">
        <Textarea
          id="restrictions"
          rows={5}
          placeholder={'Mono-colored\nNo cards over $2'}
          value={draft.restrictionsText}
          onChange={(e) => onChange({ restrictionsText: e.target.value })}
        />
      </Field>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Button type="button" variant="ghost" onClick={addIdeas}>
          <Lightbulb /> Add some ideas
        </Button>
        {current.length > 1 && (
          <div className="flex items-center gap-3 text-sm">
            <Label htmlFor="choices">Options per builder</Label>
            <SimpleSelect
              id="choices"
              className="w-20"
              value={String(Math.min(draft.restrictionChoices, current.length))}
              onChange={(v) => onChange({ restrictionChoices: Number(v) })}
              options={Array.from({ length: Math.min(current.length, 5) }, (_, i) => String(i + 1))}
            />
          </div>
        )}
      </div>
    </Section>
  )
}

function ExclusionsSection({ draft, onChange, names }: Omit<Props, 'errors'> & { names: string[] }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const exclusions = activeExclusions(draft)

  function add() {
    if (!a || !b || key(a) === key(b)) return
    const pairKey = (x: string, y: string) => [key(x), key(y)].sort().join('|')
    if (!exclusions.some(([x, y]) => pairKey(x, y) === pairKey(a, b))) onChange({ exclusions: [...exclusions, [a, b]] })
    setA('')
    setB('')
  }

  return (
    <Section title="Pairs to avoid" description="Optional. For example, last year's pairings. Excluded pairs never gift each other in either direction.">
      {names.length < 2 ? (
        <p className="text-sm text-muted-foreground">Add participants first.</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <SimpleSelect aria-label="First person" value={a} onChange={setA} options={names} placeholder="Someone" />
          <SimpleSelect
            aria-label="Second person"
            value={b}
            onChange={setB}
            options={names.filter((n) => key(n) !== key(a))}
            placeholder="shouldn't be paired with"
          />
          <Button type="button" variant="outline" onClick={add} disabled={!a || !b}>
            <Plus /> Add
          </Button>
        </div>
      )}
      {exclusions.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {exclusions.map(([x, y], i) => (
            <li key={`${x}|${y}`}>
              <Badge variant="outline" className="gap-1 py-1 pr-1 text-sm">
                {x} ↔ {y}
                <button
                  type="button"
                  className="cursor-pointer rounded p-0.5 hover:bg-accent"
                  aria-label={`Remove ${x} and ${y}`}
                  onClick={() => onChange({ exclusions: exclusions.filter((_, j) => j !== i) })}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function OrganizerSection({ draft, errors, onChange, names }: Props & { names: string[] }) {
  return (
    <Section
      title="You, the organizer"
      description="Your admin password lets you manage the event: edit details and reset forgotten passwords."
    >
      <Alert className="border-holly/60 bg-holly/10">
        <ShieldAlert className="text-holly-light" />
        <AlertTitle className="text-base">This password can't be reset</AlertTitle>
        <AlertDescription>
          It's the only way into the admin page, and nobody can recover it. Write it down somewhere safe.
        </AlertDescription>
      </Alert>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Admin password" htmlFor="admin-password">
          <Input
            id="admin-password"
            type="password"
            autoComplete="new-password"
            value={draft.adminPassword}
            onChange={(e) => onChange({ adminPassword: e.target.value })}
          />
        </Field>
        <Field label="Admin password again" htmlFor="admin-password-confirm" error={errors.admin}>
          <Input
            id="admin-password-confirm"
            type="password"
            autoComplete="new-password"
            value={draft.adminPasswordConfirm}
            onChange={(e) => onChange({ adminPasswordConfirm: e.target.value })}
          />
        </Field>
      </div>

      <Label className="flex cursor-pointer items-center gap-3 font-normal">
        <Switch checked={draft.organizerPlaying} onCheckedChange={(organizerPlaying) => onChange({ organizerPlaying })} />
        I'm one of the participants. Log me in once the event is created.
      </Label>
      {draft.organizerPlaying && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Which one is you?" htmlFor="organizer-name">
            <SimpleSelect
              id="organizer-name"
              value={draft.organizerName}
              onChange={(organizerName) => onChange({ organizerName })}
              options={names}
              placeholder="Pick your name"
              disabled={names.length === 0}
            />
          </Field>
          <Field
            label="Your participant password"
            htmlFor="organizer-password"
            hint="A separate password for playing. Like everyone's, it can be reset from the admin page."
          >
            <Input
              id="organizer-password"
              type="password"
              autoComplete="new-password"
              value={draft.organizerPassword}
              onChange={(e) => onChange({ organizerPassword: e.target.value })}
            />
          </Field>
        </div>
      )}
      {errors.organizer && <p className="text-sm text-holly-light">{errors.organizer}</p>}
    </Section>
  )
}
