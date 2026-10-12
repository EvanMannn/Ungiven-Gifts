import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { DatePicker } from './DatePicker'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <DatePicker id="date" value={value} onChange={setValue} />
      <output>{value || 'none'}</output>
    </>
  )
}

describe('DatePicker', () => {
  it('shows a placeholder until a date is picked', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: /pick a date/i })).toBeInTheDocument()
  })

  it('opens on the chosen month, saves the picked day as YYYY-MM-DD, and can be cleared', async () => {
    const user = userEvent.setup()
    // Far in the future, so "no past dates" never gets in the way of the test.
    render(<Harness initial="2099-12-18" />)

    await user.click(screen.getByRole('button', { name: /Dec 18, 2099/ }))
    await user.click(screen.getByRole('button', { name: /December 20th, 2099/ }))
    expect(screen.getByRole('status')).toHaveTextContent('2099-12-20')

    await user.click(screen.getByRole('button', { name: /Dec 20, 2099/ }))
    await user.click(screen.getByRole('button', { name: /clear date/i }))
    expect(screen.getByRole('status')).toHaveTextContent('none')
  })
})
