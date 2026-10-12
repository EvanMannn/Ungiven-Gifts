// State and rules for the create-event form, kept free of React so they're easy to test.
import type { EventCreate } from '@/api/types'
import type { QuestionnaireImport } from '@/lib/csv'

export interface EventDraft {
  name: string
  format: string
  customFormat: string
  description: string
  budget: string
  exchangeDate: string

  /** One participant name per line. */
  namesText: string
  questions: string[]
  /** Keyed by casefolded name, so editing a name's capitalization keeps its answers. */
  answersByName: Record<string, Record<string, string>>

  /** One restriction per line. */
  restrictionsText: string
  restrictionChoices: number

  exclusions: [string, string][]

  /** People per build group, or null for no groups. Chosen in its own step after the form. */
  groupSize: number | null

  /** Admin page password, typed twice. Never saved with the draft. */
  adminPassword: string
  adminPasswordConfirm: string

  organizerPlaying: boolean
  organizerName: string
  organizerPassword: string
}

export const OTHER_FORMAT = 'Other'

export const emptyDraft = (): EventDraft => ({
  name: '',
  format: 'Commander',
  customFormat: '',
  description: '',
  budget: '',
  exchangeDate: '',
  namesText: '',
  questions: [],
  answersByName: {},
  restrictionsText: '',
  restrictionChoices: 2,
  exclusions: [],
  groupSize: null,
  adminPassword: '',
  adminPasswordConfirm: '',
  organizerPlaying: false,
  organizerName: '',
  organizerPassword: '',
})

export const key = (name: string) => name.trim().toLocaleLowerCase()

export function lines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Participant names in order, with case-insensitive duplicates removed. */
export function participantNames(draft: EventDraft): string[] {
  const seen = new Set<string>()
  return lines(draft.namesText).filter((n) => !seen.has(key(n)) && seen.add(key(n)))
}

export function duplicateNames(draft: EventDraft): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const n of lines(draft.namesText)) {
    if (seen.has(key(n))) dupes.add(n)
    seen.add(key(n))
  }
  return [...dupes]
}

export function restrictions(draft: EventDraft): string[] {
  return [...new Set(lines(draft.restrictionsText))]
}

/** Exclusions whose names are both still in the participant list. */
export function activeExclusions(draft: EventDraft): [string, string][] {
  const names = new Set(participantNames(draft).map(key))
  return draft.exclusions.filter(([a, b]) => names.has(key(a)) && names.has(key(b)))
}

export function answeredCount(draft: EventDraft): number {
  return participantNames(draft).filter((n) => Object.keys(draft.answersByName[key(n)] ?? {}).length > 0).length
}

export function applyImport(draft: EventDraft, imported: QuestionnaireImport): EventDraft {
  const answersByName: EventDraft['answersByName'] = {}
  for (const p of imported.participants) {
    answersByName[key(p.name)] = p.answers ?? {}
  }
  return {
    ...draft,
    namesText: imported.participants.map((p) => p.name).join('\n'),
    questions: imported.questions,
    answersByName,
  }
}

/**
 * Group sizes that split everyone evenly into at least two groups, e.g. 12 -> [2, 3, 4, 6].
 * Mirrors valid_group_sizes in the backend's pairing.py, which re-checks it on submit.
 */
export function validGroupSizes(participantCount: number): number[] {
  const sizes: number[] = []
  for (let size = 2; size <= participantCount / 2; size++) {
    if (participantCount % size === 0) sizes.push(size)
  }
  return sizes
}

export type DraftErrors = Partial<Record<'name' | 'format' | 'participants' | 'admin' | 'organizer', string>>

/** Both admin password boxes have something in them; Continue stays disabled until they do. */
export const adminPasswordEntered = (draft: EventDraft) => Boolean(draft.adminPassword && draft.adminPasswordConfirm)

export function validate(draft: EventDraft): DraftErrors {
  const errors: DraftErrors = {}
  const names = participantNames(draft)

  if (!draft.name.trim()) errors.name = 'Give your event a name.'
  if (draft.format === OTHER_FORMAT && !draft.customFormat.trim()) errors.format = 'Which format?'

  const dupes = duplicateNames(draft)
  if (dupes.length) errors.participants = `Names must be unique: ${dupes.join(', ')} appears more than once.`
  else if (names.length < 2) errors.participants = 'Add at least two participants.'
  else if (names.some((n) => n.length > 60)) errors.participants = 'Keep names under 60 characters.'

  if (!draft.adminPassword) errors.admin = 'Choose an admin password.'
  else if (draft.adminPassword !== draft.adminPasswordConfirm) errors.admin = "The admin passwords don't match."

  if (draft.organizerPlaying) {
    if (!names.some((n) => key(n) === key(draft.organizerName))) errors.organizer = 'Pick your name from the list.'
    else if (!draft.organizerPassword) errors.organizer = 'Choose a password so you can log back in.'
  }
  return errors
}

export function toPayload(draft: EventDraft): EventCreate {
  const names = participantNames(draft)
  const questionSet = new Set(draft.questions)
  return {
    name: draft.name.trim(),
    format: draft.format === OTHER_FORMAT ? draft.customFormat.trim() : draft.format,
    description: draft.description.trim(),
    budget: draft.budget.trim() || null,
    exchange_date: draft.exchangeDate || null,
    questions: draft.questions,
    participants: names.map((name) => ({
      name,
      answers: Object.fromEntries(
        Object.entries(draft.answersByName[key(name)] ?? {}).filter(([q]) => questionSet.has(q)),
      ),
    })),
    restrictions: restrictions(draft),
    restriction_choices: draft.restrictionChoices,
    exclusions: activeExclusions(draft),
    group_size: draft.groupSize,
    admin_password: draft.adminPassword,
    organizer: draft.organizerPlaying ? { name: draft.organizerName, password: draft.organizerPassword } : null,
  }
}
