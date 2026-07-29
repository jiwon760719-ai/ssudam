import { afterEach } from 'vitest'

afterEach(() => {
  document.body.replaceChildren()
  window.location.hash = '#/'
  localStorage.clear()
})
