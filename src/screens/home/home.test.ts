import { expect, it, vi } from 'vitest'
import { renderHome } from './home'

it('enters the resident portal without authentication', () => {
  const navigate = vi.fn()
  const screen = renderHome({ navigate })
  document.body.append(screen.element)

  screen.element.querySelector<HTMLButtonElement>('[data-action="resident"]')?.click()

  expect(navigate).toHaveBeenCalledWith({ name: 'resident-report' })
})

it('enters the administrator demo without authentication', () => {
  const navigate = vi.fn()
  const screen = renderHome({ navigate })
  document.body.append(screen.element)

  screen.element.querySelector<HTMLButtonElement>('[data-action="admin"]')?.click()

  expect(navigate).toHaveBeenCalledWith({ name: 'admin' })
})
