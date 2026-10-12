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
  participants: [
    { id: 'p1', name: 'Alice', claimed: false },
    { id: 'p2', name: 'Bob', claimed: true },
  ],
  has_questionnaire: true,
  has_restrictions: true,
  groups_enabled: true,
}

const dashboard: Dashboard = {
  event,
  participant_id: 'p1',
  name: 'Alice',
  recipient: { name: 'Bob', answers: [{ question: 'Pet cards?', answer: 'Mulldrifter' }] },
  restriction_options: ['Mono-colored', 'No tutors'],
  chosen_restriction: null,
  group_mates: ['Cara'],
  onboarded: false,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/e/abc']}>
      <Routes>
        <Route path="/e/:slug" element={<EventPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.getEvent).mockReset().mockResolvedValue(event)
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

    await user.click(await screen.findByRole('radio', { name: 'Alice' }))
    await user.type(screen.getByLabelText('Choose a password, Alice'), 'pw')
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

  it('goes straight to the dashboard for a returning participant', async () => {
    session.setToken('abc', 'tok')
    vi.mocked(api.dashboard).mockResolvedValue({ ...dashboard, chosen_restriction: 'Mono-colored', onboarded: true })
    renderPage()
    expect(await screen.findByText("You're building for")).toBeInTheDocument()
    expect(api.getEvent).not.toHaveBeenCalled()
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
