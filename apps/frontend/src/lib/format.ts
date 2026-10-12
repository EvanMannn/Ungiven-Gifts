export const MTG_FORMATS = ['Commander', 'Pauper', 'Pauper Commander', 'Modern', 'Pioneer', 'Standard', 'Legacy', 'Cube', 'Oathbreaker']

/** "2026-12-18" -> "Friday, December 18, 2026", parsed as a local date so it never shifts a day. */
export function formatDate(isoDate: string, style: 'long' | 'short' = 'long'): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: style === 'long' ? 'long' : undefined,
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Whole days from `today` until a "YYYY-MM-DD" date: 0 is today, negative means it has passed.
 * Both are taken at local midnight, and rounding absorbs the odd 23- or 25-hour daylight-saving day.
 */
export function daysUntil(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86_400_000)
}

/** Highest budget the form accepts, in dollars. */
export const MAX_BUDGET = 10_000

/**
 * Tidy what's typed into a budget box: digits and one decimal point, at most two decimal places.
 * There's no way to type a minus sign, so it can't go negative.
 */
export function cleanBudgetInput(text: string): string {
  const [whole, ...rest] = text.replace(/[^\d.]/g, '').split('.')
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
}

/** "$40.50" or "40.5" -> 40.5. Reads the first number only, so older text like "$40-50" gives 40. */
export function parseBudget(text: string | null): number | null {
  const match = text?.match(/\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

/** 40 -> "$40", 40.5 -> "$40.50". The API stores the budget as display text. */
export function formatBudget(amount: number | null): string | null {
  if (amount === null) return null
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
}

export function eventUrl(slug: string) {
  return `${window.location.origin}/e/${slug}`
}

export function adminUrl(slug: string) {
  return `${window.location.origin}/e/${slug}/admin`
}
