export const MTG_FORMATS = ['Commander', 'Pauper', 'Pauper Commander', 'Modern', 'Pioneer', 'Standard', 'Legacy', 'Cube', 'Oathbreaker']

export const RESTRICTION_IDEAS = [
  'Mono-colored',
  'No cards over $2',
  'Typal (tribal) theme',
  'Commons and uncommons only',
  'No tutors',
  'Only cards printed before 2015',
  'No mythic rares',
  'Graveyard matters',
  'Artifacts matter',
  'Lands matter',
  'Partner or background commanders',
  'Commander under $1',
]

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

export function eventUrl(slug: string) {
  return `${window.location.origin}/e/${slug}`
}

export function adminUrl(slug: string) {
  return `${window.location.origin}/e/${slug}/admin`
}
