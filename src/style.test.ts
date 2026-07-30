import { describe, expect, it } from 'vitest'
import globalCss from './style.css?raw'

describe('Material You global design contract', () => {
  it.each([
    ['--md-primary', '#225F4D'],
    ['--md-primary-hover', '#184C3C'],
    ['--md-secondary', '#397763'],
    ['--md-primary-container', '#DCEFE4'],
    ['--md-canvas', '#F5F8F3'],
    ['--md-surface', '#FFFFFF'],
    ['--md-surface-variant', '#EDF3EF'],
    ['--md-ink', '#18372D'],
    ['--md-muted', '#69756F'],
    ['--md-outline', '#DFE7E2'],
    ['--md-error', '#B3261E'],
    ['--md-error-container', '#F9DEDC'],
    ['--md-warning-container', '#FFF1C2'],
  ])('defines %s as %s', (token, value) => {
    expect(globalCss).toContain(`${token}: ${value}`)
  })

  it('keeps controls accessible and honors reduced motion', () => {
    expect(globalCss).toMatch(/min-height:\s*44px/)
    expect(globalCss).toMatch(/outline:\s*3px solid/)
    expect(globalCss).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
