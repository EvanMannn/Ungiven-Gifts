import { describe, expect, it } from 'vitest'
import { importQuestionnaire } from '@/lib/csv'
import {
  type EventDraft,
  activeExclusions,
  applyImport,
  emptyDraft,
  participantNames,
  toPayload,
  validGroupSizes,
  validate,
} from './draft'

const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
  ...emptyDraft(),
  name: 'Playgroup',
  namesText: 'Alice\nBob\n\n  Cara  \nDan',
  ...overrides,
})

describe('participantNames', () => {
  it('trims, skips blank lines, and dedupes case-insensitively', () => {
    expect(participantNames(draft({ namesText: 'Alice\n bob\n\nALICE\nBob' }))).toEqual(['Alice', 'bob'])
  })
})

describe('validate', () => {
  it('accepts a minimal event', () => {
    expect(validate(draft())).toEqual({})
  })

  it('requires a name and two participants', () => {
    const errors = validate(draft({ name: ' ', namesText: 'Alice' }))
    expect(errors.name).toBeDefined()
    expect(errors.participants).toMatch(/two/)
  })

  it('reports duplicate names', () => {
    expect(validate(draft({ namesText: 'Alice\nalice\nBob' })).participants).toMatch(/alice/)
  })

  it('needs the organizer to be a participant with a password', () => {
    expect(validate(draft({ organizerPlaying: true, organizerName: 'Zed', organizerPassword: 'x' })).organizer).toBeDefined()
    expect(validate(draft({ organizerPlaying: true, organizerName: 'cara', organizerPassword: '' })).organizer).toMatch(/password/)
    expect(validate(draft({ organizerPlaying: true, organizerName: 'cara', organizerPassword: 'x' })).organizer).toBeUndefined()
  })
})

describe('toPayload', () => {
  it('builds the API payload', () => {
    const payload = toPayload(
      draft({
        format: 'Other',
        customFormat: 'Canadian Highlander',
        budget: '  ',
        restrictionsText: 'Mono-colored\n\nNo tutors\nMono-colored',
        exclusions: [['Alice', 'Bob'], ['Alice', 'Removed Person']],
        organizerPlaying: true,
        organizerName: 'Alice',
        organizerPassword: 'pw',
      }),
    )
    expect(payload).toMatchObject({
      name: 'Playgroup',
      format: 'Canadian Highlander',
      budget: null,
      exchange_date: null,
      restrictions: ['Mono-colored', 'No tutors'],
      exclusions: [['Alice', 'Bob']],
      organizer: { name: 'Alice', password: 'pw' },
    })
    expect(payload.participants.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Cara', 'Dan'])
  })

  it('carries imported answers through to participants', () => {
    const d = applyImport(draft(), importQuestionnaire('Name,Colors?\nAlice,Golgari\nBob,Izzet'))
    const payload = toPayload({ ...d, namesText: d.namesText + '\nCara' })
    expect(payload.questions).toEqual(['Colors?'])
    expect(payload.participants).toEqual([
      { name: 'Alice', answers: { 'Colors?': 'Golgari' } },
      { name: 'Bob', answers: { 'Colors?': 'Izzet' } },
      { name: 'Cara', answers: {} },
    ])
  })

  it('sends the chosen group size', () => {
    expect(toPayload(draft()).group_size).toBeNull()
    expect(toPayload(draft({ groupSize: 2 })).group_size).toBe(2)
  })
})

describe('validGroupSizes', () => {
  it('only offers sizes that split everyone evenly into 2+ groups', () => {
    expect(validGroupSizes(12)).toEqual([2, 3, 4, 6])
    expect(validGroupSizes(9)).toEqual([3])
    expect(validGroupSizes(7)).toEqual([])
    expect(validGroupSizes(3)).toEqual([])
  })
})

describe('activeExclusions', () => {
  it('drops pairs that mention someone no longer listed', () => {
    expect(activeExclusions(draft({ exclusions: [['alice', 'DAN'], ['Alice', 'Zed']] }))).toEqual([['alice', 'DAN']])
  })
})
