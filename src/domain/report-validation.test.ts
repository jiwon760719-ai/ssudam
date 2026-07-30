import { describe, expect, it } from 'vitest'
import { validateReportDraft } from './report-validation'

describe('validateReportDraft', () => {
  it('returns field errors when city, coordinates, and photo are missing', () => {
    expect(validateReportDraft({ cityCode: '', latitude: undefined, longitude: undefined, photoDataUrl: '' }))
      .toEqual({
        ok: false,
        errors: {
          cityCode: '시를 선택해주세요.',
          location: '지도에서 제보 위치를 선택해주세요.',
          photoDataUrl: '쓰레기 사진을 추가해주세요.',
        },
      })
  })

  it('normalizes a valid optional note', () => {
    const result = validateReportDraft({
      cityCode: '11',
      latitude: 37.5665,
      longitude: 126.978,
      photoDataUrl: 'data:image/webp;base64,AAAA',
      note: '  학교 앞 쓰레기 ',
    })
    expect(result).toMatchObject({ ok: true, value: { note: '학교 앞 쓰레기' } })
  })

  it.each([
    ['latitude', Number.NaN, 126.978],
    ['longitude', 37.5665, Number.NaN],
    ['positive infinity latitude', Number.POSITIVE_INFINITY, 126.978],
    ['negative infinity longitude', 37.5665, Number.NEGATIVE_INFINITY],
  ])('rejects a non-finite %s', (_field, latitude, longitude) => {
    expect(validateReportDraft({
      cityCode: '11',
      latitude,
      longitude,
      photoDataUrl: 'data:image/webp;base64,AAAA',
    })).toEqual({
      ok: false,
      errors: { location: '지도에서 제보 위치를 선택해주세요.' },
    })
  })

  it.each([
    'data:image/',
    'data:image/,AAAA',
    'data:image/webp,',
    'data:image/webp;base64,',
  ])('rejects a malformed image data URL: %s', (photoDataUrl) => {
    expect(validateReportDraft({
      cityCode: '11',
      latitude: 37.5665,
      longitude: 126.978,
      photoDataUrl,
    })).toEqual({
      ok: false,
      errors: { photoDataUrl: '쓰레기 사진을 추가해주세요.' },
    })
  })
})
