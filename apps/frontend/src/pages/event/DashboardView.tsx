import { CalendarClock, Gift, LogOut, Megaphone, MessagesSquare, RotateCcw, ScrollText, Settings, Wand2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import type { Dashboard } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { daysUntil, formatDate } from '@/lib/format'
import { session } from '@/lib/session'
import { cn } from '@/lib/utils'
import { EventHeader } from './EventHeader'
import { RecipientAnswers } from './RecipientAnswers'
import { RestrictionPicker } from './RestrictionPicker'

interface Props {
  slug: string
  token: string
  dashboard: Dashboard
  onChange: (d: Dashboard) => void
  onReplay: () => void
  onLogout: () => void
}

export function DashboardView({ slug, token, dashboard, onChange, onReplay, onLogout }: Props) {
  const { event, recipient } = dashboard
  const isAdmin = Boolean(session.adminToken(slug))
  const chosen = dashboard.restriction_options.find((r) => r.title === dashboard.chosen_restriction)
  // The right-hand column holds event info, and only exists when there's some to show.
  const hasSideColumn = Boolean(event.exchange_date || event.description) || dashboard.group_mates !== null

  return (
    <div className="flex flex-col gap-6">
      <EventHeader
        event={event}
        actions={
          <>
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/e/${slug}/admin`}>
                  <Settings /> Admin
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut /> Log out {dashboard.name}
            </Button>
          </>
        }
      />

      {/* Two equal columns that stack independently: your build on the left, event info on the
          right. A long restriction list only makes its own column taller. Without any event info,
          the left column takes the full width. */}
      <div className={cn('grid items-start gap-4', hasSideColumn && 'md:grid-cols-2')}>
        <div className="flex flex-col gap-4">
          <Widget icon={<Gift />} title="You're building for" className="border-brand/40">
            <p className="text-4xl font-black text-brand-light">{recipient.name}</p>
            <Button variant="link" size="sm" className="h-auto self-start p-0 text-muted-foreground" onClick={onReplay}>
              <RotateCcw /> Replay the reveal
            </Button>
          </Widget>

          {dashboard.restriction_options.length > 0 && (
            <Widget icon={<Wand2 />} title="Your restriction">
              {chosen ? (
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-bold text-highlight">{chosen.title}</p>
                  {chosen.description && <p className="text-muted-foreground">{chosen.description}</p>}
                </div>
              ) : (
                <p className="text-sm text-brand-light">You haven't picked one yet.</p>
              )}
              {dashboard.restriction_options.length > 1 && (
                <details className="group text-sm" open={!dashboard.chosen_restriction}>
                  <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
                    {dashboard.chosen_restriction ? 'Change it' : 'Your options'}
                  </summary>
                  <div className="pt-3">
                    <RestrictionPicker slug={slug} token={token} dashboard={dashboard} onChange={onChange} />
                  </div>
                </details>
              )}
            </Widget>
          )}
        </div>

        {hasSideColumn && (
          <div className="flex flex-col gap-4">
            {event.exchange_date && <Countdown date={event.exchange_date} />}

            {event.description && (
              <Widget icon={<Megaphone />} title="From the organizer">
                <p className="text-sm whitespace-pre-line">{event.description}</p>
              </Widget>
            )}

            {dashboard.group_mates !== null && (
              <Widget icon={<MessagesSquare />} title="Safe to talk to">
                <p className="text-xs text-muted-foreground">Your build group. Nobody here is building for anyone else here.</p>
                <div className="flex flex-wrap gap-2">
                  {dashboard.group_mates.map((n) => (
                    <Badge key={n} variant="secondary" className="px-3 py-1 text-sm">
                      {n}
                    </Badge>
                  ))}
                  {dashboard.group_mates.length === 0 && <p className="text-sm text-muted-foreground">Just you this time.</p>}
                </div>
              </Widget>
            )}
          </div>
        )}
      </div>

      {/* Full width below both columns: answers can run long and read better on wide lines. */}
      {event.has_questionnaire && (
        <Widget icon={<ScrollText />} title={`About ${recipient.name}`}>
          <RecipientAnswers name={recipient.name} answers={recipient.answers} />
        </Widget>
      )}
    </div>
  )
}

/** Days until the gift exchange, counting down to "today", then saying when it was. */
function Countdown({ date }: { date: string }) {
  // Read the clock once when the widget appears, not on every render.
  const [today] = useState(() => new Date())
  const days = daysUntil(date, today)

  let headline: string
  if (days > 1) headline = `${days} days to go`
  else if (days === 1) headline = 'Tomorrow!'
  else if (days === 0) headline = "It's today!"
  else headline = 'The swap has happened'

  return (
    <Widget icon={<CalendarClock />} title="Gift exchange">
      <p className="text-3xl font-black text-highlight">{headline}</p>
      <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
    </Widget>
  )
}

function Widget({
  icon,
  title,
  className,
  children,
}: {
  icon: ReactNode
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('gap-3', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground uppercase [&_svg]:size-4 [&_svg]:text-highlight">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  )
}
