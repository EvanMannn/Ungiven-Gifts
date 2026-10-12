import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { SimpleSelect } from './SimpleSelect'

// Radix Select uses pointer capture and scrollIntoView, which jsdom doesn't implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

function Harness() {
  const [value, setValue] = useState('')
  return (
    <>
      <SimpleSelect aria-label="Person" value={value} onChange={setValue} options={['Alice', 'Bob']} placeholder="Someone" />
      <button type="button" onClick={() => setValue('')}>
        Clear
      </button>
      <output>{value || 'none'}</output>
    </>
  )
}

describe('SimpleSelect', () => {
  it('shows the placeholder after being cleared, and the same option can be picked again', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('combobox', { name: 'Person' }))
    await user.click(await screen.findByRole('option', { name: 'Alice' }))
    expect(screen.getByRole('status')).toHaveTextContent('Alice')

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('combobox', { name: 'Person' })).toHaveTextContent('Someone')

    await user.click(screen.getByRole('combobox', { name: 'Person' }))
    await user.click(await screen.findByRole('option', { name: 'Alice' }))
    expect(screen.getByRole('status')).toHaveTextContent('Alice')
  })
})
