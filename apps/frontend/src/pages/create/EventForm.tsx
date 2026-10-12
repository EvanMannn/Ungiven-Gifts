import { ChevronRight, Download, FileUp, Lightbulb, Plus, ShieldAlert, X } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BudgetInput } from '@/components/BudgetInput'
import { DatePicker } from '@/components/DatePicker'
import { Field } from '@/components/Field'
import { SimpleSelect } from '@/components/SimpleSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { importQuestionnaire, importRestrictions } from '@/lib/csv'
import { MTG_FORMATS } from '@/lib/format'
import { RESTRICTION_IDEAS } from '@/lib/restrictionIdeas'
import { cn } from '@/lib/utils'
import {
  type DraftErrors,
  type EventDraft,
  OTHER_FORMAT,
  activeExclusions,
  addRestrictions,
  answeredCount,
  applyImport,
  availablePartners,
  hasRestriction,
  key,
  participantNames,
  pickIdeas,
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

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: ReactNode
  /** Shown at the right of the header, e.g. an Add button. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
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
        <Field label="Budget" htmlFor="budget" hint="Optional. Per gift, in dollars.">
          <BudgetInput id="budget" value={draft.budget} onChange={(budget) => onChange({ budget })} />
        </Field>
        <Field label="Gift exchange date" htmlFor="date" hint="Optional">
          <DatePicker id="date" value={draft.exchangeDate} onChange={(exchangeDate) => onChange({ exchangeDate })} />
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

function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
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
        <Button type="button" variant="ghost" onClick={() => downloadCsv('ungiven-gifts-template.csv', TEMPLATE_CSV)}>
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

const MAX_IDEAS = RESTRICTION_IDEAS.length

const RESTRICTIONS_TEMPLATE_CSV =
  'Title,Description\n' +
  'Treehugger,"Every card has a tree somewhere in its art, even in the background."\n' +
  'One-drop commander,Your commander costs 1 mana or less.\n'

function RestrictionsSection({ draft, onChange }: Omit<Props, 'errors'>) {
  const list = draft.restrictions
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // The one row whose description is showing, by title key. Opening another closes it.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const duplicate = title.trim() !== '' && hasRestriction(draft, title)
  const canAdd = title.trim() !== '' && !duplicate

  // Kept as text so the box can be cleared while typing; clamped to 1..MAX_IDEAS when used.
  const [ideaCountText, setIdeaCountText] = useState('5')
  const ideaCount = Math.min(Math.max(Number(ideaCountText) || 1, 1), MAX_IDEAS)
  const ideasLeft = RESTRICTION_IDEAS.filter((idea) => !hasRestriction(draft, idea.title)).length

  function add() {
    if (!canAdd) return
    onChange({ restrictions: addRestrictions(draft, [{ title, description }]).restrictions })
    setTitle('')
    setDescription('')
  }

  function remove(index: number) {
    onChange({ restrictions: list.filter((_, i) => i !== index) })
  }

  function addIdeas() {
    onChange({ restrictions: [...list, ...pickIdeas(draft, RESTRICTION_IDEAS, ideaCount)] })
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const imported = importRestrictions(await file.text())
      const { restrictions, skipped } = addRestrictions(draft, imported)
      onChange({ restrictions })
      toast.success(
        `Imported ${imported.length - skipped} restrictions` + (skipped ? `, skipped ${skipped} already listed` : ''),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file.")
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <Section
      title="Deckbuilding restrictions"
      description="Optional. Each builder is offered a few of these at random and picks one to build around."
      action={
        <Button type="button" size="sm" onClick={add} disabled={!canAdd} aria-label="Add restriction">
          <Plus /> Add
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label="Title" htmlFor="restriction-title" error={duplicate ? 'That one is already in the list.' : undefined}>
          <Input
            id="restriction-title"
            maxLength={100}
            placeholder="Treehugger"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
          />
        </Field>
        <Field label="Description" htmlFor="restriction-description" hint="Optional. The details builders need.">
          <Textarea
            id="restriction-description"
            rows={2}
            maxLength={2000}
            placeholder="Every card has a tree somewhere in its art, even in the background."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>

      {list.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border" aria-label="Restrictions">
          {list.map((r, i) => {
            const rowKey = key(r.title)
            const isOpen = openKey === rowKey
            return (
              <li key={rowKey}>
                <div className="flex items-center pr-1">
                  <button
                    type="button"
                    aria-expanded={r.description ? isOpen : undefined}
                    disabled={!r.description}
                    onClick={() => setOpenKey(isOpen ? null : rowKey)}
                    className="flex flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium disabled:cursor-default"
                  >
                    <ChevronRight
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-90',
                        !r.description && 'invisible',
                      )}
                      aria-hidden
                    />
                    {r.title}
                  </button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${r.title}`} onClick={() => remove(i)}>
                    <X />
                  </Button>
                </div>
                {isOpen && <p className="px-9 pb-3 text-sm whitespace-pre-line text-muted-foreground">{r.description}</p>}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
          <FileUp /> Import CSV
        </Button>
        <Button type="button" variant="ghost" onClick={() => downloadCsv('restrictions-template.csv', RESTRICTIONS_TEMPLATE_CSV)}>
          <Download /> CSV template
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={addIdeas} disabled={ideasLeft === 0}>
            <Lightbulb /> Add {ideaCount} random {ideaCount === 1 ? 'idea' : 'ideas'}
          </Button>
          <Input
            type="number"
            aria-label="How many ideas to add"
            className="w-20"
            min={1}
            max={MAX_IDEAS}
            value={ideaCountText}
            onChange={(e) => setIdeaCountText(e.target.value)}
            onBlur={() => setIdeaCountText(String(ideaCount))}
          />
        </div>
        {list.length > 1 && (
          <div className="flex items-center gap-3 text-sm">
            <Label htmlFor="choices">Options per builder</Label>
            <SimpleSelect
              id="choices"
              className="w-20"
              value={String(Math.min(draft.restrictionChoices, list.length))}
              onChange={(v) => onChange({ restrictionChoices: Number(v) })}
              options={Array.from({ length: Math.min(list.length, 5) }, (_, i) => String(i + 1))}
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
  // Only people who still have someone left to be paired with are worth offering on the left.
  const firstOptions = names.filter((n) => availablePartners(draft, n).length > 0)
  // The right side is built from the left choice, so it stays empty (and locked) until one is made.
  const secondOptions = a ? availablePartners(draft, a) : []

  function chooseFirst(name: string) {
    setA(name)
    setB('') // The old choice may not be valid for the new person.
  }

  function add() {
    if (!a || !secondOptions.some((n) => key(n) === key(b))) return
    onChange({ exclusions: [...exclusions, [a, b]] })
    setA('')
    setB('')
  }

  return (
    <Section title="Pairs to avoid" description="Optional. For example, last year's pairings. Excluded pairs never gift each other in either direction.">
      {names.length < 2 ? (
        <p className="text-sm text-muted-foreground">Add participants first.</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <SimpleSelect
            aria-label="First person"
            value={a}
            onChange={chooseFirst}
            options={firstOptions}
            placeholder={firstOptions.length ? 'Someone' : 'Everyone is already paired'}
            disabled={firstOptions.length === 0}
          />
          <SimpleSelect
            aria-label="Second person"
            value={b}
            onChange={setB}
            options={secondOptions}
            placeholder={a ? "shouldn't be paired with" : 'Pick someone first'}
            disabled={!a}
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
      title="Organizer settings"
      description="Your admin password lets you manage the event: edit details and reset forgotten passwords."
    >
      <Alert className="border-brand/60 bg-brand/10">
        <ShieldAlert className="text-brand-light" />
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
      {errors.organizer && <p className="text-sm text-error">{errors.organizer}</p>}
    </Section>
  )
}
