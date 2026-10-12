import { ArrowRight, Loader2 } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '@/api/client'
import type { EventPublic, ParticipantMatch } from '@/api/types'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminLoginForm } from '../admin/AdminLoginForm'
import { EventHeader } from './EventHeader'

/**
 * Two steps: type your name, then enter (or create) your password. Typing your own name, rather
 * than picking from a list, stops people claiming someone else's spot by mistake.
 */
export function LoginCard({ event, onLoggedIn }: { event: EventPublic; onLoggedIn: (token: string) => void }) {
  const [name, setName] = useState('')
  // Who the typed name matched. null means we're still on the name step.
  const [match, setMatch] = useState<ParticipantMatch | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function findMe(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      setMatch(await api.findParticipant(event.slug, name))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't look up that name.")
    } finally {
      setSubmitting(false)
    }
  }

  async function logIn(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!match || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.login(event.slug, match.participant_id, password)
      onLoggedIn(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setSubmitting(false)
    }
  }

  function notMe() {
    setMatch(null)
    setPassword('')
    setError(null)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <EventHeader event={event} />
      {event.description && <p className="whitespace-pre-line text-muted-foreground">{event.description}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{match ? `Hi, ${match.name}` : 'Who are you?'}</CardTitle>
          <CardDescription>
            {match
              ? match.claimed
                ? 'Enter your password.'
                : 'This is your first time here, so choose a password.'
              : 'Enter your name exactly as you gave it to the organizer.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {match ? (
            <form onSubmit={logIn} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{match.claimed ? 'Password' : 'Choose a password'}</Label>
                <Input
                  id="password"
                  type="password"
                  autoFocus
                  autoComplete={match.claimed ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {!match.claimed && (
                  <p className="text-xs text-muted-foreground">
                    Nothing sensitive is stored here, so it doesn't need to be fancy. Just don't forget it.
                  </p>
                )}
              </div>

              {error && <ErrorAlert title="Couldn't log in" message={error} />}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="ghost" onClick={notMe} disabled={submitting}>
                  Not {match.name}?
                </Button>
                <Button type="submit" size="lg" variant="brand" disabled={!password || submitting}>
                  {submitting && <Loader2 className="animate-spin" />}
                  {match.claimed ? 'Log in' : 'Set password and continue'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={findMe} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  autoFocus
                  autoComplete="username"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                />
              </div>

              {error && <ErrorAlert title="Name not found" message={error} />}

              <Button type="submit" size="lg" disabled={!name.trim() || submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Continue
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Organizer?</CardTitle>
          <CardDescription>Log in with your admin password to manage this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm slug={event.slug} onLoggedIn={() => navigate(`/e/${event.slug}/admin`)} />
        </CardContent>
      </Card>
    </div>
  )
}
