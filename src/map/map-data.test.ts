import { expect, it } from 'vitest'
import { toCandidateMarkers, toReportMarkers } from './map-data'

it('marks resident reports as new reports', () => {
  const markers = toReportMarkers([
    {
      id: 'R1',
      cityCode: '11',
      cityName: '서울특별시',
      latitude: 37.5,
      longitude: 127,
      createdAt: '2026-07-29T00:00:00.000Z',
      photoDataUrl: 'data:image/webp;base64,AAAA',
      source: 'resident',
    },
  ])

  expect(markers[0]).toMatchObject({ id: 'R1', kind: 'report', emphasized: true })
})

it('formats candidate evidence for the popup', () => {
  const markers = toCandidateMarkers([
    {
      id: 'C1',
      cityCode: '11',
      latitude: 37.5,
      longitude: 127,
      score: 88,
      reportCount: 12,
      recurrenceScore: 0.7,
      nearestBinDistanceMeters: 640,
    },
  ])

  expect(markers[0].label).toBe('추천 88점 · 제보 12건 · 기존 쓰레기통까지 640m')
})
