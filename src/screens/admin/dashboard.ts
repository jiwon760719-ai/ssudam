import type { ScreenHandle } from '../../app/app'
import type { AppRoute } from '../../app/router'
import { buildHeatPoints, recommendBinCandidates } from '../../analytics/recommendations'
import { computeAdminSummary } from '../../analytics/summary'
import { CITY_OPTIONS, getCity } from '../../data/cities'
import type { BinCandidate, ExistingBin, ReportRepository, WasteReport } from '../../domain/models'
import type { MapAdapter, MapFactory, MapLayerVisibility } from '../../map/map-types'
import './admin.css'

export type AdminFilters = { cityCode: 'all' | string; days: 7 | 30 | 90 }

type AdminDependencies = {
  repository: ReportRepository
  mapFactory: MapFactory
  now?: () => Date
  navigate(route: AppRoute): void
}

type AdminViewModel = {
  reports: WasteReport[]
  bins: ExistingBin[]
  candidates: BinCandidate[]
}

const NATIONAL_CENTER = { latitude: 36.35, longitude: 127.8 }
const NATIONAL_ZOOM = 7

export function filterReports(reports: WasteReport[], filters: AdminFilters, now: Date): WasteReport[] {
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - filters.days)
  return reports.filter((report) => {
    const matchesCity = filters.cityCode === 'all' || report.cityCode === filters.cityCode
    return matchesCity && new Date(report.createdAt) >= threshold
  })
}

function chooseCandidateCityCode(reports: WasteReport[]): string | undefined {
  const totals = new Map<string, number>()
  reports.forEach((report) => totals.set(report.cityCode, (totals.get(report.cityCode) ?? 0) + 1))
  return [...totals.entries()]
    .sort(([cityA, countA], [cityB, countB]) => countB - countA || cityA.localeCompare(cityB))[0]
    ?.[0]
}

function createViewModel(
  reports: WasteReport[],
  bins: ExistingBin[],
  filters: AdminFilters,
  now: Date,
): AdminViewModel {
  const filteredReports = filterReports(reports, filters, now)
  const candidateCityCode = filters.cityCode === 'all'
    ? chooseCandidateCityCode(filteredReports)
    : filters.cityCode
  const candidates = candidateCityCode
    ? recommendBinCandidates(filteredReports, bins, candidateCityCode)
    : []

  return {
    reports: filteredReports,
    bins: filters.cityCode === 'all' ? bins : bins.filter((bin) => bin.cityCode === filters.cityCode),
    candidates,
  }
}

function textElement(tag: string, text: string, className?: string): HTMLElement {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}

function createCandidateCard(candidate: BinCandidate, index: number): HTMLElement {
  const card = document.createElement('article')
  card.className = 'candidate-card'
  card.dataset.candidateId = candidate.id
  card.append(textElement('p', `우선순위 ${index + 1}`, 'candidate-rank'))
  card.append(textElement('h3', `추천 위치 ${index + 1}`))

  const score = textElement('p', `종합 점수 ${candidate.score}점`, 'candidate-score')
  const bar = document.createElement('div')
  bar.className = 'candidate-score-bar'
  bar.setAttribute('role', 'progressbar')
  bar.setAttribute('aria-valuemin', '0')
  bar.setAttribute('aria-valuemax', '100')
  bar.setAttribute('aria-valuenow', String(candidate.score))
  bar.setAttribute('aria-label', `종합 점수 ${candidate.score}점`)
  const fill = document.createElement('span')
  fill.style.width = `${candidate.score}%`
  bar.append(fill)
  score.append(bar)
  card.append(score)

  const evidence = document.createElement('dl')
  const rows: Array<[string, string]> = [
    ['밀집도 (70%)', `반경 내 제보 ${candidate.reportCount}건`],
    ['반복 제보 (20%)', `${Math.round(candidate.recurrenceScore * 100)}점`],
    ['기존 쓰레기통 거리 (10%)', `${candidate.nearestBinDistanceMeters}m`],
  ]
  rows.forEach(([term, value]) => {
    evidence.append(textElement('dt', term))
    evidence.append(textElement('dd', value))
  })
  card.append(evidence)

  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.action = 'focus-candidate'
  button.dataset.candidateId = candidate.id
  button.textContent = '지도에서 보기'
  card.append(button)
  return card
}

function renderCandidateList(container: HTMLElement, candidates: BinCandidate[]): void {
  container.replaceChildren()
  if (!candidates.length) {
    container.append(textElement('p', '추천 위치를 계산하려면 더 많은 제보가 필요합니다.', 'empty-copy'))
    return
  }
  candidates.forEach((candidate, index) => container.append(createCandidateCard(candidate, index)))
}

function renderLatestReport(container: HTMLElement, reports: WasteReport[]): void {
  container.replaceChildren()
  const latest = reports
    .filter((report) => report.source === 'resident')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  if (!latest) {
    container.append(textElement('p', '주민이 제출한 최신 제보가 아직 없습니다.', 'empty-copy'))
    return
  }

  container.append(textElement('p', '최신 제보', 'latest-label'))
  container.append(textElement('h3', latest.cityName))
  container.append(textElement('p', new Date(latest.createdAt).toLocaleString('ko-KR')))
  if (latest.note) container.append(textElement('p', latest.note, 'latest-note'))
}

function renderSelectedReport(container: HTMLElement, report: WasteReport): void {
  container.replaceChildren()
  container.append(textElement('p', '선택한 제보', 'latest-label'))
  container.append(textElement('h3', report.cityName))
  container.append(textElement('p', new Date(report.createdAt).toLocaleString('ko-KR')))
  container.append(textElement(
    'p',
    `위치 ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`,
  ))
  if (report.note) container.append(textElement('p', report.note, 'latest-note'))
}

function renderSelectedCandidate(container: HTMLElement, candidate: BinCandidate): void {
  container.replaceChildren()
  container.append(textElement('p', '선택한 추천 위치', 'latest-label'))
  container.append(textElement('h3', `종합 점수 ${candidate.score}점`))
  const evidence = document.createElement('dl')
  const rows: Array<[string, string]> = [
    ['반경 내 제보', `${candidate.reportCount}건`],
    ['반복 제보 점수', `${Math.round(candidate.recurrenceScore * 100)}점`],
    ['기존 쓰레기통 거리', `${candidate.nearestBinDistanceMeters}m`],
  ]
  rows.forEach(([term, value]) => {
    evidence.append(textElement('dt', term))
    evidence.append(textElement('dd', value))
  })
  container.append(evidence)
}

export function renderAdminDashboard(dependencies: AdminDependencies): ScreenHandle {
  const now = dependencies.now ?? (() => new Date())
  let filters: AdminFilters = { cityCode: 'all', days: 30 }
  let visibility: MapLayerVisibility = { reports: true, heat: true, bins: true, candidates: true }
  let map: MapAdapter | undefined
  let destroyed = false
  let candidates: BinCandidate[] = []
  let currentView: AdminViewModel = { reports: [], bins: [], candidates: [] }
  let unsubscribeMarkerSelection = () => {}

  const element = document.createElement('main')
  element.className = 'admin-dashboard'
  element.innerHTML = `
    <header class="admin-header">
      <a href="#/" class="back-link">처음으로</a>
      <div><p class="eyebrow">실시간 데이터 분석</p><h1>쓰담쓰담 관리자</h1></div>
      <button type="button" class="reset-trigger" data-action="open-reset">데모 데이터 초기화</button>
    </header>
    <div class="storage-warning" data-corrupt-warning role="alert" hidden>
      <p>저장된 데이터가 손상되어 안전한 초기 샘플로 복구했습니다.</p>
      <button type="button" data-action="reset-corrupt">손상된 데이터 초기화</button>
    </div>
    <section class="admin-controls" aria-label="대시보드 필터">
      <label>지역 <select data-filter="city" aria-label="지역 선택"></select></label>
      <label>기간 <select data-filter="days" aria-label="기간 선택"><option value="7">최근 7일</option><option value="30" selected>최근 30일</option><option value="90">최근 90일</option></select></label>
      <fieldset class="layer-controls"><legend>지도 레이어</legend>
        <label><input type="checkbox" data-layer="reports" checked> 제보</label>
        <label><input type="checkbox" data-layer="heat" checked> 히트맵</label>
        <label><input type="checkbox" data-layer="bins" checked> 기존 쓰레기통</label>
        <label><input type="checkbox" data-layer="candidates" checked> 추천 위치</label>
      </fieldset>
    </section>
    <section class="metric-grid" aria-label="요약 지표">
      <article><span>전체 제보</span><strong data-metric="total">0</strong><small>선택 기간 기준</small></article>
      <article><span>오늘 제보</span><strong data-metric="today">0</strong><small>오늘 접수된 건수</small></article>
      <article><span>집중 관리 지역</span><strong data-metric="cities">0</strong><small>제보가 있는 시군구</small></article>
      <article><span>설치 추천 위치</span><strong data-metric="candidates">0</strong><small>상위 3개 후보</small></article>
    </section>
    <section class="admin-content">
      <div class="map-panel"><div class="admin-map" data-map aria-label="제보와 추천 위치 지도"></div><p class="map-status" data-map-status aria-live="polite"></p><button type="button" class="tile-retry" data-action="retry-tiles" hidden>지도 다시 불러오기</button></div>
      <aside class="insight-panel">
        <section aria-labelledby="candidate-title"><div class="section-heading"><div><p class="eyebrow">설명 가능한 점수</p><h2 id="candidate-title">추천 위치</h2></div><span class="score-legend">밀집도 70 · 반복 20 · 거리 10</span></div><div class="candidate-list" data-candidates></div></section>
        <section class="latest-report" aria-labelledby="latest-title"><h2 id="latest-title">주민 제보 확인</h2><div data-latest></div></section>
      </aside>
    </section>
    <section class="empty-state" data-empty hidden><h2>아직 수집된 제보가 없습니다</h2><p>지역과 기간을 바꾸거나 주민 제보를 기다려 주세요.</p></section>
    <dialog data-reset-dialog aria-labelledby="reset-title"><form method="dialog"><h2 id="reset-title">데모 데이터를 초기화할까요?</h2><p>현재 저장된 제보와 쓰레기통 정보가 초기 샘플 데이터로 돌아갑니다.</p><menu><button value="cancel">취소</button><button value="confirm" data-action="confirm-reset">초기화</button></menu></form></dialog>
  `

  const citySelect = element.querySelector<HTMLSelectElement>('[data-filter="city"]')!
  const daySelect = element.querySelector<HTMLSelectElement>('[data-filter="days"]')!
  const mapContainer = element.querySelector<HTMLElement>('[data-map]')!
  const mapStatus = element.querySelector<HTMLElement>('[data-map-status]')!
  const retryTilesButton = element.querySelector<HTMLButtonElement>('[data-action="retry-tiles"]')!
  const candidateList = element.querySelector<HTMLElement>('[data-candidates]')!
  const latestReport = element.querySelector<HTMLElement>('[data-latest]')!
  const emptyState = element.querySelector<HTMLElement>('[data-empty]')!
  const dialog = element.querySelector<HTMLDialogElement>('[data-reset-dialog]')!
  const corruptWarning = element.querySelector<HTMLElement>('[data-corrupt-warning]')!
  corruptWarning.hidden = dependencies.repository.getLastWarning() !== 'corrupt-data'

  const allOption = document.createElement('option')
  allOption.value = 'all'
  allOption.textContent = '전국 시군구 전체'
  citySelect.append(allOption)
  CITY_OPTIONS.forEach((city) => {
    const option = document.createElement('option')
    option.value = city.code
    option.textContent = `${city.provinceName} ${city.name}`
    citySelect.append(option)
  })

  const renderMetrics = (reports: WasteReport[], nextCandidates: BinCandidate[]) => {
    const summary = computeAdminSummary(reports, nextCandidates, now())
    element.querySelector<HTMLElement>('[data-metric="total"]')!.textContent = String(summary.totalReports)
    element.querySelector<HTMLElement>('[data-metric="today"]')!.textContent = String(summary.todayReports)
    element.querySelector<HTMLElement>('[data-metric="cities"]')!.textContent = String(summary.focusedCityCount)
    element.querySelector<HTMLElement>('[data-metric="candidates"]')!.textContent = String(summary.candidateCount)
  }

  const refresh = () => {
    if (destroyed) return
    const state = dependencies.repository.getState()
    const view = createViewModel(state.reports, state.bins, filters, now())
    currentView = view
    candidates = view.candidates
    const heat = buildHeatPoints(view.reports)
    map?.renderReports(view.reports)
    map?.renderHeat(heat)
    map?.renderBins(view.bins)
    map?.renderCandidates(view.candidates)
    map?.setLayerVisibility(visibility)
    renderMetrics(view.reports, view.candidates)
    renderCandidateList(candidateList, view.candidates)
    renderLatestReport(latestReport, view.reports)
    emptyState.hidden = view.reports.length !== 0
    const city = filters.cityCode === 'all' ? undefined : getCity(filters.cityCode)
    map?.setView(
      city
        ? { latitude: city.centerLatitude, longitude: city.centerLongitude }
        : NATIONAL_CENTER,
      city?.defaultZoom ?? NATIONAL_ZOOM,
    )
  }

  const onCityChange = () => {
    filters = { ...filters, cityCode: citySelect.value }
    refresh()
  }
  const onDayChange = () => {
    filters = { ...filters, days: Number(daySelect.value) as AdminFilters['days'] }
    refresh()
  }
  const layerInputs = [...element.querySelectorAll<HTMLInputElement>('[data-layer]')]
  const onLayerChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    visibility = { ...visibility, [input.dataset.layer as keyof MapLayerVisibility]: input.checked }
    map?.setLayerVisibility(visibility)
  }
  const onCandidateClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action="focus-candidate"]')
    const candidate = candidates.find((item) => item.id === button?.dataset.candidateId)
    if (candidate) map?.setView(candidate, 15)
  }
  const onOpenReset = () => dialog.showModal()
  const onConfirmReset = () => dependencies.repository.reset()
  const onRetryTiles = () => map?.retryTiles()
  const onResetCorrupt = () => {
    dependencies.repository.reset()
    corruptWarning.hidden = true
  }
  const onMarkerSelect = (selection: { kind: 'report' | 'candidate'; id: string }) => {
    if (selection.kind === 'report') {
      const report = currentView.reports.find((item) => item.id === selection.id)
      if (report) renderSelectedReport(latestReport, report)
      return
    }
    const candidate = currentView.candidates.find((item) => item.id === selection.id)
    if (candidate) renderSelectedCandidate(latestReport, candidate)
  }

  citySelect.addEventListener('change', onCityChange)
  daySelect.addEventListener('change', onDayChange)
  layerInputs.forEach((input) => input.addEventListener('change', onLayerChange))
  candidateList.addEventListener('click', onCandidateClick)
  element.querySelector('[data-action="open-reset"]')?.addEventListener('click', onOpenReset)
  element.querySelector('[data-action="confirm-reset"]')?.addEventListener('click', onConfirmReset)
  retryTilesButton.addEventListener('click', onRetryTiles)
  element.querySelector('[data-action="reset-corrupt"]')?.addEventListener('click', onResetCorrupt)
  const unsubscribe = dependencies.repository.subscribe(refresh)
  refresh()

  return {
    element,
    mount() {
      if (destroyed || map || !element.isConnected) return
      map = dependencies.mapFactory(mapContainer, {
        center: NATIONAL_CENTER,
        zoom: NATIONAL_ZOOM,
        onTileError(message) {
          if (destroyed) return
          mapStatus.textContent = message
          retryTilesButton.hidden = false
        },
        onTileReady() {
          if (destroyed) return
          mapStatus.textContent = ''
          retryTilesButton.hidden = true
        },
      })
      unsubscribeMarkerSelection = map.onMarkerSelect(onMarkerSelect)
      refresh()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      unsubscribe()
      citySelect.removeEventListener('change', onCityChange)
      daySelect.removeEventListener('change', onDayChange)
      layerInputs.forEach((input) => input.removeEventListener('change', onLayerChange))
      candidateList.removeEventListener('click', onCandidateClick)
      element.querySelector('[data-action="open-reset"]')?.removeEventListener('click', onOpenReset)
      element.querySelector('[data-action="confirm-reset"]')?.removeEventListener('click', onConfirmReset)
      retryTilesButton.removeEventListener('click', onRetryTiles)
      element.querySelector('[data-action="reset-corrupt"]')?.removeEventListener('click', onResetCorrupt)
      unsubscribeMarkerSelection()
      map?.destroy()
      map = undefined
    },
  }
}
