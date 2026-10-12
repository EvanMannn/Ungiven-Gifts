import type { ParticipantIn } from '@/api/types'

/** Parse RFC 4180 CSV: quoted fields, escaped quotes (""), commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export interface QuestionnaireImport {
  questions: string[]
  participants: ParticipantIn[]
}

// Columns Google Forms / Microsoft Forms add that aren't questionnaire answers.
const IGNORED_COLUMNS = new Set(['timestamp', 'email address', 'email', 'id', 'start time', 'completion time'])

/**
 * Turn a questionnaire spreadsheet into participants + questions.
 *
 * Expects a header row. The first column whose header contains "name" is the participant's
 * name; every other column is a question.
 * Works directly with a Google Forms response export.
 */
export function importQuestionnaire(text: string): QuestionnaireImport {
  const [header, ...rows] = parseCsv(text)
  if (!header) throw new Error('The file is empty.')

  const normalized = header.map((h) => h.trim().toLowerCase())
  const nameCol = normalized.findIndex((h) => h.includes('name'))
  if (nameCol === -1) throw new Error('Add a column with "name" in its header for participant names.')

  const questionCols = header
    .map((h, i) => ({ question: h.trim(), i }))
    .filter(({ i }) => i !== nameCol && !IGNORED_COLUMNS.has(normalized[i]))

  const participants = rows
    .map((row): ParticipantIn => {
      const answers: Record<string, string> = {}
      for (const { question, i } of questionCols) {
        const answer = row[i]?.trim()
        if (answer) answers[question] = answer
      }
      return { name: row[nameCol]?.trim() ?? '', answers }
    })
    .filter((p) => p.name !== '')

  return { questions: questionCols.map((c) => c.question), participants }
}
