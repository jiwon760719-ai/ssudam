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
  if (!city) errors.cityCode = '시를 선택해주세요.'
  if (
    draft.latitude === undefined ||
    draft.longitude === undefined ||
    !Number.isFinite(draft.latitude) ||
    !Number.isFinite(draft.longitude) ||
    draft.latitude < 33 ||
    draft.latitude > 39 ||
    draft.longitude < 124 ||
    draft.longitude > 132
  ) {
    errors.location = '지도에서 제보 위치를 선택해주세요.'
  }
  if (!/^data:image\/[^;,]+(?:;[^,]*)?,.+$/.test(draft.photoDataUrl)) {
    errors.photoDataUrl = '쓰레기 사진을 추가해주세요.'
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
