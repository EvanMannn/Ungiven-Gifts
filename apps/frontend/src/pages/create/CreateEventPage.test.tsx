import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { session } from '@/lib/session'
import CreateEventPage from './CreateEventPage'

vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  api: { createEvent: vi.fn() },
}))

async function enterAdminPassword(user: ReturnType<typeof userEvent.setup>, confirm = 'admin-pw') {
  await user.type(screen.getByLabelText('Admin password'), 'admin-pw')
  await user.type(screen.getByLabelText('Admin password again'), confirm)
}

function renderPage() {
  return render(
    // AppShell provides TooltipProvider in the real app; the page is rendered on its own here.
    <MemoryRouter>
      <TooltipProvider>
        <CreateEventPage />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('CreateEventPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.createEvent).mockReset()
    // jsdom's scrollTo returns undefined; real browsers now return a Promise. Match the browser so
    // an effect that accidentally returns scrollTo()'s result fails here too.
    window.scrollTo = vi.fn(() => Promise.resolve()) as unknown as typeof window.scrollTo
  })

  it('validates, reviews, creates, and shows the share links', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createEvent).mockResolvedValue({
      slug: 'abc23456',
      admin_token: 'admin-tok',
      organizer_participant_id: null,
      organizer_token: null,
    })
    renderPage()

    // Continue stays disabled until both admin password boxes are filled in.
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    await enterAdminPassword(user)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText('A few things need fixing')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Event name'), 'Playgroup Santa')
    await user.type(screen.getByLabelText(/^Names/), 'Alice\nBob\nCara')
    await user.type(screen.getByLabelText('Title'), 'Mono-colored')
    await user.type(screen.getByLabelText('Description'), 'One color only.')
    await user.click(screen.getByRole('button', { name: 'Add restriction' }))
    await user.type(screen.getByLabelText('Title'), 'No tutors{Enter}')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // 3 people can't be split evenly, so the groups step has nothing to offer.
    expect(screen.getByText(/3 people can't be split/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review/i }))

    expect(screen.getByText('Look good?')).toBeInTheDocument()
    expect(screen.getByText('Alice, Bob, Cara')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create event/i }))
    expect(api.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Playgroup Santa',
        format: 'Commander',
        restrictions: [
          { title: 'Mono-colored', description: 'One color only.' },
          { title: 'No tutors', description: '' },
        ],
        admin_password: 'admin-pw',
        participants: [
          expect.objectContaining({ name: 'Alice' }),
          expect.objectContaining({ name: 'Bob' }),
          expect.objectContaining({ name: 'Cara' }),
        ],
      }),
    )
    expect(await screen.findByText('Playgroup Santa is ready')).toBeInTheDocument()
    expect(screen.getByLabelText('Participant link')).toHaveValue(`${window.location.origin}/e/abc23456`)
    expect(screen.getByLabelText('Admin link')).toHaveValue(`${window.location.origin}/e/abc23456/admin`)
    expect(session.adminToken('abc23456')).toBe('admin-tok')
    // Passwords never end up in the saved draft.
    expect(localStorage.getItem('ungiven-gifts:create-draft') ?? '').not.toContain('admin-pw')
  })

  it('shows the API error and stays on review when creation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createEvent).mockRejectedValue(new Error('There is nobody Alice is allowed to gift to.'))
    renderPage()

    await user.type(screen.getByLabelText('Event name'), 'X')
    await user.type(screen.getByLabelText(/^Names/), 'Alice\nBob')
    await enterAdminPassword(user)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /review/i }))
    await user.click(screen.getByRole('button', { name: /create event/i }))

    expect(await screen.findByText('There is nobody Alice is allowed to gift to.')).toBeInTheDocument()
    expect(screen.getByText('Look good?')).toBeInTheDocument()
  })

  it('offers only even group sizes and sends the chosen one', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createEvent).mockResolvedValue({
      slug: 'abc23456',
      admin_token: 'admin-tok',
      organizer_participant_id: null,
      organizer_token: null,
    })
    renderPage()

    await user.type(screen.getByLabelText('Event name'), 'X')
    await user.type(screen.getByLabelText(/^Names/), 'Alice\nBob\nCara\nDan')
    await enterAdminPassword(user)
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await user.click(screen.getByRole('radio', { name: /yes, split/i }))
    // 4 people: only groups of 2 split evenly into at least two groups.
    expect(screen.getAllByRole('radio', { name: /per group/i })).toHaveLength(1)
    await user.click(screen.getByRole('radio', { name: /2 per group/i }))
    await user.click(screen.getByRole('button', { name: /review/i }))

    expect(screen.getByText('2 groups of 2, assigned randomly')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create event/i }))
    expect(api.createEvent).toHaveBeenCalledWith(expect.objectContaining({ group_size: 2 }))
  })

  it('lists restrictions as collapsed rows, opening one description at a time', async () => {
    const user = userEvent.setup()
    renderPage()
    for (const [title, description] of [
      ['Treehugger', 'Trees in every art.'],
      ['Gamba', 'Coin flips and dice.'],
    ]) {
      await user.type(screen.getByLabelText('Title'), title)
      await user.type(screen.getByLabelText('Description'), description)
      await user.click(screen.getByRole('button', { name: 'Add restriction' }))
    }

    // Collapsed by default.
    expect(screen.queryByText('Trees in every art.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Treehugger' }))
    expect(screen.getByText('Trees in every art.')).toBeInTheDocument()

    // Opening another closes the first.
    await user.click(screen.getByRole('button', { name: 'Gamba' }))
    expect(screen.getByText('Coin flips and dice.')).toBeInTheDocument()
    expect(screen.queryByText('Trees in every art.')).not.toBeInTheDocument()

    // A title already listed can't be added again.
    await user.type(screen.getByLabelText('Title'), 'gamba')
    expect(screen.getByText('That one is already in the list.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add restriction' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Remove Gamba' }))
    expect(screen.queryByRole('button', { name: 'Gamba' })).not.toBeInTheDocument()
  })

  it('stops on mismatched admin passwords', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Event name'), 'X')
    await user.type(screen.getByLabelText(/^Names/), 'Alice\nBob')
    await enterAdminPassword(user, 'typo')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getAllByText("The admin passwords don't match.").length).toBeGreaterThan(0)
    expect(screen.getByText('Create an event')).toBeInTheDocument()
  })

  it('restores an unsent draft after a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = renderPage()
    await user.type(screen.getByLabelText('Event name'), 'Saved draft')
    unmount()

    renderPage()
    expect(screen.getByLabelText('Event name')).toHaveValue('Saved draft')
  })
})
