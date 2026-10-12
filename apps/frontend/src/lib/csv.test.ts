import { describe, expect, it } from 'vitest'
import { importQuestionnaire, parseCsv } from './csv'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded commas and newlines', () => {
    const text = 'a,b,c\r\n"x, y","say ""hi""","line1\nline2"\n'
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', 'line1\nline2'],
    ])
  })

  it('drops blank rows and keeps a final row without a trailing newline', () => {
    expect(parseCsv('a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('importQuestionnaire', () => {
  it('reads a Google Forms style export', () => {
    const csv = [
      'Timestamp,Email Address,Your name,Favorite colors?,Cards you love?',
      '2026/10/01,a@x.com,Alice,Golgari,Mulldrifter',
      '2026/10/02,b@x.com,Bob,Izzet,',
    ].join('\n')

    expect(importQuestionnaire(csv)).toEqual({
      questions: ['Favorite colors?', 'Cards you love?'],
      participants: [
        { name: 'Alice', answers: { 'Favorite colors?': 'Golgari', 'Cards you love?': 'Mulldrifter' } },
        { name: 'Bob', answers: { 'Favorite colors?': 'Izzet' } },
      ],
    })
  })

  it('requires a name column', () => {
    expect(() => importQuestionnaire('Color,Card\nGreen,Llanowar Elves')).toThrow(/name/)
  })
})
