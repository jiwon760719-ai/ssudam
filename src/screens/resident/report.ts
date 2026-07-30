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
  let selectedPhotoFile: File | undefined
  let submitting = false
  let destroyed = false
  let imageGeneration = 0
  let map: MapAdapter | undefined
  let unlistenMap: (() => void) | undefined
  const element = document.createElement('div')
  element.className = 'resident-page'
  element.innerHTML = `
    <header class="app-bar resident-app-bar">
      <a class="brand" href="#/" aria-label="쓰담쓰담 홈">
        <span class="brand-mark" aria-hidden="true">쓰</span>
        <span>쓰담쓰담</span>
      </a>
      <a class="button button--text back-link" href="#/">처음으로</a>
    </header>
    <main class="resident-screen">
      <section class="resident-panel" aria-labelledby="report-title">
        <div class="resident-heading">
          <p class="eyebrow">주민 제보</p>
          <h1 id="report-title">쓰레기를 발견하셨나요?</h1>
          <p class="screen-intro">사진과 위치를 남겨 주시면 관리자 지도에 바로 반영됩니다.</p>
          <div class="flow-progress" aria-hidden="true"><span></span></div>
        </div>
        <div class="status-banner status-banner--warning storage-warning" data-corrupt-warning role="alert" hidden>
          <p>저장된 데이터가 손상되어 안전한 초기 샘플로 복구했습니다.</p>
          <button class="button button--filled" type="button" data-action="reset-corrupt">손상된 데이터 초기화</button>
        </div>
        <form novalidate>
          <section class="form-section" aria-labelledby="city-section-title">
            <h2 id="city-section-title">1. 지역 선택</h2>
            <div class="field">
              <label for="city-code">시 선택</label>
              <select id="city-code" name="cityCode" aria-describedby="city-error">
                <option value="">시를 선택해 주세요</option>
                ${CITY_OPTIONS.map((city) => `<option value="${city.code}">${city.provinceName} ${city.name}</option>`).join('')}
              </select>
              <p id="city-error" class="field-error" data-error="cityCode" aria-live="polite"></p>
            </div>
          </section>
          <section class="form-section" aria-labelledby="location-section-title">
            <div class="section-title-row">
              <h2 id="location-section-title">2. 발견 위치</h2>
              <span class="location-actions">
                <button class="button button--text" data-action="geolocation" type="button">현재 위치 사용</button>
                <button class="button button--text" data-action="use-city-center" type="button">선택한 시 중심 사용</button>
              </span>
            </div>
            <div class="resident-map-surface">
              <p class="location-summary" data-location aria-live="polite">지도에서 위치를 선택해 주세요.</p>
              <div class="resident-map" data-map aria-label="제보 위치 선택 지도"></div>
              <div class="map-state-row">
                <p class="map-status" data-map-status aria-live="polite"></p>
                <button type="button" class="button button--tonal tile-retry" data-action="retry-tiles" hidden>지도 다시 불러오기</button>
              </div>
              <p class="field-error" data-error="location" aria-live="polite"></p>
            </div>
          </section>
          <section class="form-section" aria-labelledby="detail-section-title">
            <h2 id="detail-section-title">3. 사진과 메모</h2>
            <div class="field">
              <label for="photo">쓰레기 사진</label>
              <input id="photo" name="photo" type="file" accept="image/*" aria-describedby="photo-error compression-status">
              <p id="compression-status" class="compression-status" data-compression aria-live="polite"></p>
              <img class="photo-preview" data-preview alt="선택한 제보 사진 미리보기" hidden>
              <p id="photo-error" class="field-error" data-error="photoDataUrl" aria-live="polite"></p>
            </div>
            <div class="field">
              <label for="note">메모 <span class="optional" aria-hidden="true">(선택)</span></label>
              <textarea id="note" name="note" rows="3" placeholder="예: 골목 입구 전봇대 옆"></textarea>
            </div>
          </section>
          <button class="button button--filled submit-button" type="submit">제보하기</button>
        </form>
      </section>
    </main>
  `

  const form = element.querySelector('form')!
  const citySelect = element.querySelector<HTMLSelectElement>('[name="cityCode"]')!
  const note = element.querySelector<HTMLTextAreaElement>('[name="note"]')!
  const photoInput = element.querySelector<HTMLInputElement>('[name="photo"]')!
  const mapContainer = element.querySelector<HTMLElement>('[data-map]')!
  const summary = element.querySelector<HTMLElement>('[data-location]')!
  const preview = element.querySelector<HTMLImageElement>('[data-preview]')!
  const compression = element.querySelector<HTMLElement>('[data-compression]')!
  const corruptWarning = element.querySelector<HTMLElement>('[data-corrupt-warning]')!
  const mapStatus = element.querySelector<HTMLElement>('[data-map-status]')!
  const retryTilesButton = element.querySelector<HTMLButtonElement>('[data-action="retry-tiles"]')!
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

  corruptWarning.hidden = dependencies.repository.getLastWarning() !== 'corrupt-data'

  citySelect.addEventListener('change', () => {
    const city = getCity(citySelect.value)
    if (!city) return
    map?.setView({ latitude: city.centerLatitude, longitude: city.centerLongitude }, city.defaultZoom)
    renderErrors({ cityCode: undefined })
  })

  element.querySelector('[data-action="geolocation"]')?.addEventListener('click', () => {
    if (!dependencies.geolocation) {
      summary.textContent = '지도에서 직접 선택해주세요.'
      return
    }
    summary.textContent = '현재 위치를 확인하고 있습니다…'
    dependencies.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!destroyed) renderLocation({ latitude: coords.latitude, longitude: coords.longitude })
      },
      () => {
        if (!destroyed) summary.textContent = '지도에서 직접 선택해주세요.'
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })

  const onUseCityCenter = () => {
    const city = getCity(citySelect.value)
    if (!city) {
      renderErrors({ cityCode: '시를 선택해주세요.' })
      return
    }
    renderLocation({ latitude: city.centerLatitude, longitude: city.centerLongitude })
  }
  const onRetryTiles = () => map?.retryTiles()
  const onResetCorrupt = () => {
    dependencies.repository.reset()
    corruptWarning.hidden = true
  }
  element.querySelector('[data-action="use-city-center"]')?.addEventListener('click', onUseCityCenter)
  element.querySelector('[data-action="reset-corrupt"]')?.addEventListener('click', onResetCorrupt)
  retryTilesButton.addEventListener('click', onRetryTiles)

  photoInput.addEventListener('change', async () => {
    const currentGeneration = ++imageGeneration
    const file = photoInput.files?.[0]
    photoDataUrl = ''
    selectedPhotoFile = undefined
    preview.hidden = true
    if (!file) return
    compression.textContent = '사진을 제출용으로 압축하고 있습니다…'
    try {
      const compressed = await dependencies.imageCompressor(file)
      if (destroyed || currentGeneration !== imageGeneration) return
      photoDataUrl = compressed
      selectedPhotoFile = file
      preview.src = compressed
      preview.hidden = false
      compression.textContent = '사진 압축이 완료되었습니다.'
      renderErrors({ photoDataUrl: undefined })
    } catch {
      if (destroyed || currentGeneration !== imageGeneration) return
      compression.textContent = '사진을 처리하지 못했습니다. 다른 사진을 선택해 주세요.'
    }
  })

  form.addEventListener('submit', async (event) => {
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
    if (dependencies.repository.getLastWarning() === 'storage-quota' && selectedPhotoFile) {
      compression.textContent = '저장 공간을 위해 사진 용량을 한 번 더 줄이고 있습니다…'
      try {
        const lowerQualityPhoto = await dependencies.imageCompressor(
          selectedPhotoFile,
          { quality: 0.45 },
        )
        if (destroyed) return
        dependencies.repository.retryReportPersistence(report.id, lowerQualityPhoto)
      } catch {
        // The repository already retains the original report for this session.
      }
    }
    if (destroyed) return
    dependencies.navigate({ name: 'resident-complete', reportId: report.id })
  })

  return {
    element,
    mount() {
      if (destroyed || map || !element.isConnected) return
      map = dependencies.mapFactory(mapContainer, {
        center: INITIAL_LOCATION,
        zoom: 11,
        onTileError(message) {
          mapStatus.textContent = message
          retryTilesButton.hidden = false
        },
        onTileReady() {
          mapStatus.textContent = ''
          retryTilesButton.hidden = true
        },
      })
      unlistenMap = map.onMapClick(renderLocation)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      imageGeneration += 1
      element.querySelector('[data-action="use-city-center"]')?.removeEventListener('click', onUseCityCenter)
      element.querySelector('[data-action="reset-corrupt"]')?.removeEventListener('click', onResetCorrupt)
      retryTilesButton.removeEventListener('click', onRetryTiles)
      unlistenMap?.()
      map?.destroy()
      unlistenMap = undefined
      map = undefined
    },
  }
}
