import { describe, expect, it } from 'vitest'
import { importQuestionnaire } from '@/lib/csv'
import { RESTRICTION_IDEAS } from '@/lib/restrictionIdeas'
import {
  type EventDraft,
  activeExclusions,
  adminPasswordEntered,
  applyImport,
  availablePartners,
  budgetAmount,
  emptyDraft,
  participantNames,
  pickIdeas,
  toPayload,
  validGroupSizes,
  validate,
} from './draft'

const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
  ...emptyDraft(),
  name: 'Playgroup',
  namesText: 'Alice\nBob\n\n  Cara  \nDan',
  adminPassword: 'admin-pw',
  adminPasswordConfirm: 'admin-pw',
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

  it('needs a matching admin password', () => {
    expect(validate(draft({ adminPassword: '', adminPasswordConfirm: '' })).admin).toMatch(/admin password/)
    expect(validate(draft({ adminPasswordConfirm: 'typo' })).admin).toMatch(/match/)
    expect(adminPasswordEntered(draft({ adminPasswordConfirm: '' }))).toBe(false)
    expect(adminPasswordEntered(draft())).toBe(true)
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
      admin_password: 'admin-pw',
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

describe('pickIdeas', () => {
  const pool = ['A', 'B', 'C', 'D', 'E']

  it('picks the requested number, never repeating one already listed', () => {
    const picked = pickIdeas(draft({ restrictionsText: 'B\nD' }), pool, 2)
    expect(picked).toHaveLength(2)
    expect(picked.every((idea) => ['A', 'C', 'E'].includes(idea))).toBe(true)
  })

  it('returns whatever is left when asked for more than remain', () => {
    expect(pickIdeas(draft({ restrictionsText: 'A\nB\nC' }), pool, 10).sort()).toEqual(['D', 'E'])
  })

  it('is random but repeatable with a fixed random source', () => {
    const alwaysZero = () => 0
    expect(pickIdeas(draft(), pool, 5, alwaysZero)).toEqual(pickIdeas(draft(), pool, 5, alwaysZero))
    expect(new Set(pickIdeas(draft(), pool, 5)).size).toBe(5)
  })

  it('has unique built-in ideas, each within the API limit', () => {
    expect(new Set(RESTRICTION_IDEAS).size).toBe(RESTRICTION_IDEAS.length)
    expect(RESTRICTION_IDEAS.every((idea) => idea.length <= 300)).toBe(true)
  })
})

describe('budget', () => {
  it('sends the amount with a dollar sign, showing cents only when there are some', () => {
    expect(toPayload(draft({ budget: '40' })).budget).toBe('$40')
    expect(toPayload(draft({ budget: '40.5' })).budget).toBe('$40.50')
    expect(toPayload(draft({ budget: '' })).budget).toBeNull()
  })

  it('cleans up budgets saved as text by older drafts', () => {
    expect(budgetAmount(draft({ budget: '$40' }))).toBe(40)
  })
})

describe('availablePartners', () => {
  it('leaves out the person themselves and anyone already paired with them', () => {
    const d = draft({ exclusions: [['Alice', 'Bob'], ['cara', 'ALICE']] })
    expect(availablePartners(d, 'alice')).toEqual(['Dan'])
    expect(availablePartners(d, 'Bob')).toEqual(['Cara', 'Dan'])
    expect(availablePartners(d, 'Dan')).toEqual(['Alice', 'Bob', 'Cara'])
  })

  it('is empty once someone is paired with everyone else', () => {
    const d = draft({ exclusions: [['Alice', 'Bob'], ['Alice', 'Cara'], ['Alice', 'Dan']] })
    expect(availablePartners(d, 'Alice')).toEqual([])
  })
})

describe('activeExclusions', () => {
  it('drops pairs that mention someone no longer listed', () => {
    expect(activeExclusions(draft({ exclusions: [['alice', 'DAN'], ['Alice', 'Zed']] }))).toEqual([['alice', 'DAN']])
  })
})
