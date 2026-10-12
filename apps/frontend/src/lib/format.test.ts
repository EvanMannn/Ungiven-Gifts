import { describe, expect, it } from 'vitest'
import { daysUntil } from './format'

describe('daysUntil', () => {
  // Mid-afternoon, to show the time of day doesn't matter.
  const today = new Date(2026, 11, 1, 15, 30)

  it('counts whole days to a later date', () => {
    expect(daysUntil('2026-12-18', today)).toBe(17)
    expect(daysUntil('2026-12-02', today)).toBe(1)
  })

  it('is 0 on the day and negative once it has passed', () => {
    expect(daysUntil('2026-12-01', today)).toBe(0)
    expect(daysUntil('2026-11-28', today)).toBe(-3)
  })

  it('works across a year boundary and a daylight-saving change', () => {
    expect(daysUntil('2027-01-01', today)).toBe(31)
    // Most of North America moves the clocks on 2027-03-14; that day has 23 hours.
    expect(daysUntil('2027-03-20', new Date(2027, 2, 10))).toBe(10)
  })
})
