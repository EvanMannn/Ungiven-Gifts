import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MAX_BUDGET } from '@/lib/format'
import { BudgetInput } from './BudgetInput'

function Harness() {
  const [value, setValue] = useState('')
  return <BudgetInput id="budget" value={value} onChange={setValue} />
}

describe('BudgetInput', () => {
  it('drops minus signs and letters, and keeps at most two decimal places', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByRole('textbox')

    await user.type(box, '-4a0.5.67')
    expect(box).toHaveValue('40.56')
  })

  it('ignores keystrokes that would go over the cap', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByRole('textbox')

    await user.type(box, `${MAX_BUDGET}`)
    expect(box).toHaveValue(String(MAX_BUDGET))
    await user.type(box, '0')
    expect(box).toHaveValue(String(MAX_BUDGET))
  })
})
