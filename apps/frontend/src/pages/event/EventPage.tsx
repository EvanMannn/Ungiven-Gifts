import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ApiError, api } from '@/api/client'
import type { Dashboard, EventPublic } from '@/api/types'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Loading } from '@/components/Loading'
import { session } from '@/lib/session'
import NotFoundPage from '../NotFoundPage'
import { DashboardView } from './DashboardView'
import { LoginCard } from './LoginCard'
import { RevealCarousel } from './RevealCarousel'

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'login'; event: EventPublic }
  | { kind: 'ready'; dashboard: Dashboard }

export default function EventPage() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [replaying, setReplaying] = useState(false)

  const load = useCallback(async () => {
    const token = session.token(slug)
    try {
      if (token) {
        try {
          setState({ kind: 'ready', dashboard: await api.dashboard(slug, token) })
          return
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 401)) throw e
          session.setToken(slug, undefined)
        }
      }
      setState({ kind: 'login', event: await api.getEvent(slug) })
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setState({ kind: 'not-found' })
      else setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load the event.' })
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  switch (state.kind) {
    case 'loading':
      return <Loading />
    case 'not-found':
      return <NotFoundPage message="That event doesn't exist. Double-check the link you were sent." />
    case 'error':
      return <ErrorAlert message={state.message} />
    case 'login':
      return (
        <LoginCard
          event={state.event}
          onLoggedIn={(token) => {
            session.setToken(slug, token)
            setState({ kind: 'loading' })
            load()
          }}
        />
      )
    case 'ready': {
      const { dashboard } = state
      const token = session.token(slug) ?? ''
      const setDashboard = (d: Dashboard) => setState({ kind: 'ready', dashboard: d })

      if (!dashboard.onboarded || replaying) {
        return (
          <RevealCarousel
            slug={slug}
            token={token}
            dashboard={dashboard}
            onChange={setDashboard}
            onFinish={(d) => {
              setReplaying(false)
              setDashboard(d)
            }}
          />
        )
      }
      return (
        <DashboardView
          slug={slug}
          token={token}
          dashboard={dashboard}
          onChange={setDashboard}
          onReplay={() => setReplaying(true)}
          onLogout={() => {
            session.setToken(slug, undefined)
            setState({ kind: 'loading' })
            load()
          }}
        />
      )
    }
  }
}
