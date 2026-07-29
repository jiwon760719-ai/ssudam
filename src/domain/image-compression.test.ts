import { describe, expect, it } from 'vitest'
import { calculateContainSize } from './image-compression'

describe('calculateContainSize', () => {
  it.each([
    [4000, 3000, { width: 1280, height: 960 }],
    [1000, 2000, { width: 640, height: 1280 }],
    [800, 600, { width: 800, height: 600 }],
    [1, 3000, { width: 1, height: 1280 }],
  ])('fits %sx%s inside 1280px', (width, height, expected) => {
    expect(calculateContainSize(width, height, 1280)).toEqual(expected)
  })
})
