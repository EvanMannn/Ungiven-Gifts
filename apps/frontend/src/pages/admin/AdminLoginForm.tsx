import { KeyRound, Loader2 } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { api } from '@/api/client'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { session } from '@/lib/session'

/** Organizer login. Saves the admin token, then hands control back via onLoggedIn. */
export function AdminLoginForm({ slug, onLoggedIn }: { slug: string; onLoggedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!password) return
    setSubmitting(true)
    setError(null)
    try {
      const { token } = await api.adminLogin(slug, password)
      session.setAdminToken(slug, token)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Admin password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <ErrorAlert title="Couldn't log in" message={error} />}
      <Button type="submit" variant="outline" disabled={!password || submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Log in as organizer
      </Button>
    </form>
  )
}
