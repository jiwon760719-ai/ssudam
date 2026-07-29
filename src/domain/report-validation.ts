import { getCity } from '../data/cities'
import type { CreateReportInput } from './models'

type Draft = {
  cityCode: string
  latitude?: number
  longitude?: number
  photoDataUrl: string
  note?: string
}

type Errors = Partial<Record<'cityCode' | 'location' | 'photoDataUrl', string>>
type Result = { ok: false; errors: Errors } | { ok: true; value: CreateReportInput }

export function validateReportDraft(draft: Draft): Result {
  const errors: Errors = {}
  const city = getCity(draft.cityCode)
  if (!city) errors.cityCode = '?쒕? ?좏깮?댁＜?몄슂.'
  if (
    draft.latitude === undefined ||
    draft.longitude === undefined ||
    draft.latitude < 33 ||
    draft.latitude > 39 ||
    draft.longitude < 124 ||
    draft.longitude > 132
  ) {
    errors.location = '吏?꾩뿉???쒕낫 ?꾩튂瑜??좏깮?댁＜?몄슂.'
  }
  if (!draft.photoDataUrl.startsWith('data:image/')) {
    errors.photoDataUrl = '?곕젅湲??ъ쭊??異붽??댁＜?몄슂.'
  }
  if (Object.keys(errors).length > 0 || !city) return { ok: false, errors }

  return {
    ok: true,
    value: {
      cityCode: city.code,
      cityName: city.name,
      latitude: draft.latitude as number,
      longitude: draft.longitude as number,
      photoDataUrl: draft.photoDataUrl,
      note: draft.note?.trim() || undefined,
    },
  }
}
