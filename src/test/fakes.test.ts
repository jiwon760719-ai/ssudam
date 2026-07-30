import { expect, it, vi } from 'vitest'
import { createMapFactoryFake } from './fakes'

it('invokes and disposes fake marker selection subscriptions', () => {
  const map = createMapFactoryFake()
  const adapter = map.factory(document.createElement('div'), {
    center: { latitude: 37.5665, longitude: 126.978 },
    zoom: 13,
    onTileError() {},
    onTileReady() {},
  })
  const listener = vi.fn()
  const dispose = adapter.onMarkerSelect(listener)

  map.selectMarker('report', 'report-1')
  expect(listener).toHaveBeenCalledWith({ kind: 'report', id: 'report-1' })

  dispose()
  map.selectMarker('candidate', 'candidate-1')
  expect(listener).toHaveBeenCalledTimes(1)
})
