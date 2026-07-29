import { describe, expect, it } from 'vitest'
import { parseHash, toHash } from './router'

describe('parseHash', () => {
  it.each([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/resident/report', { name: 'resident-report' }],
    ['#/resident/complete/SSUDAM-1', { name: 'resident-complete', reportId: 'SSUDAM-1' }],
    ['#/admin', { name: 'admin' }],
    ['#/unknown', { name: 'home' }],
  ])('maps %s to the expected app route', (hash, expected) => {
    expect(parseHash(hash)).toEqual(expected)
  })
})

describe('toHash', () => {
  it('encodes a report id in the completion route', () => {
    expect(toHash({ name: 'resident-complete', reportId: 'SSUDAM 1' }))
      .toBe('#/resident/complete/SSUDAM%201')
  })
})
