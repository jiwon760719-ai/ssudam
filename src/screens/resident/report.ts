import type { AppRoute } from '../../app/router'
import { CITY_OPTIONS, getCity } from '../../data/cities'
import { validateReportDraft } from '../../domain/report-validation'
import { compressImage } from '../../domain/image-compression'
import type { ReportRepository } from '../../domain/models'
import type { Coordinates, MapAdapter, MapFactory } from '../../map/map-types'
import './resident.css'

type ResidentDependencies = {
  repository: ReportRepository
  mapFactory: MapFactory
  imageCompressor: typeof compressImage
  geolocation?: Geolocation
  navigate(route: AppRoute): void
}

const INITIAL_LOCATION: Coordinates = { latitude: 37.5665, longitude: 126.978 }

export function renderResidentReport(dependencies: ResidentDependencies) {
  let location: Coordinates | undefined
  let photoDataUrl = ''
  let submitting = false
  let destroyed = false
  let imageGeneration = 0
  let map: MapAdapter | undefined
  let unlistenMap: (() => void) | undefined
  const element = document.createElement('main')
  element.className = 'resident-screen'
  element.innerHTML = `
    <section class="resident-panel" aria-labelledby="report-title">
      <a class="back-link" href="#/">← 처음으로</a>
      <p class="eyebrow">주민 제보</p>
      <h1 id="report-title">쓰레기를 발견하셨나요?</h1>
      <p class="screen-intro">사진과 위치를 남겨 주시면 관리자 지도에 바로 반영됩니다.</p>
      <p class="storage-warning" data-storage-warning aria-live="polite" hidden></p>
      <form novalidate>
        <div class="field">
          <label for="city-code">지역 선택</label>
          <select id="city-code" name="cityCode" aria-describedby="city-error">
            <option value="">시·군·구를 선택하세요</option>
            ${CITY_OPTIONS.map((city) => `<option value="${city.code}">${city.provinceName} ${city.name}</option>`).join('')}
          </select>
          <p id="city-error" class="field-error" data-error="cityCode" aria-live="polite"></p>
        </div>
        <div class="field">
          <div class="field-label-row"><label>발견 위치</label><button class="text-button" data-action="geolocation" type="button">현재 위치 사용</button></div>
          <p class="location-summary" data-location aria-live="polite">지도에서 위치를 선택해 주세요.</p>
          <div class="resident-map" data-map aria-label="제보 위치 선택 지도"></div>
          <p class="field-error" data-error="location" aria-live="polite"></p>
        </div>
        <div class="field">
          <label for="photo">현장 사진</label>
          <input id="photo" name="photo" type="file" accept="image/*" aria-describedby="photo-error compression-status">
          <p id="compression-status" class="compression-status" data-compression aria-live="polite"></p>
          <img class="photo-preview" data-preview alt="선택한 제보 사진 미리보기" hidden>
          <p id="photo-error" class="field-error" data-error="photoDataUrl" aria-live="polite"></p>
        </div>
        <div class="field"><label for="note">메모 <span class="optional">(선택)</span></label><textarea id="note" name="note" rows="3" placeholder="예: 골목 입구 전봇대 옆"></textarea></div>
        <button class="submit-button" type="submit">제보 보내기</button>
      </form>
    </section>
  `

  const form = element.querySelector('form')!
  const citySelect = element.querySelector<HTMLSelectElement>('[name="cityCode"]')!
  const note = element.querySelector<HTMLTextAreaElement>('[name="note"]')!
  const photoInput = element.querySelector<HTMLInputElement>('[name="photo"]')!
  const mapContainer = element.querySelector<HTMLElement>('[data-map]')!
  const summary = element.querySelector<HTMLElement>('[data-location]')!
  const preview = element.querySelector<HTMLImageElement>('[data-preview]')!
  const compression = element.querySelector<HTMLElement>('[data-compression]')!
  const storageWarning = element.querySelector<HTMLElement>('[data-storage-warning]')!
  const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]')!

  const renderLocation = (next: Coordinates) => {
    location = next
    map?.setSelectedLocation(next)
    summary.textContent = `선택 위치: ${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`
    renderErrors({ location: undefined })
  }

  const renderErrors = (errors: Partial<Record<'cityCode' | 'location' | 'photoDataUrl', string>>) => {
    for (const key of ['cityCode', 'location', 'photoDataUrl'] as const) {
      const target = element.querySelector<HTMLElement>(`[data-error="${key}"]`)
      if (target) target.textContent = errors[key] ?? ''
    }
  }

  citySelect.addEventListener('change', () => {
    const city = getCity(citySelect.value)
    if (!city) return
    map?.setView({ latitude: city.centerLatitude, longitude: city.centerLongitude }, city.defaultZoom)
    renderErrors({ cityCode: undefined })
  })

  element.querySelector('[data-action="geolocation"]')?.addEventListener('click', () => {
    if (!dependencies.geolocation) {
      summary.textContent = '위치 권한을 사용할 수 없습니다. 지도에서 직접 선택해 주세요.'
      return
    }
    summary.textContent = '현재 위치를 확인하고 있습니다…'
    dependencies.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!destroyed) renderLocation({ latitude: coords.latitude, longitude: coords.longitude })
      },
      () => {
        if (!destroyed) summary.textContent = '위치 권한을 사용할 수 없습니다. 지도에서 직접 선택해 주세요.'
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })

  photoInput.addEventListener('change', async () => {
    const currentGeneration = ++imageGeneration
    const file = photoInput.files?.[0]
    photoDataUrl = ''
    preview.hidden = true
    if (!file) return
    compression.textContent = '사진을 제출용으로 압축하고 있습니다…'
    try {
      const compressed = await dependencies.imageCompressor(file)
      if (destroyed || currentGeneration !== imageGeneration) return
      photoDataUrl = compressed
      preview.src = compressed
      preview.hidden = false
      compression.textContent = '사진 압축이 완료되었습니다.'
      renderErrors({ photoDataUrl: undefined })
    } catch {
      if (destroyed || currentGeneration !== imageGeneration) return
      compression.textContent = '사진을 처리하지 못했습니다. 다른 사진을 선택해 주세요.'
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (submitting) return
    const draft = {
      cityCode: citySelect.value,
      latitude: location?.latitude,
      longitude: location?.longitude,
      photoDataUrl,
      note: note.value,
    }
    const result = validateReportDraft(draft)
    if (!result.ok) {
      renderErrors(result.errors)
      return
    }
    submitting = true
    submitButton.disabled = true
    submitButton.textContent = '제보를 저장하고 있습니다…'
    const report = dependencies.repository.addReport(result.value)
    if (dependencies.repository.getLastWarning() === 'storage-quota') {
      storageWarning.textContent = '브라우저 저장 공간이 부족해 현재 화면에서만 제보가 유지됩니다.'
      storageWarning.hidden = false
    }
    dependencies.navigate({ name: 'resident-complete', reportId: report.id })
  })

  return {
    element,
    mount() {
      if (destroyed || map || !element.isConnected) return
      map = dependencies.mapFactory(mapContainer, {
        center: INITIAL_LOCATION,
        zoom: 11,
        onTileError(message) { summary.textContent = message },
        onTileReady() {},
      })
      unlistenMap = map.onMapClick(renderLocation)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      imageGeneration += 1
      unlistenMap?.()
      map?.destroy()
      unlistenMap = undefined
      map = undefined
    },
  }
}
