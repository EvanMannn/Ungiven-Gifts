import type { ReactNode } from 'react'
import type { EventCreate } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/format'

export function ReviewStep({ payload }: { payload: EventCreate }) {
  const answered = payload.participants.filter((p) => Object.keys(p.answers ?? {}).length > 0).length
  const count = payload.participants.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{payload.name}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge>{payload.format}</Badge>
          {payload.budget && <Badge variant="gold">{payload.budget}</Badge>}
          {payload.exchange_date && <Badge variant="outline">{formatDate(payload.exchange_date)}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">
          {payload.description && <Row label="Notes">{payload.description}</Row>}
          <Row label={`Participants (${payload.participants.length})`}>{payload.participants.map((p) => p.name).join(', ')}</Row>
          <Row label="Questionnaire">
            {payload.questions?.length
              ? `${payload.questions.length} questions, answered by ${answered} of ${payload.participants.length}`
              : 'None'}
          </Row>
          <Row label="Restrictions">
            {payload.restrictions?.length ? (
              <>
                <span className="text-muted-foreground">
                  Each builder picks from {Math.min(payload.restriction_choices ?? 2, payload.restrictions.length)}:
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {/* Titles only: descriptions would make this hard to scan. */}
                  {payload.restrictions.map((r) => (
                    <Badge key={r.title} variant="secondary">
                      {r.title}
                    </Badge>
                  ))}
                </span>
              </>
            ) : (
              'None'
            )}
          </Row>
          <Row label="Pairs to avoid">
            {payload.exclusions?.length ? payload.exclusions.map(([a, b]) => `${a} ↔ ${b}`).join(', ') : 'None'}
          </Row>
          <Row label="Build groups">
            {payload.group_size
              ? `${count / payload.group_size} groups of ${payload.group_size}, assigned randomly`
              : 'None'}
          </Row>
          <Row label="You">{payload.organizer ? `Taking part as ${payload.organizer.name}` : 'Organizing only'}</Row>
        </dl>
      </CardContent>
    </Card>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-col text-sm">{children}</dd>
    </div>
  )
}
