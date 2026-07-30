import L from 'leaflet'
import { expect, it, vi } from 'vitest'
import { addMarkers } from './leaflet-map'
import type { MapMarker } from './map-data'

it('emits report and candidate marker selection but not bin selection', () => {
  const group = L.layerGroup()
  const onSelect = vi.fn()
  const markers: MapMarker[] = [
    {
      id: 'report-1',
      latitude: 37.5,
      longitude: 127,
      kind: 'report',
      label: '제보',
      emphasized: false,
    },
    {
      id: 'candidate-1',
      latitude: 37.51,
      longitude: 127.01,
      kind: 'candidate',
      label: '추천',
      emphasized: true,
    },
    {
      id: 'bin-1',
      latitude: 37.52,
      longitude: 127.02,
      kind: 'bin',
      label: '쓰레기통',
      emphasized: false,
    },
  ]

  addMarkers(group, markers, onSelect)
  const layers = group.getLayers()
  layers.forEach((layer) => layer.fire('click'))

  expect(onSelect).toHaveBeenNthCalledWith(1, { kind: 'report', id: 'report-1' })
  expect(onSelect).toHaveBeenNthCalledWith(2, { kind: 'candidate', id: 'candidate-1' })
  expect(onSelect).toHaveBeenCalledTimes(2)
})
