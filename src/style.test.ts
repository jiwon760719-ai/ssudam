import { describe, expect, it } from 'vitest'
import globalCss from './style.css?raw'
import adminCss from './screens/admin/admin.css?raw'
import homeCss from './screens/home/home.css?raw'
import residentCss from './screens/resident/resident.css?raw'
import mapCss from './map/map.css?raw'

function cssDeclaration(css: string, selector: string, property: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rule = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  const declaration = rule?.[1].match(new RegExp(`${property}:\\s*([^;]+)`))
  if (!declaration) throw new Error(`Missing ${property} declaration for ${selector}`)
  return declaration[1].trim()
}

function tokenValue(token: string): string {
  const declaration = globalCss.match(new RegExp(`${token}:\\s*([^;]+)`))
  if (!declaration) throw new Error(`Missing color token ${token}`)
  return declaration[1].trim()
}

function rgb(color: string): [number, number, number] {
  if (color === 'white') return [255, 255, 255]
  const hex = color.match(/^#([\dA-F]{6})$/i)?.[1]
  if (!hex) throw new Error(`Unsupported color ${color}`)
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function resolveColor(value: string): [number, number, number] {
  const variable = value.match(/^var\((--[\w-]+)\)$/)
  if (variable) return resolveColor(tokenValue(variable[1]))

  const mix = value.match(
    /^color-mix\(in srgb,\s*(.+?)\s+(\d+)%\s*,\s*(.+?)\)$/,
  )
  if (mix) {
    const foreground = resolveColor(mix[1])
    const background = resolveColor(mix[3])
    const weight = Number(mix[2]) / 100
    return foreground.map(
      (channel, index) => Math.round(channel * weight + background[index] * (1 - weight)),
    ) as [number, number, number]
  }

  return rgb(value)
}

function relativeLuminance(color: [number, number, number]): number {
  const [red, green, blue] = color.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string): number {
  const luminances = [
    relativeLuminance(resolveColor(foreground)),
    relativeLuminance(resolveColor(background)),
  ].sort((left, right) => right - left)
  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}

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

  it('keeps the focus ring at 3:1 against page and component surfaces', () => {
    const focusSelector =
      'button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible'
    const outline = cssDeclaration(globalCss, focusSelector, 'outline')
    const outlineColor = outline.replace(/^3px solid\s+/, '')

    for (const background of [
      'var(--md-canvas)',
      'var(--md-surface)',
      'var(--md-surface-variant)',
    ]) {
      expect(contrastRatio(outlineColor, background)).toBeGreaterThanOrEqual(3)
    }
  })

  it.each([
    ['home app-bar supporting copy', homeCss, '.app-bar-label', 'var(--md-canvas)'],
    ['home value supporting copy', homeCss, '.value-item span', 'var(--md-surface-variant)'],
    [
      'home resident CTA supporting copy',
      homeCss,
      '.button--filled.role-action span',
      'var(--md-primary)',
    ],
    [
      'home admin CTA supporting copy',
      homeCss,
      '.button--tonal.role-action span',
      'var(--md-primary-container)',
    ],
    ['resident introduction', residentCss, '.screen-intro', 'var(--md-canvas)'],
    ['resident report identifier label', residentCss, '.report-id-row dt', 'var(--md-surface-variant)'],
    [
      'admin app-bar supporting copy',
      adminCss,
      '.admin-app-bar .app-bar-label',
      'var(--md-canvas)',
    ],
    [
      'admin dashboard introduction',
      adminCss,
      '.dashboard-intro > div > p:last-child',
      'var(--md-canvas)',
    ],
    ['admin recommendation evidence', adminCss, '.candidate-card dt', 'var(--md-surface-variant)'],
  ])('keeps %s at 4.5:1', (_name, css, selector, background) => {
    const foreground = cssDeclaration(css, selector, 'color')
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps Leaflet controls touch accessible', () => {
    expect(mapCss).toMatch(/\.leaflet-bar a[\s\S]*min-width:\s*44px/)
    expect(mapCss).toMatch(/\.leaflet-bar a[\s\S]*min-height:\s*44px/)
  })
})
