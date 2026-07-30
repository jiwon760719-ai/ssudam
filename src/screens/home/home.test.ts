import { expect, it, vi } from 'vitest'
import { renderHome } from './home'

it('presents the approved home hierarchy and value summary', () => {
  const screen = renderHome({ navigate() {} })
  document.body.append(screen.element)

  expect(screen.element.querySelector('.app-bar')).not.toBeNull()
  expect(screen.element.querySelector('h1')?.textContent).toContain('발견하고, 함께 바꿔요.')
  expect(screen.element.querySelector('[data-action="resident"]')?.textContent)
    .toContain('주민 제보 시작')
  expect(screen.element.querySelector('[data-action="admin"]')?.textContent)
    .toContain('관리자 데모')
  expect(screen.element.querySelectorAll('.value-item')).toHaveLength(3)
})

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
