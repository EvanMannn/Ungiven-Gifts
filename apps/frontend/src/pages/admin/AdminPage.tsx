import { Check, Eye, KeyRound, Loader2, Minus } from 'lucide-react'
import { type SubmitEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError, api } from '@/api/client'
import type { AdminParticipant, AdminView } from '@/api/types'
import { BudgetInput } from '@/components/BudgetInput'
import { CopyField } from '@/components/CopyField'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Field } from '@/components/Field'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { eventUrl, formatBudget, parseBudget } from '@/lib/format'
import { session } from '@/lib/session'
import NotFoundPage from '../NotFoundPage'
import { EventHeader } from '../event/EventHeader'
import { AdminLoginForm } from './AdminLoginForm'

type State =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; view: AdminView }

export default function AdminPage() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<State>({ kind: 'loading' })

  const load = useCallback(async () => {
    const token = session.adminToken(slug)
    if (!token) return setState({ kind: 'login' })
    try {
      setState({ kind: 'ready', view: await api.adminView(slug, token) })
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setState({ kind: 'not-found' })
      else if (e instanceof ApiError && e.status === 401) {
        // Expired or not an admin token: forget it and ask for the password.
        session.setAdminToken(slug, undefined)
        setState({ kind: 'login' })
      } else setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load the event.' })
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  switch (state.kind) {
    case 'loading':
      return <Loading />
    case 'not-found':
      return <NotFoundPage message="That event doesn't exist." />
    case 'error':
      return <ErrorAlert message={state.message} />
    case 'login':
      return (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-gold" /> Organizer login
            </CardTitle>
            <CardDescription>Enter the admin password you chose when you created the event.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLoginForm
              slug={slug}
              onLoggedIn={() => {
                setState({ kind: 'loading' })
                load()
              }}
            />
          </CardContent>
        </Card>
      )
    case 'ready':
      return (
        <AdminDashboard
          slug={slug}
          token={session.adminToken(slug) ?? ''}
          view={state.view}
          onChange={(view) => setState({ kind: 'ready', view })}
        />
      )
  }
}

function AdminDashboard({
  slug,
  token,
  view,
  onChange,
}: {
  slug: string
  token: string
  view: AdminView
  onChange: (v: AdminView) => void
}) {
  const ps = view.participants
  const total = ps.length
  return (
    <div className="flex flex-col gap-6">
      <EventHeader
        event={view.event}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/e/${slug}`}>
              <Eye /> Participant view
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Share with participants</CardTitle>
          <CardDescription>Everyone uses this same link and enters their own name.</CardDescription>
        </CardHeader>
        <CardContent>
          <CopyField label="Participant link" value={eventUrl(slug)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Logged in" value={ps.filter((p) => p.claimed).length} total={total} />
        <Stat label="Seen their giftee" value={ps.filter((p) => p.onboarded).length} total={total} />
        {view.restrictions.length > 0 && (
          <Stat label="Picked a restriction" value={ps.filter((p) => p.chose_restriction).length} total={total} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Participants</CardTitle>
          <CardDescription>
            Who has whom stays secret, even from you. If someone forgets their password, reset it and they can choose a
            new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipantsTable slug={slug} token={token} view={view} onChange={onChange} />
        </CardContent>
      </Card>

      <EditDetails slug={slug} token={token} view={view} onChange={onChange} />
    </div>
  )
}

function Stat({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="font-bold">
            {value}
            <span className="text-muted-foreground">/{total}</span>
          </span>
        </div>
        <Progress value={total ? (value / total) * 100 : 0} className="h-1.5" />
      </CardContent>
    </Card>
  )
}

function ParticipantsTable({
  slug,
  token,
  view,
  onChange,
}: {
  slug: string
  token: string
  view: AdminView
  onChange: (v: AdminView) => void
}) {
  const [resetting, setResetting] = useState<string | null>(null)
  const showGroups = view.event.groups_enabled
  const showRestriction = view.restrictions.length > 0

  async function reset(p: AdminParticipant) {
    if (!window.confirm(`Reset ${p.name}'s password? Their next login sets a new one.`)) return
    setResetting(p.id)
    try {
      onChange(await api.resetPassword(slug, token, p.id))
      toast.success(`${p.name} can now set a new password.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed.')
    } finally {
      setResetting(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          {showGroups && <TableHead>Group</TableHead>}
          <TableHead className="text-center">Logged in</TableHead>
          <TableHead className="text-center">Seen giftee</TableHead>
          {showRestriction && <TableHead className="text-center">Restriction</TableHead>}
          <TableHead className="sr-only">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {view.participants.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.name}</TableCell>
            {showGroups && (
              <TableCell>
                <Badge variant="secondary">{p.group}</Badge>
              </TableCell>
            )}
            <StatusCell done={p.claimed} />
            <StatusCell done={p.onboarded} />
            {showRestriction && <StatusCell done={p.chose_restriction} />}
            <TableCell className="text-right">
              {p.claimed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => reset(p)}
                      disabled={resetting !== null}
                      aria-label={`Reset ${p.name}'s password`}
                    >
                      {resetting === p.id ? <Loader2 className="animate-spin" /> : <KeyRound />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset password</TooltipContent>
                </Tooltip>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function StatusCell({ done }: { done: boolean }) {
  return (
    <TableCell className="text-center">
      {done ? (
        <Check className="mx-auto size-4 text-primary" aria-label="Yes" />
      ) : (
        <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Not yet" />
      )}
    </TableCell>
  )
}

function EditDetails({
  slug,
  token,
  view,
  onChange,
}: {
  slug: string
  token: string
  view: AdminView
  onChange: (v: AdminView) => void
}) {
  const { event } = view
  const [form, setForm] = useState({
    name: event.name,
    format: event.format,
    budget: String(parseBudget(event.budget) ?? ''),
    exchange_date: event.exchange_date ?? '',
    description: event.description,
  })
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      onChange(
        await api.updateEvent(slug, token, {
          name: form.name.trim(),
          format: form.format.trim(),
          budget: formatBudget(parseBudget(form.budget)),
          exchange_date: form.exchange_date || null,
          description: form.description.trim(),
        }),
      )
      toast.success('Event updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit details</CardTitle>
        <CardDescription>Changes show up for everyone right away. The draw itself can't be changed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Event name" htmlFor="edit-name">
              <Input id="edit-name" required maxLength={60} value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Format" htmlFor="edit-format">
              <Input id="edit-format" required maxLength={60} value={form.format} onChange={(e) => set({ format: e.target.value })} />
            </Field>
            <Field label="Budget" htmlFor="edit-budget">
              <BudgetInput id="edit-budget" value={form.budget} onChange={(budget) => set({ budget })} />
            </Field>
            <Field label="Gift exchange date" htmlFor="edit-date">
              <Input id="edit-date" type="date" value={form.exchange_date} onChange={(e) => set({ exchange_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes for participants" htmlFor="edit-description">
            <Textarea
              id="edit-description"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <Button type="submit" className="self-end" disabled={saving || !form.name.trim() || !form.format.trim()}>
            {saving && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
