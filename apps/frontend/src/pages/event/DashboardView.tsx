import { Gift, LogOut, MessagesSquare, RotateCcw, ScrollText, Settings, Wand2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Dashboard } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

      <div className="grid gap-4 md:grid-cols-3">
        <Widget icon={<Gift />} title="You're building for" className="border-brand/40">
          <p className="text-4xl font-black text-brand-light">{recipient.name}</p>
          <Button variant="link" size="sm" className="h-auto self-start p-0 text-muted-foreground" onClick={onReplay}>
            <RotateCcw /> Replay the reveal
          </Button>
        </Widget>

        {dashboard.restriction_options.length > 0 && (
          <Widget icon={<Wand2 />} title="Your restriction" className="md:col-span-2">
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

        {event.has_questionnaire && (
          <Widget icon={<ScrollText />} title={`About ${recipient.name}`} className="md:col-span-2">
            <RecipientAnswers name={recipient.name} answers={recipient.answers} />
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

        {event.description && (
          <Widget icon={<ScrollText />} title="From the organizer" className="md:col-span-3">
            <p className="text-sm whitespace-pre-line">{event.description}</p>
          </Widget>
        )}
      </div>
    </div>
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
