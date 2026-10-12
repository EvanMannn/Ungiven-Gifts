import { CalendarDays, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/** "2026-12-18" -> a Date at local midnight. Parsing the string directly would read it as UTC. */
function fromIso(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** A Date -> "2026-12-18", using local time to match fromIso. */
function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Optional date as a button that opens a calendar. Works with "YYYY-MM-DD" strings ('' for no
 * date), the same format the API uses. Past days can't be picked.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
}: {
  id: string
  value: string
  onChange: (iso: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  // Worked out once, when the picker first renders, so re-renders don't each read the clock.
  const [today] = useState(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })
  const selected = fromIso(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarDays />
          {value ? formatDate(value, 'short') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? today}
          disabled={{ before: today }}
          onSelect={(date) => {
            onChange(date ? toIso(date) : '')
            setOpen(false)
          }}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              <X /> Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
