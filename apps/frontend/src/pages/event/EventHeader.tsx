import { CalendarDays, Coins } from 'lucide-react'
import type { ReactNode } from 'react'
import type { EventPublic } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'

export function EventHeader({ event, actions }: { event: EventPublic; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-balance">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge>{event.format}</Badge>
          {event.budget && (
            <span className="inline-flex items-center gap-1">
              <Coins className="size-4 text-highlight" aria-hidden /> {event.budget}
            </span>
          )}
          {event.exchange_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4 text-highlight" aria-hidden /> {formatDate(event.exchange_date)}
            </span>
          )}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
