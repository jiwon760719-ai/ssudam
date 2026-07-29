import { describe, expect, it } from 'vitest'
import { CITY_OPTIONS, getCity } from './cities'

describe('CITY_OPTIONS', () => {
  it('contains the complete city-level catalog with unique codes', () => {
    expect(CITY_OPTIONS.length).toBeGreaterThanOrEqual(85)
    expect(new Set(CITY_OPTIONS.map((city) => city.code)).size).toBe(CITY_OPTIONS.length)
  })

  it.each([
    ['11', '서울특별시'],
    ['26', '부산광역시'],
    ['36', '세종특별자치시'],
    ['41110', '수원시'],
    ['50110', '제주시'],
  ])('contains %s as %s with a valid center', (code, name) => {
    const city = getCity(code)
    expect(city?.name).toBe(name)
    expect(city?.centerLatitude).toBeGreaterThan(33)
    expect(city?.centerLatitude).toBeLessThan(39)
    expect(city?.centerLongitude).toBeGreaterThan(124)
    expect(city?.centerLongitude).toBeLessThan(132)
  })
})
