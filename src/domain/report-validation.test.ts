import { describe, expect, it } from 'vitest'
import { validateReportDraft } from './report-validation'

describe('validateReportDraft', () => {
  it('returns field errors when city, coordinates, and photo are missing', () => {
    expect(validateReportDraft({ cityCode: '', latitude: undefined, longitude: undefined, photoDataUrl: '' }))
      .toEqual({
        ok: false,
        errors: {
          cityCode: '?쒕? ?좏깮?댁＜?몄슂.',
          location: '吏?꾩뿉???쒕낫 ?꾩튂瑜??좏깮?댁＜?몄슂.',
          photoDataUrl: '?곕젅湲??ъ쭊??異붽??댁＜?몄슂.',
        },
      })
  })

  it('normalizes a valid optional note', () => {
    const result = validateReportDraft({
      cityCode: '11',
      latitude: 37.5665,
      longitude: 126.978,
      photoDataUrl: 'data:image/webp;base64,AAAA',
      note: '  ?숆탳 ???곕젅湲? ',
    })
    expect(result).toMatchObject({ ok: true, value: { note: '?숆탳 ???곕젅湲?' } })
  })
})
