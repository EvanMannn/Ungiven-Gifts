import { Loader2, Lock, UserRound } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { api } from '@/api/client'
import type { EventPublic } from '@/api/types'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { EventHeader } from './EventHeader'

export function LoginCard({ event, onLoggedIn }: { event: EventPublic; onLoggedIn: (token: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const selected = event.participants.find((p) => p.id === selectedId)

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.login(event.slug, selected.id, password)
      onLoggedIn(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <EventHeader event={event} />
      {event.description && <p className="whitespace-pre-line text-muted-foreground">{event.description}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Who are you?</CardTitle>
          <CardDescription>Pick your name. The first time you log in, you choose your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Your name">
              {event.participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === selectedId}
                  onClick={() => {
                    setSelectedId(p.id)
                    setError(null)
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-gold/60',
                    p.id === selectedId && 'border-gold bg-pine-deep/50',
                  )}
                >
                  {p.claimed ? (
                    <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="has a password" />
                  ) : (
                    <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>

            {selected && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">
                  {selected.claimed ? `Password for ${selected.name}` : `Choose a password, ${selected.name}`}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoFocus
                  autoComplete={selected.claimed ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {!selected.claimed && (
                  <p className="text-xs text-muted-foreground">
                    Nothing sensitive is stored here, so it doesn't need to be fancy. Just don't forget it.
                  </p>
                )}
              </div>
            )}

            {error && <ErrorAlert title="Couldn't log in" message={error} />}

            <Button type="submit" size="lg" variant="holly" disabled={!selected || !password || submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {selected && !selected.claimed ? 'Set password and continue' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
