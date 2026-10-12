import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import type { Dashboard, EventPublic } from '@/api/types'
import { session } from '@/lib/session'
import EventPage from './EventPage'

vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  api: {
    getEvent: vi.fn(),
    adminLogin: vi.fn(),
    findParticipant: vi.fn(),
    login: vi.fn(),
    dashboard: vi.fn(),
    chooseRestriction: vi.fn(),
    finishOnboarding: vi.fn(),
  },
}))

const event: EventPublic = {
  slug: 'abc',
  name: 'Playgroup Santa',
  format: 'Commander',
  description: '',
  budget: '$40',
  exchange_date: '2026-12-18',
  has_questionnaire: true,
  has_restrictions: true,
  groups_enabled: true,
}

const dashboard: Dashboard = {
  event,
  participant_id: 'p1',
  name: 'Alice',
  recipient: { name: 'Bob', answers: [{ question: 'Pet cards?', answer: 'Mulldrifter' }] },
  restriction_options: [
    { title: 'Mono-colored', description: 'One color only.' },
    { title: 'No tutors', description: '' },
  ],
  chosen_restriction: null,
  group_mates: ['Cara'],
  onboarded: false,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/e/abc']}>
      <Routes>
        <Route path="/e/:slug" element={<EventPage />} />
        <Route path="/e/:slug/admin" element={<p>Admin page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.getEvent).mockReset().mockResolvedValue(event)
    vi.mocked(api.findParticipant)
      .mockReset()
      .mockResolvedValue({ participant_id: 'p1', name: 'Alice', claimed: false })
    vi.mocked(api.login).mockReset().mockResolvedValue({ token: 'tok', participant_id: 'p1', first_login: true })
    vi.mocked(api.dashboard).mockReset().mockResolvedValue(dashboard)
    vi.mocked(api.chooseRestriction).mockReset().mockResolvedValue({ ...dashboard, chosen_restriction: 'No tutors' })
    vi.mocked(api.finishOnboarding)
      .mockReset()
      .mockResolvedValue({ ...dashboard, chosen_restriction: 'No tutors', onboarded: true })
  })

  it('walks a new participant from login through the reveal to the dashboard', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Your name'), 'alice')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(api.findParticipant).toHaveBeenCalledWith('abc', 'alice')

    await user.type(await screen.findByLabelText('Choose a password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Set password and continue' }))
    expect(api.login).toHaveBeenCalledWith('abc', 'p1', 'pw')
    expect(session.token('abc')).toBe('tok')

    // Step 1: unwrap the giftee before moving on.
    expect(await screen.findByRole('button', { name: /next/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /unwrap/i }))
    expect(screen.getByText('Bob')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 2: their questionnaire answers.
    expect(screen.getByText('Mulldrifter')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 3: a restriction must be picked.
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'No tutors' }))
    expect(api.chooseRestriction).toHaveBeenCalledWith('abc', 'tok', 'No tutors')
    await user.click(await screen.findByRole('button', { name: /next/i }))

    // Step 4: build group, then the dashboard.
    expect(screen.getByText('Cara')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go to my dashboard' }))
    expect(await screen.findByText("You're building for")).toBeInTheDocument()
    expect(api.finishOnboarding).toHaveBeenCalledWith('abc', 'tok')
  })

  it('shows an error for a name that is not in the event', async () => {
    vi.mocked(api.findParticipant).mockRejectedValue(new ApiError(404, 'Nobody by that name is in this event.'))
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Your name'), 'Alicia')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Nobody by that name is in this event.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Choose a password')).not.toBeInTheDocument()
  })

  it('asks a returning participant for their password, and lets them go back', async () => {
    vi.mocked(api.findParticipant).mockResolvedValue({ participant_id: 'p2', name: 'Bob', claimed: true })
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Your name'), 'Bob')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Not Bob?' }))
    expect(screen.getByLabelText('Your name')).toHaveValue('Bob')
  })

  it('lets the organizer log in from the login page and sends them to the admin page', async () => {
    vi.mocked(api.adminLogin).mockReset().mockResolvedValue({ token: 'admin-tok' })
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Admin password'), 'admin-pw')
    await user.click(screen.getByRole('button', { name: 'Log in as organizer' }))
    expect(api.adminLogin).toHaveBeenCalledWith('abc', 'admin-pw')
    expect(await screen.findByText('Admin page')).toBeInTheDocument()
    expect(session.adminToken('abc')).toBe('admin-tok')
  })

  it('goes straight to the dashboard for a returning participant', async () => {
    session.setToken('abc', 'tok')
    vi.mocked(api.dashboard).mockResolvedValue({ ...dashboard, chosen_restriction: 'Mono-colored', onboarded: true })
    renderPage()
    expect(await screen.findByText("You're building for")).toBeInTheDocument()
    expect(api.getEvent).not.toHaveBeenCalled()
  })

  it('puts your build on the left, event info on the right, and the answers full width below', async () => {
    session.setToken('abc', 'tok')
    vi.mocked(api.dashboard).mockResolvedValue({
      ...dashboard,
      event: { ...event, description: 'Swap at the shop.' },
      chosen_restriction: 'Mono-colored',
      onboarded: true,
    })
    renderPage()

    // Each widget's title sits in its card; the card's parent is the column it's in.
    const column = (title: string) => screen.getByText(title).closest('[data-slot="card"]')?.parentElement
    expect(await screen.findByText('Your restriction')).toBeInTheDocument()
    const left = column("You're building for")
    expect(column('Your restriction')).toBe(left)

    const right = column('Gift exchange')
    expect(right).not.toBe(left)
    expect(column('From the organizer')).toBe(right)
    expect(column('Safe to talk to')).toBe(right)

    // The answers sit beside the two-column grid, not inside either column.
    const grid = left?.parentElement
    expect(column('About Bob')).toBe(grid?.parentElement)
  })

  it('leaves out the event-info column when there is nothing to put in it', async () => {
    session.setToken('abc', 'tok')
    vi.mocked(api.dashboard).mockResolvedValue({
      ...dashboard,
      event: { ...event, exchange_date: null, description: '' },
      group_mates: null,
      onboarded: true,
    })
    renderPage()

    expect(await screen.findByText("You're building for")).toBeInTheDocument()
    expect(screen.queryByText('Gift exchange')).not.toBeInTheDocument()
    expect(screen.queryByText('From the organizer')).not.toBeInTheDocument()
  })

  it('falls back to login when the saved session has expired', async () => {
    session.setToken('abc', 'stale')
    vi.mocked(api.dashboard).mockRejectedValue(new ApiError(401, 'Please log in again.'))
    renderPage()
    expect(await screen.findByText('Who are you?')).toBeInTheDocument()
    expect(session.token('abc')).toBeUndefined()
  })

  it('skips the optional steps an event does not use', async () => {
    session.setToken('abc', 'tok')
    vi.mocked(api.dashboard).mockResolvedValue({
      ...dashboard,
      event: { ...event, has_questionnaire: false, has_restrictions: false, groups_enabled: false },
      restriction_options: [],
      group_mates: null,
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /unwrap/i }))
    expect(screen.getByText(/1\/1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to my dashboard' })).toBeEnabled()
  })

  it('shows a not-found page for an unknown event', async () => {
    vi.mocked(api.getEvent).mockRejectedValue(new ApiError(404, 'Event not found.'))
    renderPage()
    expect(await screen.findByText(/doesn't exist/)).toBeInTheDocument()
  })
})
