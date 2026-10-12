import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import type { AdminView } from '@/api/types'
import { TooltipProvider } from '@/components/ui/tooltip'
import { session } from '@/lib/session'
import AdminPage from './AdminPage'

vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  api: { adminLogin: vi.fn(), adminView: vi.fn() },
}))

const view: AdminView = {
  event: {
    slug: 'abc',
    name: 'Playgroup Santa',
    format: 'Commander',
    description: '',
    budget: null,
    exchange_date: null,
    has_questionnaire: false,
    has_restrictions: false,
    groups_enabled: false,
  },
  questions: [],
  restrictions: [],
  participants: [
    { id: 'p1', name: 'Alice', group: null, claimed: true, onboarded: false, chose_restriction: false },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/e/abc/admin']}>
      <TooltipProvider>
        <Routes>
          <Route path="/e/:slug/admin" element={<AdminPage />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.adminLogin).mockReset().mockResolvedValue({ token: 'admin-tok' })
    vi.mocked(api.adminView).mockReset().mockResolvedValue(view)
  })

  it('asks for the admin password, then shows the dashboard', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Admin password'), 'admin-pw')
    await user.click(screen.getByRole('button', { name: 'Log in as organizer' }))
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(api.adminView).toHaveBeenCalledWith('abc', 'admin-tok')
  })

  it('shows the error for a wrong password', async () => {
    vi.mocked(api.adminLogin).mockRejectedValue(new ApiError(401, 'Wrong admin password.'))
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Admin password'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Log in as organizer' }))
    expect(await screen.findByText('Wrong admin password.')).toBeInTheDocument()
  })

  it('forgets a rejected token and asks to log in again', async () => {
    session.setAdminToken('abc', 'stale')
    vi.mocked(api.adminView).mockRejectedValue(new ApiError(401, 'Please log in as the organizer.'))
    renderPage()

    expect(await screen.findByText('Organizer login')).toBeInTheDocument()
    expect(session.adminToken('abc')).toBeUndefined()
  })
})
