# 쓰담쓰담 발표용 데모 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주민이 사진과 위치로 쓰레기를 제보하면 관리자 포털의 통계, 지도, 히트맵, 쓰레기통 추천 위치에 즉시 반영되는 발표용 반응형 웹 데모를 만든다.

**Architecture:** 기존 Vite·TypeScript 앱을 해시 라우터 기반 단일 페이지 앱으로 확장한다. 화면은 저장소, 분석, 지도 어댑터에 정의된 인터페이스로만 의존하며, 제보와 초기 데이터는 버전이 있는 `localStorage` 저장소에 보관한다. 공간 분석은 순수 함수로 구현하고 Leaflet은 데이터 결과를 렌더링만 한다.

**Tech Stack:** Vite 8, TypeScript 6, Leaflet 1.9, leaflet.heat, Vitest, happy-dom, Playwright

## Global Constraints

- 실제 회원가입, 로그인, 서버, 데이터베이스를 추가하지 않는다.
- 경로는 `#/`, `#/resident/report`, `#/resident/complete/:id`, `#/admin`을 사용한다.
- 역할 선택 홈에서 `주민으로 시작`과 `관리자 데모 입장`으로 바로 진입한다.
- 배경 지도 타일은 `https://mt.google.com/vt/lyrs=m&hl=ko_KR&scale=2&x={x}&y={y}&z={z}`를 사용한다.
- 지도 타일 실패가 제보 데이터, 마커, 히트맵, 추천 후보 계산을 삭제하면 안 된다.
- 대한민국의 특별시·광역시·특별자치시와 도 산하 시를 정적 카탈로그로 제공한다.
- 주민 제보 필수값은 시, 좌표, 사진이며 메모는 선택값이다.
- 사진은 최대 가로·세로 1280px로 축소하고 JPEG 또는 WebP 데이터 URL로 저장한다.
- 추천 점수는 밀집도 70%, 반복도 20%, 기존 쓰레기통과의 거리 10%로 계산한다.
- 추천 후보는 서로 500m 이상 떨어진 상위 3개만 표시한다.
- 제보 완료 화면에 `제보 완료`와 `관리자 지도에 반영됨`을 모두 표시한다.
- 주민이 입력한 메모와 파일명은 `innerHTML`에 삽입하지 않고 DOM `textContent`로 렌더링한다.
- 시각 스타일은 밝은 중립 배경, 딥 네이비·딥 그린, 선명한 성공 그린을 사용한다.
- 모바일 주민 화면과 데스크톱 관리자 화면을 우선하되 360px부터 1440px까지 깨지지 않아야 한다.
- 기능 코드를 작성하기 전에 해당 동작을 재현하는 실패 테스트를 먼저 작성한다.

---

## File Structure

```text
index.html                         한국어 문서 메타데이터와 앱 루트
package.json                       런타임·테스트·E2E 의존성과 명령
vite.config.ts                     Vite와 Vitest 공통 설정
playwright.config.ts               발표 흐름 브라우저 테스트 설정
public/favicon.svg                 딥 그린 쓰담쓰담 파비콘
src/
  main.ts                          의존성 조립과 앱 시작
  style.css                        디자인 토큰, 리셋, 공통 접근성 스타일
  app/
    app.ts                         화면 수명주기와 라우트 렌더링
    router.ts                      해시 파싱과 이동
    router.test.ts
  domain/
    models.ts                      공유 타입과 인터페이스
    report-validation.ts           주민 입력값 정규화·검증
    report-validation.test.ts
    image-compression.ts           브라우저 이미지 축소·압축
    image-compression.test.ts
  data/
    cities.ts                      대한민국 시 카탈로그와 지도 중심
    cities.test.ts
    seed.ts                        결정적 초기 제보·쓰레기통 생성
    report-repository.ts           localStorage, 메모리 폴백, 구독
    report-repository.test.ts
  analytics/
    geo.ts                         거리, 격자, 중심점 계산
    recommendations.ts             히트 포인트와 추천 후보 계산
    recommendations.test.ts
    summary.ts                     관리자 요약 통계
    summary.test.ts
  map/
    map-types.ts                   화면과 Leaflet 사이 인터페이스
    map-data.ts                    도메인 데이터를 지도 레이어 데이터로 변환
    map-data.test.ts
    leaflet-map.ts                 Leaflet, 타일, 마커, 히트맵 렌더링
    leaflet.heat.d.ts              leaflet.heat 최소 타입 선언
    map.css
  screens/
    home/
      home.ts
      home.test.ts
      home.css
    resident/
      report.ts
      report.test.ts
      complete.ts
      complete.test.ts
      resident.css
    admin/
      dashboard.ts
      dashboard.test.ts
      admin.css
  test/
    setup.ts                       Vitest DOM 정리
    fakes.ts                       저장소·지도 어댑터 테스트 대역
tests/
  e2e/
    ssudam-flow.spec.ts            주민 제보부터 관리자 반영까지
```

기존 `src/counter.ts`, `src/assets/typescript.svg`, `src/assets/vite.svg`, `src/assets/hero.png`, 기본 Vite 마크업과 CSS는 Task 1에서 제거한다.

---

### Task 1: 테스트 기반과 해시 라우터

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `index.html`
- Replace: `public/favicon.svg`
- Delete: `public/icons.svg`
- Replace: `src/main.ts`
- Replace: `src/style.css`
- Create: `src/app/router.ts`
- Create: `src/app/router.test.ts`
- Create: `src/app/app.ts`
- Create: `src/test/setup.ts`
- Delete: `src/counter.ts`
- Delete: `src/assets/typescript.svg`
- Delete: `src/assets/vite.svg`
- Delete: `src/assets/hero.png`

**Interfaces:**
- Produces: `type AppRoute`, `parseHash(hash: string): AppRoute`, `toHash(route: AppRoute): string`, `navigate(route: AppRoute): void`
- Produces: `createApp(root: HTMLElement, createScreen: ScreenFactory): { start(): void; destroy(): void }`
- Consumes: none

- [ ] **Step 1: Install runtime and test dependencies and add scripts**

Run:

```powershell
npm install leaflet@1.9.4 leaflet.heat@0.2.0
npm install --save-dev @types/leaflet vitest happy-dom @playwright/test
```

Set `package.json` scripts to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "preview": "vite preview"
  }
}
```

Add `"vitest/globals"` to `compilerOptions.types` and keep `"vite/client"`.

- [ ] **Step 2: Write the failing route parser tests**

Create `src/app/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseHash, toHash } from './router'

describe('parseHash', () => {
  it.each([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/resident/report', { name: 'resident-report' }],
    ['#/resident/complete/SSUDAM-1', { name: 'resident-complete', reportId: 'SSUDAM-1' }],
    ['#/admin', { name: 'admin' }],
    ['#/unknown', { name: 'home' }],
  ])('maps %s to the expected app route', (hash, expected) => {
    expect(parseHash(hash)).toEqual(expected)
  })
})

describe('toHash', () => {
  it('encodes a report id in the completion route', () => {
    expect(toHash({ name: 'resident-complete', reportId: 'SSUDAM 1' }))
      .toBe('#/resident/complete/SSUDAM%201')
  })
})
```

- [ ] **Step 3: Run the route tests and verify RED**

Run:

```powershell
npm run test -- src/app/router.test.ts
```

Expected: FAIL because `src/app/router.ts` does not exist.

- [ ] **Step 4: Implement the route contract**

Create `src/app/router.ts`:

```ts
export type AppRoute =
  | { name: 'home' }
  | { name: 'resident-report' }
  | { name: 'resident-complete'; reportId: string }
  | { name: 'admin' }

export function parseHash(hash: string): AppRoute {
  const normalized = hash || '#/'
  if (normalized === '#/' || normalized === '#') return { name: 'home' }
  if (normalized === '#/resident/report') return { name: 'resident-report' }
  if (normalized === '#/admin') return { name: 'admin' }

  const match = normalized.match(/^#\/resident\/complete\/(.+)$/)
  if (match) {
    return { name: 'resident-complete', reportId: decodeURIComponent(match[1]) }
  }
  return { name: 'home' }
}

export function toHash(route: AppRoute): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'resident-report':
      return '#/resident/report'
    case 'resident-complete':
      return `#/resident/complete/${encodeURIComponent(route.reportId)}`
    case 'admin':
      return '#/admin'
  }
}

export function navigate(route: AppRoute): void {
  window.location.hash = toHash(route)
}
```

Create `src/app/app.ts` with a single active-screen disposer:

```ts
import { parseHash, type AppRoute } from './router'

export type ScreenHandle = { element: HTMLElement; destroy(): void }
export type ScreenFactory = (route: AppRoute) => ScreenHandle

export function createApp(root: HTMLElement, createScreen: ScreenFactory) {
  let active: ScreenHandle | undefined

  const render = () => {
    active?.destroy()
    active = createScreen(parseHash(window.location.hash))
    root.replaceChildren(active.element)
  }

  return {
    start() {
      window.addEventListener('hashchange', render)
      render()
    },
    destroy() {
      window.removeEventListener('hashchange', render)
      active?.destroy()
    },
  }
}
```

Replace `index.html` metadata with `lang="ko"`, title `쓰담쓰담`, description `시민 참여형 쓰레기 제보 및 쓰레기통 위치 추천 서비스`, and keep `<div id="app"></div>`.

Replace `public/favicon.svg` with this code-native mark and reference it from `index.html`. Remove unused `public/icons.svg`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#143d34"/>
  <path fill="#fff" d="M21 25h22l-2 24H23l-2-24Zm-3-6h28v6H18v-6Zm9-7h10l3 7H24l3-7Z"/>
  <path fill="#8ee0bd" d="M32 12c1-7 6-9 12-9-1 7-5 10-12 9Zm0 0c-6 0-10-3-12-8 6-1 11 1 12 8Z"/>
</svg>
```

Create `src/test/setup.ts`:

```ts
import { afterEach } from 'vitest'

afterEach(() => {
  document.body.replaceChildren()
  window.location.hash = '#/'
  localStorage.clear()
})
```

Add a Vitest section to `vite.config.ts` by creating the file:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Run tests and build**

Run:

```powershell
npm run test -- src/app/router.test.ts
npm run build
```

Expected: route tests PASS and build exits 0 with a temporary `main.ts` screen factory that renders the route name.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json tsconfig.json vite.config.ts index.html public src
git commit -m "chore: establish app shell and test harness"
```

---

### Task 2: 도메인 모델, 전국 시 카탈로그, 저장소

**Files:**
- Create: `src/domain/models.ts`
- Create: `src/data/cities.ts`
- Create: `src/data/cities.test.ts`
- Create: `src/data/seed.ts`
- Create: `src/data/report-repository.ts`
- Create: `src/data/report-repository.test.ts`

**Interfaces:**
- Produces: `CityOption`, `WasteReport`, `ExistingBin`, `BinCandidate`, `AppDataState`, `CreateReportInput`
- Produces: `CITY_OPTIONS: readonly CityOption[]`, `getCity(code: string): CityOption | undefined`
- Produces: `createSeedState(now?: Date): AppDataState`
- Produces: `ReportRepository` and `createReportRepository(options): ReportRepository`
- Consumes: browser-compatible `Storage` and the city catalog

- [ ] **Step 1: Define the shared domain contract**

Create `src/domain/models.ts`:

```ts
export type CityOption = {
  code: string
  name: string
  provinceName: string
  centerLatitude: number
  centerLongitude: number
  defaultZoom: number
}

export type WasteReport = {
  id: string
  cityCode: string
  cityName: string
  latitude: number
  longitude: number
  createdAt: string
  photoDataUrl: string
  note?: string
  source: 'seed' | 'resident'
}

export type ExistingBin = {
  id: string
  cityCode: string
  latitude: number
  longitude: number
}

export type BinCandidate = {
  id: string
  cityCode: string
  latitude: number
  longitude: number
  score: number
  reportCount: number
  recurrenceScore: number
  nearestBinDistanceMeters: number
}

export type CreateReportInput = Omit<WasteReport, 'id' | 'createdAt' | 'source'>

export type AppDataState = {
  version: 1
  reports: WasteReport[]
  bins: ExistingBin[]
}

export type ReportRepository = {
  getState(): AppDataState
  getReport(id: string): WasteReport | undefined
  addReport(input: CreateReportInput): WasteReport
  reset(): AppDataState
  subscribe(listener: (state: AppDataState) => void): () => void
  getLastWarning(): 'storage-unavailable' | 'storage-quota' | 'corrupt-data' | undefined
  destroy(): void
}
```

- [ ] **Step 2: Write failing city-catalog tests**

Create `src/data/cities.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CITY_OPTIONS, getCity } from './cities'

describe('CITY_OPTIONS', () => {
  it('contains the complete city-level catalog with unique codes', () => {
    expect(CITY_OPTIONS.length).toBeGreaterThanOrEqual(85)
    expect(new Set(CITY_OPTIONS.map((city) => city.code)).size).toBe(CITY_OPTIONS.length)
  })

  it.each([
    ['11', '서울특별시'],
    ['26', '부산광역시'],
    ['36', '세종특별자치시'],
    ['41110', '수원시'],
    ['50110', '제주시'],
  ])('contains %s as %s with a valid center', (code, name) => {
    const city = getCity(code)
    expect(city?.name).toBe(name)
    expect(city?.centerLatitude).toBeGreaterThan(33)
    expect(city?.centerLatitude).toBeLessThan(39)
    expect(city?.centerLongitude).toBeGreaterThan(124)
    expect(city?.centerLongitude).toBeLessThan(132)
  })
})
```

The catalog must include these groups:

- 특별시·광역시·특별자치시: 서울, 부산, 대구, 인천, 광주, 대전, 울산, 세종
- 경기도: 수원, 성남, 의정부, 안양, 부천, 광명, 평택, 동두천, 안산, 고양, 과천, 구리, 남양주, 오산, 시흥, 군포, 의왕, 하남, 용인, 파주, 이천, 안성, 김포, 화성, 광주, 양주, 포천, 여주
- 강원특별자치도: 춘천, 원주, 강릉, 동해, 태백, 속초, 삼척
- 충청북도: 청주, 충주, 제천
- 충청남도: 천안, 공주, 보령, 아산, 서산, 논산, 계룡, 당진
- 전북특별자치도: 전주, 군산, 익산, 정읍, 남원, 김제
- 전라남도: 목포, 여수, 순천, 나주, 광양
- 경상북도: 포항, 경주, 김천, 안동, 구미, 영주, 영천, 상주, 문경, 경산
- 경상남도: 창원, 진주, 통영, 사천, 김해, 밀양, 거제, 양산
- 제주특별자치도: 제주, 서귀포

- [ ] **Step 3: Run city tests and verify RED**

Run:

```powershell
npm run test -- src/data/cities.test.ts
```

Expected: FAIL because `CITY_OPTIONS` and `getCity` do not exist.

- [ ] **Step 4: Implement the static city catalog**

Create `src/data/cities.ts` with all catalog entries listed in Step 2. Use official Korean administrative codes as string identifiers, reviewed center coordinates, and `defaultZoom` 11 for metro cities and 12 for ordinary cities.

Use this shape for every entry:

```ts
import type { CityOption } from '../domain/models'

export const CITY_OPTIONS = [
  {
    code: '11',
    name: '서울특별시',
    provinceName: '서울특별시',
    centerLatitude: 37.5665,
    centerLongitude: 126.978,
    defaultZoom: 11,
  },
  {
    code: '26',
    name: '부산광역시',
    provinceName: '부산광역시',
    centerLatitude: 35.1796,
    centerLongitude: 129.0756,
    defaultZoom: 11,
  },
  {
    code: '41110',
    name: '수원시',
    provinceName: '경기도',
    centerLatitude: 37.2636,
    centerLongitude: 127.0286,
    defaultZoom: 12,
  },
] satisfies CityOption[]

const CITY_BY_CODE = new Map(CITY_OPTIONS.map((city) => [city.code, city]))

export function getCity(code: string): CityOption | undefined {
  return CITY_BY_CODE.get(code)
}
```

Do not infer centers at runtime and do not call a geocoding service.

- [ ] **Step 5: Write failing repository behavior tests**

Create `src/data/report-repository.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from './report-repository'

const input = {
  cityCode: '11',
  cityName: '서울특별시',
  latitude: 37.5665,
  longitude: 126.978,
  photoDataUrl: 'data:image/webp;base64,AAAA',
  note: '학교 앞 쓰레기',
}

describe('report repository', () => {
  it('persists a resident report and emits the new state', () => {
    const listener = vi.fn()
    const repository = createReportRepository({
      storage: localStorage,
      now: () => new Date('2026-07-29T03:00:00.000Z'),
      idFactory: () => 'SSUDAM-2026-0001',
    })
    repository.subscribe(listener)

    const report = repository.addReport(input)

    expect(report).toMatchObject({
      id: 'SSUDAM-2026-0001',
      createdAt: '2026-07-29T03:00:00.000Z',
      source: 'resident',
    })
    expect(repository.getReport(report.id)).toEqual(report)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('recovers from corrupt JSON with deterministic seed data', () => {
    localStorage.setItem('ssudam:data:v1', '{invalid')
    const repository = createReportRepository({ storage: localStorage })

    expect(repository.getState().version).toBe(1)
    expect(repository.getState().reports.length).toBeGreaterThan(0)
    expect(repository.getLastWarning()).toBe('corrupt-data')
  })

  it('falls back to seed data when storage access is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem() {},
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({ storage })

    expect(repository.getState().reports.length).toBeGreaterThan(0)
    expect(repository.getLastWarning()).toBe('storage-unavailable')
  })

  it('restores the same seed ids after reset', () => {
    const repository = createReportRepository({ storage: localStorage })
    const before = repository.getState().reports.map((report) => report.id)
    repository.addReport(input)

    expect(repository.reset().reports.map((report) => report.id)).toEqual(before)
  })
})
```

- [ ] **Step 6: Run repository tests and verify RED**

Run:

```powershell
npm run test -- src/data/report-repository.test.ts
```

Expected: FAIL because the repository does not exist.

- [ ] **Step 7: Implement seed data and the repository**

Create deterministic sample data in `src/data/seed.ts`. Generate repeatable clusters around Seoul, Busan, Daegu, Incheon, Gwangju, Daejeon, Ulsan, and Sejong using fixed coordinate offsets, fixed ISO timestamps relative to the supplied `now`, and fixed IDs.

Implement `src/data/report-repository.ts` with key `ssudam:data:v1`:

```ts
import type {
  AppDataState,
  CreateReportInput,
  ReportRepository,
  WasteReport,
} from '../domain/models'
import { createSeedState } from './seed'

const STORAGE_KEY = 'ssudam:data:v1'

type Options = {
  storage?: Storage
  now?: () => Date
  idFactory?: () => string
}

export function createReportRepository(options: Options = {}): ReportRepository {
  const listeners = new Set<(state: AppDataState) => void>()
  const now = options.now ?? (() => new Date())
  const idFactory = options.idFactory ?? (() => `SSUDAM-${Date.now().toString(36).toUpperCase()}`)
  let warning: ReturnType<ReportRepository['getLastWarning']>
  let state = readInitial()

  function readInitial(): AppDataState {
    if (!options.storage) {
      warning = 'storage-unavailable'
      return createSeedState(now())
    }
    let raw: string | null
    try {
      raw = options.storage.getItem(STORAGE_KEY)
    } catch {
      warning = 'storage-unavailable'
      return createSeedState(now())
    }
    if (!raw) return createSeedState(now())
    try {
      const parsed = JSON.parse(raw) as AppDataState
      if (parsed.version !== 1 || !Array.isArray(parsed.reports) || !Array.isArray(parsed.bins)) {
        throw new Error('invalid-state')
      }
      return parsed
    } catch {
      warning = 'corrupt-data'
      return createSeedState(now())
    }
  }

  function persist(): void {
    if (!options.storage) return
    options.storage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function emit(): void {
    listeners.forEach((listener) => listener(state))
  }

  return {
    getState: () => structuredClone(state),
    getReport: (id) => state.reports.find((report) => report.id === id),
    addReport(input) {
      const report: WasteReport = {
        ...input,
        id: idFactory(),
        createdAt: now().toISOString(),
        source: 'resident',
      }
      state = { ...state, reports: [...state.reports, report] }
      persist()
      emit()
      return report
    },
    reset() {
      state = createSeedState(now())
      persist()
      emit()
      return structuredClone(state)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLastWarning: () => warning,
    destroy() {},
  }
}
```

Task 8 will add quota recovery and cross-tab storage events without changing this public interface.

- [ ] **Step 8: Run the data tests**

Run:

```powershell
npm run test -- src/data/cities.test.ts src/data/report-repository.test.ts
```

Expected: all catalog and repository tests PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/domain src/data
git commit -m "feat: add city catalog and report repository"
```

---

### Task 3: 제보 검증과 사진 압축

**Files:**
- Create: `src/domain/report-validation.ts`
- Create: `src/domain/report-validation.test.ts`
- Create: `src/domain/image-compression.ts`
- Create: `src/domain/image-compression.test.ts`

**Interfaces:**
- Consumes: `CityOption`, `CreateReportInput`
- Produces: `validateReportDraft(draft): ValidationResult`
- Produces: `calculateContainSize(width, height, maxDimension): ImageSize`
- Produces: `compressImage(file, options?): Promise<string>`

- [ ] **Step 1: Write failing validation and size tests**

Create `src/domain/report-validation.test.ts`:

```ts
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
      note: '  학교 앞 쓰레기  ',
    })
    expect(result).toMatchObject({ ok: true, value: { note: '학교 앞 쓰레기' } })
  })
})
```

Create `src/domain/image-compression.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calculateContainSize } from './image-compression'

describe('calculateContainSize', () => {
  it.each([
    [4000, 3000, { width: 1280, height: 960 }],
    [1000, 2000, { width: 640, height: 1280 }],
    [800, 600, { width: 800, height: 600 }],
  ])('fits %sx%s inside 1280px', (width, height, expected) => {
    expect(calculateContainSize(width, height, 1280)).toEqual(expected)
  })
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
npm run test -- src/domain/report-validation.test.ts src/domain/image-compression.test.ts
```

Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement validation**

Create `src/domain/report-validation.ts`:

```ts
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
    draft.latitude < 33 ||
    draft.latitude > 39 ||
    draft.longitude < 124 ||
    draft.longitude > 132
  ) {
    errors.location = '지도에서 제보 위치를 선택해주세요.'
  }
  if (!draft.photoDataUrl.startsWith('data:image/')) {
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
```

- [ ] **Step 4: Implement browser image compression**

Create `src/domain/image-compression.ts`:

```ts
export type ImageSize = { width: number; height: number }

export function calculateContainSize(
  width: number,
  height: number,
  maxDimension = 1280,
): ImageSize {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('invalid-image-type')
  const bitmap = await createImageBitmap(file)
  const size = calculateContainSize(bitmap.width, bitmap.height, options.maxDimension ?? 1280)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', options.quality ?? 0.72)
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```powershell
npm run test -- src/domain/report-validation.test.ts src/domain/image-compression.test.ts
```

Expected: all validation and image sizing tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/domain
git commit -m "feat: validate reports and compress photos"
```

---

### Task 4: 공간 분석과 추천 위치

**Files:**
- Create: `src/analytics/geo.ts`
- Create: `src/analytics/recommendations.ts`
- Create: `src/analytics/recommendations.test.ts`
- Create: `src/analytics/summary.ts`
- Create: `src/analytics/summary.test.ts`

**Interfaces:**
- Consumes: `WasteReport[]`, `ExistingBin[]`
- Produces: `distanceMeters(a, b): number`, `centroid(points): Coordinates`
- Produces: `buildHeatPoints(reports): HeatPoint[]`
- Produces: `recommendBinCandidates(reports, bins, cityCode): BinCandidate[]`
- Produces: `computeAdminSummary(reports, candidates, now): AdminSummary`

- [ ] **Step 1: Write failing recommendation tests**

Create `src/analytics/recommendations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ExistingBin, WasteReport } from '../domain/models'
import { buildHeatPoints, recommendBinCandidates } from './recommendations'

const photoDataUrl = 'data:image/webp;base64,AAAA'
const reports: WasteReport[] = [
  [37.5665, 126.9780, '2026-07-27'],
  [37.5667, 126.9782, '2026-07-28'],
  [37.5666, 126.9781, '2026-07-29'],
  [37.5700, 126.9820, '2026-07-29'],
].map(([latitude, longitude, day], index) => ({
  id: `R${index}`,
  cityCode: '11',
  cityName: '서울특별시',
  latitude: Number(latitude),
  longitude: Number(longitude),
  createdAt: `${day}T03:00:00.000Z`,
  photoDataUrl,
  source: 'seed',
}))

const bins: ExistingBin[] = [
  { id: 'B1', cityCode: '11', latitude: 37.58, longitude: 126.99 },
]

describe('buildHeatPoints', () => {
  it('assigns larger normalized weight to denser cells', () => {
    const points = buildHeatPoints(reports)
    expect(points[0].weight).toBe(1)
    expect(points.at(-1)?.weight).toBeLessThan(1)
  })
})

describe('recommendBinCandidates', () => {
  it('returns explainable, separated candidates ordered by score', () => {
    const candidates = recommendBinCandidates(reports, bins, '11')
    expect(candidates.length).toBeLessThanOrEqual(3)
    expect(candidates[0]).toMatchObject({
      cityCode: '11',
      reportCount: 3,
    })
    expect(candidates[0].score).toBeGreaterThan(candidates.at(-1)?.score ?? 0)
    expect(candidates[0].nearestBinDistanceMeters).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
npm run test -- src/analytics/recommendations.test.ts
```

Expected: FAIL because analytics functions do not exist.

- [ ] **Step 3: Implement geographic primitives**

Create `src/analytics/geo.ts`:

```ts
export type Coordinates = { latitude: number; longitude: number }

const EARTH_RADIUS_METERS = 6_371_000

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function centroid(points: Coordinates[]): Coordinates {
  return {
    latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  }
}
```

- [ ] **Step 4: Implement the 300m grouping and score**

Create `src/analytics/recommendations.ts` with:

```ts
import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'
import { centroid, distanceMeters } from './geo'

export type HeatPoint = {
  latitude: number
  longitude: number
  weight: number
  reportCount: number
}

type Cluster = {
  key: string
  reports: WasteReport[]
  latitude: number
  longitude: number
}

function groupReports(reports: WasteReport[]): Cluster[] {
  const cells = new Map<string, WasteReport[]>()
  for (const report of reports) {
    const latStep = 300 / 111_320
    const lngStep = 300 / (111_320 * Math.cos((report.latitude * Math.PI) / 180))
    const key = `${Math.floor(report.latitude / latStep)}:${Math.floor(report.longitude / lngStep)}`
    cells.set(key, [...(cells.get(key) ?? []), report])
  }
  return [...cells.entries()].map(([key, grouped]) => ({
    key,
    reports: grouped,
    ...centroid(grouped),
  }))
}

export function buildHeatPoints(reports: WasteReport[]): HeatPoint[] {
  const clusters = groupReports(reports)
  const maxCount = Math.max(1, ...clusters.map((cluster) => cluster.reports.length))
  return clusters
    .map((cluster) => ({
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      reportCount: cluster.reports.length,
      weight: cluster.reports.length / maxCount,
    }))
    .sort((a, b) => b.reportCount - a.reportCount)
}

export function recommendBinCandidates(
  reports: WasteReport[],
  bins: ExistingBin[],
  cityCode: string,
): BinCandidate[] {
  const cityReports = reports.filter((report) => report.cityCode === cityCode)
  const cityBins = bins.filter((bin) => bin.cityCode === cityCode)
  const clusters = groupReports(cityReports)
  const maxCount = Math.max(1, ...clusters.map((cluster) => cluster.reports.length))

  const ranked = clusters
    .map((cluster) => {
      const uniqueDays = new Set(cluster.reports.map((report) => report.createdAt.slice(0, 10))).size
      const nearestBinDistanceMeters = cityBins.length
        ? Math.min(...cityBins.map((bin) => distanceMeters(cluster, bin)))
        : 1_000
      const density = cluster.reports.length / maxCount
      const recurrenceScore = Math.min(uniqueDays / 7, 1)
      const distanceScore = Math.min(nearestBinDistanceMeters / 1_000, 1)
      const score = Math.round((density * 0.7 + recurrenceScore * 0.2 + distanceScore * 0.1) * 100)
      return {
        id: `CANDIDATE-${cityCode}-${cluster.key}`,
        cityCode,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        score,
        reportCount: cluster.reports.length,
        recurrenceScore,
        nearestBinDistanceMeters: Math.round(nearestBinDistanceMeters),
      }
    })
    .sort((a, b) => b.score - a.score)

  return ranked.reduce<BinCandidate[]>((selected, candidate) => {
    if (selected.length === 3) return selected
    if (selected.every((item) => distanceMeters(item, candidate) >= 500)) {
      selected.push(candidate)
    }
    return selected
  }, [])
}
```

- [ ] **Step 5: Write failing summary test**

Create `src/analytics/summary.test.ts`:

```ts
import { expect, it } from 'vitest'
import { computeAdminSummary } from './summary'

it('counts today reports and focused cities', () => {
  const reports = [
    { id: '1', cityCode: '11', createdAt: '2026-07-29T01:00:00.000Z' },
    { id: '2', cityCode: '11', createdAt: '2026-07-28T01:00:00.000Z' },
    { id: '3', cityCode: '26', createdAt: '2026-07-29T01:00:00.000Z' },
  ]
  const result = computeAdminSummary(
    reports as never,
    [{ id: 'C1' }] as never,
    new Date('2026-07-29T12:00:00.000Z'),
  )
  expect(result).toEqual({
    totalReports: 3,
    todayReports: 2,
    focusedCityCount: 2,
    candidateCount: 1,
  })
})
```

- [ ] **Step 6: Implement summary and run analytics tests**

Create `src/analytics/summary.ts`:

```ts
import type { BinCandidate, WasteReport } from '../domain/models'

export type AdminSummary = {
  totalReports: number
  todayReports: number
  focusedCityCount: number
  candidateCount: number
}

export function computeAdminSummary(
  reports: WasteReport[],
  candidates: BinCandidate[],
  now = new Date(),
): AdminSummary {
  const today = now.toISOString().slice(0, 10)
  return {
    totalReports: reports.length,
    todayReports: reports.filter((report) => report.createdAt.startsWith(today)).length,
    focusedCityCount: new Set(reports.map((report) => report.cityCode)).size,
    candidateCount: candidates.length,
  }
}
```

Run:

```powershell
npm run test -- src/analytics
```

Expected: all analytics tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/analytics
git commit -m "feat: calculate heat data and bin candidates"
```

---

### Task 5: Leaflet 지도 어댑터

**Files:**
- Create: `src/map/map-types.ts`
- Create: `src/map/map-data.ts`
- Create: `src/map/map-data.test.ts`
- Create: `src/map/leaflet-map.ts`
- Create: `src/map/leaflet.heat.d.ts`
- Create: `src/map/map.css`

**Interfaces:**
- Consumes: city centers, reports, bins, candidates, heat points
- Produces: `MapAdapter`, `MapFactory`, `createLeafletMap(container, options): MapAdapter`
- Produces: `toReportMarkers`, `toBinMarkers`, `toCandidateMarkers`

- [ ] **Step 1: Define the map boundary**

Create `src/map/map-types.ts`:

```ts
import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'
import type { HeatPoint } from '../analytics/recommendations'

export type Coordinates = { latitude: number; longitude: number }
export type MapLayerVisibility = {
  reports: boolean
  heat: boolean
  bins: boolean
  candidates: boolean
}

export type MapAdapter = {
  setView(center: Coordinates, zoom: number): void
  setSelectedLocation(location: Coordinates | undefined): void
  onMapClick(listener: (location: Coordinates) => void): () => void
  renderReports(reports: WasteReport[]): void
  renderHeat(points: HeatPoint[]): void
  renderBins(bins: ExistingBin[]): void
  renderCandidates(candidates: BinCandidate[]): void
  setLayerVisibility(visibility: MapLayerVisibility): void
  retryTiles(): void
  destroy(): void
}

export type MapFactory = (
  container: HTMLElement,
  options: {
    center: Coordinates
    zoom: number
    onTileError(message: string): void
    onTileReady(): void
  },
) => MapAdapter
```

- [ ] **Step 2: Write failing map-data tests**

Create `src/map/map-data.test.ts`:

```ts
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
```

- [ ] **Step 3: Run and verify RED**

Run:

```powershell
npm run test -- src/map/map-data.test.ts
```

Expected: FAIL because the mapper functions do not exist.

- [ ] **Step 4: Implement pure layer mapping**

Create `src/map/map-data.ts`:

```ts
import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'

export type MapMarker = {
  id: string
  latitude: number
  longitude: number
  kind: 'report' | 'bin' | 'candidate'
  label: string
  emphasized: boolean
}

export function toReportMarkers(reports: WasteReport[]): MapMarker[] {
  return reports.map((report) => ({
    id: report.id,
    latitude: report.latitude,
    longitude: report.longitude,
    kind: 'report',
    label: `${report.cityName} · ${new Date(report.createdAt).toLocaleString('ko-KR')}`,
    emphasized: report.source === 'resident',
  }))
}

export function toBinMarkers(bins: ExistingBin[]): MapMarker[] {
  return bins.map((bin) => ({
    id: bin.id,
    latitude: bin.latitude,
    longitude: bin.longitude,
    kind: 'bin',
    label: '기존 쓰레기통',
    emphasized: false,
  }))
}

export function toCandidateMarkers(candidates: BinCandidate[]): MapMarker[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    kind: 'candidate',
    label: `추천 ${candidate.score}점 · 제보 ${candidate.reportCount}건 · 기존 쓰레기통까지 ${candidate.nearestBinDistanceMeters}m`,
    emphasized: true,
  }))
}
```

- [ ] **Step 5: Implement Leaflet and tile health behavior**

Create `src/map/leaflet.heat.d.ts`:

```ts
declare module 'leaflet.heat' {
  import 'leaflet'
}

declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number
      blur?: number
      minOpacity?: number
      gradient?: Record<number, string>
    },
  ): Layer
}
```

Create `src/map/leaflet-map.ts`. It must:

- import `leaflet/dist/leaflet.css`, `leaflet`, `leaflet.heat`, and `./map.css`;
- create separate `LayerGroup`s for reports, bins, and candidates;
- keep the heat layer separate;
- bind map clicks and return an unsubscribe function;
- add the exact tile URL from Global Constraints;
- call `onTileError('지도를 불러오지 못했습니다. 데이터 레이어는 계속 사용할 수 있습니다.')` on the first `tileerror`;
- call `onTileReady()` after a successful tile load;
- replace only the tile layer in `retryTiles()` and never recreate data layers;
- use `circleMarker` rather than Leaflet's missing default image assets;
- render the selected resident location as a high-contrast green ring;
- remove the Leaflet map and all listeners in `destroy()`.

Core setup:

```ts
const TILE_URL =
  'https://mt.google.com/vt/lyrs=m&hl=ko_KR&scale=2&x={x}&y={y}&z={z}'

function createTileLayer(onError: (message: string) => void, onReady: () => void) {
  let reportedError = false
  const layer = L.tileLayer(TILE_URL, {
    maxZoom: 20,
    attribution: '&copy; Google',
  })
  layer.on('tileerror', () => {
    if (reportedError) return
    reportedError = true
    onError('지도를 불러오지 못했습니다. 데이터 레이어는 계속 사용할 수 있습니다.')
  })
  layer.on('load', onReady)
  return layer
}
```

- [ ] **Step 6: Run the map tests and build**

Run:

```powershell
npm run test -- src/map/map-data.test.ts
npm run build
```

Expected: map-data tests PASS and Leaflet TypeScript compilation succeeds.

- [ ] **Step 7: Commit**

```powershell
git add src/map
git commit -m "feat: add Leaflet map adapter"
```

---

### Task 6: 역할 선택, 주민 제보, 제보 완료

**Files:**
- Create: `src/test/fakes.ts`
- Create: `src/screens/home/home.ts`
- Create: `src/screens/home/home.test.ts`
- Create: `src/screens/home/home.css`
- Create: `src/screens/resident/report.ts`
- Create: `src/screens/resident/report.test.ts`
- Create: `src/screens/resident/complete.ts`
- Create: `src/screens/resident/complete.test.ts`
- Create: `src/screens/resident/resident.css`
- Modify: `src/main.ts`
- Modify: `src/app/app.ts`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `ReportRepository`, `MapFactory`, `compressImage`, `navigate`
- Produces: `renderHome`, `renderResidentReport`, `renderResidentComplete`
- Produces: screen handles with deterministic `destroy()`

- [ ] **Step 1: Add reusable test fakes**

Create `src/test/fakes.ts` with:

```ts
import type { AppDataState, ReportRepository } from '../domain/models'
import type { MapAdapter, MapFactory } from '../map/map-types'

export function createMapFactoryFake() {
  let clickListener: ((location: { latitude: number; longitude: number }) => void) | undefined
  const adapter: MapAdapter = {
    setView() {},
    setSelectedLocation() {},
    onMapClick(listener) {
      clickListener = listener
      return () => { clickListener = undefined }
    },
    renderReports() {},
    renderHeat() {},
    renderBins() {},
    renderCandidates() {},
    setLayerVisibility() {},
    retryTiles() {},
    destroy() {},
  }
  return {
    factory: (() => adapter) as MapFactory,
    click(latitude: number, longitude: number) {
      clickListener?.({ latitude, longitude })
    },
  }
}

export function createRepositoryFake(initial: AppDataState): ReportRepository {
  let state = structuredClone(initial)
  return {
    getState: () => structuredClone(state),
    getReport: (id) => state.reports.find((report) => report.id === id),
    addReport(input) {
      const report = {
        ...input,
        id: 'SSUDAM-TEST-1',
        createdAt: '2026-07-29T03:00:00.000Z',
        source: 'resident' as const,
      }
      state.reports.push(report)
      return report
    },
    reset() {
      state = structuredClone(initial)
      return structuredClone(state)
    },
    subscribe: () => () => undefined,
    getLastWarning: () => undefined,
    destroy() {},
  }
}
```

- [ ] **Step 2: Write failing home interaction test**

Create `src/screens/home/home.test.ts`:

```ts
import { expect, it, vi } from 'vitest'
import { renderHome } from './home'

it('enters the resident portal without authentication', () => {
  const navigate = vi.fn()
  const screen = renderHome({ navigate })
  document.body.append(screen.element)

  screen.element.querySelector<HTMLButtonElement>('[data-action="resident"]')?.click()

  expect(navigate).toHaveBeenCalledWith({ name: 'resident-report' })
})
```

- [ ] **Step 3: Run home test and verify RED**

Run:

```powershell
npm run test -- src/screens/home/home.test.ts
```

Expected: FAIL because `renderHome` does not exist.

- [ ] **Step 4: Implement the home screen**

Create `src/screens/home/home.ts` with semantic buttons and no login fields:

```ts
import type { AppRoute } from '../../app/router'
import './home.css'

export function renderHome({ navigate }: { navigate(route: AppRoute): void }) {
  const element = document.createElement('main')
  element.className = 'home-screen'
  element.innerHTML = `
    <section class="home-hero" aria-labelledby="home-title">
      <p class="eyebrow">시민 참여형 환경 데이터 서비스</p>
      <h1 id="home-title">우리 동네를<br><span>쓰담쓰담</span></h1>
      <p>사진과 위치로 쓰레기를 제보하고, 데이터로 더 깨끗한 도시를 만듭니다.</p>
      <div class="role-actions">
        <button class="role-card role-card--resident" data-action="resident" type="button">
          <strong>주민으로 시작</strong><span>사진과 위치로 간편 제보</span>
        </button>
        <button class="role-card role-card--admin" data-action="admin" type="button">
          <strong>관리자 데모 입장</strong><span>히트맵과 설치 후보 분석</span>
        </button>
      </div>
    </section>
  `
  element.querySelector('[data-action="resident"]')
    ?.addEventListener('click', () => navigate({ name: 'resident-report' }))
  element.querySelector('[data-action="admin"]')
    ?.addEventListener('click', () => navigate({ name: 'admin' }))
  return { element, destroy() {} }
}
```

- [ ] **Step 5: Write the failing resident submission test**

Create `src/screens/resident/report.test.ts`:

```ts
import { expect, it, vi } from 'vitest'
import { createRepositoryFake, createMapFactoryFake } from '../../test/fakes'
import { renderResidentReport } from './report'

it('stores a map-selected report and navigates to 제보 완료', async () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const map = createMapFactoryFake()
  const navigate = vi.fn()
  const screen = renderResidentReport({
    repository,
    mapFactory: map.factory,
    imageCompressor: vi.fn().mockResolvedValue('data:image/webp;base64,AAAA'),
    geolocation: undefined,
    navigate,
  })
  document.body.append(screen.element)

  const city = screen.element.querySelector<HTMLSelectElement>('[name="cityCode"]')!
  city.value = '11'
  city.dispatchEvent(new Event('change', { bubbles: true }))
  map.click(37.5665, 126.978)

  const file = new File(['image'], 'waste.png', { type: 'image/png' })
  const input = screen.element.querySelector<HTMLInputElement>('[name="photo"]')!
  Object.defineProperty(input, 'files', { value: [file] })
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await Promise.resolve()
  await Promise.resolve()

  screen.element.querySelector<HTMLFormElement>('form')!
    .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))

  expect(repository.getReport('SSUDAM-TEST-1')).toMatchObject({
    cityCode: '11',
    latitude: 37.5665,
    longitude: 126.978,
  })
  expect(navigate).toHaveBeenCalledWith({
    name: 'resident-complete',
    reportId: 'SSUDAM-TEST-1',
  })
})
```

- [ ] **Step 6: Run resident test and verify RED**

Run:

```powershell
npm run test -- src/screens/resident/report.test.ts
```

Expected: FAIL because the resident screen does not exist.

- [ ] **Step 7: Implement the resident report screen**

Create `src/screens/resident/report.ts`. The screen must:

- render a city `<select>` from `CITY_OPTIONS`;
- create a Leaflet map below the city field;
- center on the selected city's catalog position;
- expose a `현재 위치 사용` button;
- request geolocation only after that button is pressed;
- show `위치 권한을 사용할 수 없습니다. 지도에서 직접 선택해주세요.` on error;
- update a visible coordinate summary after map click or geolocation success;
- accept `image/*`, show a compression progress label, and render a preview;
- show field-specific validation messages;
- disable double submission;
- call `repository.addReport` only after `validateReportDraft` succeeds;
- navigate to the created report ID;
- unsubscribe map click and destroy the map in `destroy()`.

Use this dependency contract:

```ts
type ResidentDependencies = {
  repository: ReportRepository
  mapFactory: MapFactory
  imageCompressor: typeof compressImage
  geolocation?: Geolocation
  navigate(route: AppRoute): void
}
```

The submit handler must follow this exact sequence:

```ts
const result = validateReportDraft(draft)
if (!result.ok) {
  renderErrors(result.errors)
  return
}
const report = dependencies.repository.addReport(result.value)
dependencies.navigate({ name: 'resident-complete', reportId: report.id })
```

- [ ] **Step 8: Write and implement the completion screen**

Create `src/screens/resident/complete.test.ts` first:

```ts
import { expect, it } from 'vitest'
import { createRepositoryFake } from '../../test/fakes'
import { renderResidentComplete } from './complete'

it('shows 제보 완료 and administrator map synchronization copy', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })

  const screen = renderResidentComplete({ repository, reportId: report.id, navigate() {} })
  document.body.append(screen.element)

  expect(screen.element.textContent).toContain('제보 완료')
  expect(screen.element.textContent).toContain('관리자 지도에 반영됨')
  expect(screen.element.textContent).toContain(report.id)
})
```

Run it and verify it fails, then create `src/screens/resident/complete.ts` with:

```ts
export function renderResidentComplete(dependencies: CompleteDependencies) {
  const report = dependencies.repository.getReport(dependencies.reportId)
  if (!report) {
    dependencies.navigate({ name: 'home' })
    return { element: document.createElement('main'), destroy() {} }
  }
  const element = document.createElement('main')
  element.className = 'complete-screen'
  element.innerHTML = `
    <section aria-labelledby="complete-title">
      <div class="success-check" aria-hidden="true">✓</div>
      <h1 id="complete-title">제보 완료</h1>
      <p>소중한 제보가 접수되었습니다.</p>
      <dl><dt>제보 번호</dt><dd>${report.id}</dd></dl>
      <div class="admin-sync" role="status">
        <strong>관리자 지도에 반영됨</strong>
        <span>히트맵과 쓰레기통 추천 위치가 새 데이터로 갱신됩니다.</span>
      </div>
      <button data-action="home" type="button">홈으로 돌아가기</button>
      <button data-action="another" type="button">다른 제보하기</button>
    </section>
  `
  element.querySelector('[data-action="home"]')
    ?.addEventListener('click', () => dependencies.navigate({ name: 'home' }))
  element.querySelector('[data-action="another"]')
    ?.addEventListener('click', () => dependencies.navigate({ name: 'resident-report' }))
  return { element, destroy() {} }
}
```

- [ ] **Step 9: Compose the app and add the approved visual system**

In `src/main.ts`:

- create one repository with `createReportRepository({ storage: window.localStorage })`;
- map route names to screen renderers;
- pass `navigator.geolocation`, `compressImage`, `createLeafletMap`, and `navigate`;
- start `createApp`;
- call `app.destroy()` and `repository.destroy()` once on `pagehide`;
- throw a clear error if `#app` is missing.

In `src/style.css`, define:

```css
:root {
  --color-ink: #102a25;
  --color-navy: #173b53;
  --color-green-900: #143d34;
  --color-green-700: #2d755f;
  --color-green-500: #35a77c;
  --color-green-100: #dff3ea;
  --color-canvas: #f4f7f5;
  --color-surface: #ffffff;
  --color-muted: #66756f;
  --color-border: #d9e2de;
  --color-danger: #b42318;
  --radius-sm: 10px;
  --radius-md: 18px;
  --shadow-soft: 0 18px 50px rgba(16, 42, 37, 0.08);
  font-family: Pretendard, "Noto Sans KR", system-ui, sans-serif;
}
```

Add `:focus-visible`, visually hidden text, buttons, form controls, loading state, error text, and reduced-motion rules. Keep screen-specific layout in each screen CSS file.

- [ ] **Step 10: Run resident and home tests, then build**

Run:

```powershell
npm run test -- src/screens/home src/screens/resident
npm run build
```

Expected: all home/resident tests PASS and build succeeds.

- [ ] **Step 11: Commit**

```powershell
git add src index.html
git commit -m "feat: add resident reporting flow"
```

---

### Task 7: 관리자 대시보드와 실시간 데이터 반영

**Files:**
- Create: `src/screens/admin/dashboard.ts`
- Create: `src/screens/admin/dashboard.test.ts`
- Create: `src/screens/admin/admin.css`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: repository, city catalog, analytics functions, map factory
- Produces: `renderAdminDashboard(dependencies): ScreenHandle`
- Uses: `AdminFilters = { cityCode: 'all' | string; days: 7 | 30 | 90 }`

- [ ] **Step 1: Write the failing administrator integration test**

Create `src/screens/admin/dashboard.test.ts`:

```ts
import { expect, it } from 'vitest'
import { createRepositoryFake, createMapFactoryFake } from '../../test/fakes'
import { renderAdminDashboard } from './dashboard'

it('includes a newly submitted resident report in metrics and candidate evidence', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const map = createMapFactoryFake()

  const screen = renderAdminDashboard({
    repository,
    mapFactory: map.factory,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    navigate() {},
  })
  document.body.append(screen.element)

  expect(screen.element.querySelector('[data-metric="total"]')?.textContent).toBe('1')
  expect(screen.element.textContent).toContain('최신 제보')
  expect(screen.element.textContent).toContain('서울특별시')
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
npm run test -- src/screens/admin/dashboard.test.ts
```

Expected: FAIL because the admin screen does not exist.

- [ ] **Step 3: Implement filtered view-model calculation**

Inside `dashboard.ts`, keep calculations outside DOM rendering:

```ts
type AdminFilters = { cityCode: 'all' | string; days: 7 | 30 | 90 }

function filterReports(reports: WasteReport[], filters: AdminFilters, now: Date) {
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - filters.days)
  return reports.filter((report) => {
    const matchesCity = filters.cityCode === 'all' || report.cityCode === filters.cityCode
    return matchesCity && new Date(report.createdAt) >= threshold
  })
}
```

For `cityCode === 'all'`, calculate national summary and heat points but show candidates for the city with the most filtered reports. When a specific city is selected, calculate candidates only for that city.

- [ ] **Step 4: Implement administrator UI**

The screen must render:

- header with `쓰담쓰담 관리자` and `홈으로`;
- four summary metrics;
- city select with `대한민국 전체` plus `CITY_OPTIONS`;
- period select with 7, 30, 90 days;
- layer checkboxes for 제보, 히트맵, 기존 쓰레기통, 추천 위치;
- dominant map area;
- candidate list ordered by score;
- a latest-report detail area with `최신 제보` label for resident-origin reports;
- empty copy `아직 수집된 제보가 없습니다`;
- no-candidate copy `추천 위치를 계산하려면 더 많은 제보가 필요합니다`;
- `데모 데이터 초기화` button that opens a native `<dialog>` confirmation.

Create elements for resident notes and file-derived text with `document.createElement`, then assign `textContent`; never concatenate those values into `innerHTML`.

On every filter or layer change:

```ts
const reports = filterReports(repository.getState().reports, filters, now())
const heat = buildHeatPoints(reports)
const candidates = recommendBinCandidates(reports, repository.getState().bins, candidateCityCode)
map.renderReports(reports)
map.renderHeat(heat)
map.renderBins(filteredBins)
map.renderCandidates(candidates)
map.setLayerVisibility(layerVisibility)
renderMetrics(computeAdminSummary(reports, candidates, now()))
renderCandidateList(candidates)
```

Subscribe to repository updates in the screen constructor and unsubscribe in `destroy()`.

- [ ] **Step 5: Add responsive administrator styling**

In `admin.css`:

- use a two-column desktop grid with a minimum 60% map width;
- stack metrics and map below 900px;
- preserve at least 420px map height on desktop and 340px on mobile;
- keep filters wrapping without horizontal page overflow;
- use `<dl>` for candidate evidence;
- render the score as text and bar, not color alone;
- keep checkboxes and selects keyboard accessible.

- [ ] **Step 6: Run admin tests and full unit suite**

Run:

```powershell
npm run test -- src/screens/admin
npm run test
npm run build
```

Expected: administrator test, full test suite, and build all pass.

- [ ] **Step 7: Commit**

```powershell
git add src/screens/admin src/main.ts
git commit -m "feat: add administrator analytics dashboard"
```

---

### Task 8: 저장 실패 복구, 탭 동기화, 지도 오류

**Files:**
- Modify: `src/data/report-repository.ts`
- Modify: `src/data/report-repository.test.ts`
- Modify: `src/screens/resident/report.ts`
- Modify: `src/screens/resident/report.test.ts`
- Modify: `src/screens/admin/dashboard.ts`
- Modify: `src/screens/admin/dashboard.test.ts`
- Modify: `src/test/fakes.ts`

**Interfaces:**
- Keeps the existing `ReportRepository` public interface unchanged
- Consumes: browser `storage` events and `DOMException`
- Produces: visible nonblocking warnings and retry actions

- [ ] **Step 1: Write the failing quota-fallback test**

Append to `report-repository.test.ts`:

```ts
it('keeps the report in memory when localStorage quota is exceeded', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('quota', 'QuotaExceededError')
    },
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  } satisfies Storage
  const repository = createReportRepository({
    storage,
    idFactory: () => 'MEMORY-1',
  })

  repository.addReport(input)

  expect(repository.getReport('MEMORY-1')).toBeDefined()
  expect(repository.getLastWarning()).toBe('storage-quota')
})
```

- [ ] **Step 2: Run the repository test and verify RED**

Run:

```powershell
npm run test -- src/data/report-repository.test.ts
```

Expected: FAIL because `setItem` throws and the repository does not keep running.

- [ ] **Step 3: Implement memory fallback**

Change `persist()`:

```ts
function persist(): void {
  if (!options.storage) return
  try {
    options.storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      warning = 'storage-quota'
      return
    }
    warning = 'storage-unavailable'
  }
}
```

The state mutation happens before `persist()`, so the current session continues.

- [ ] **Step 4: Write the failing cross-tab synchronization test**

Append:

```ts
it('reloads state when another tab updates the storage key', () => {
  const listener = vi.fn()
  const repository = createReportRepository({ storage: localStorage })
  repository.subscribe(listener)
  const next = { ...repository.getState(), reports: [] }
  localStorage.setItem('ssudam:data:v1', JSON.stringify(next))

  window.dispatchEvent(new StorageEvent('storage', {
    key: 'ssudam:data:v1',
    newValue: JSON.stringify(next),
  }))

  expect(repository.getState().reports).toEqual([])
  expect(listener).toHaveBeenCalled()
})
```

- [ ] **Step 5: Implement and dispose the storage listener**

Register one storage event listener per repository. On matching key with valid version-1 state, replace memory state and emit. Replace the repository's initial no-op `destroy()` implementation so it removes the listener, and call it once from `main.ts` during page unload.

Add `destroy() {}` to repository test fakes so they continue to satisfy the interface.

- [ ] **Step 6: Add resident and admin warning behavior tests**

Add a resident test asserting that geolocation rejection leaves submission available after a map click and shows:

```text
위치 권한을 사용할 수 없습니다. 지도에서 직접 선택해주세요.
```

Add an admin test that invokes the map factory's `onTileError` and asserts:

```text
지도를 불러오지 못했습니다. 데이터 레이어는 계속 사용할 수 있습니다.
```

Also assert a `지도 다시 불러오기` button calls `map.retryTiles()`.

- [ ] **Step 7: Implement warnings and reset confirmation**

- In the resident screen, catch compression failure and show `사진을 처리하지 못했습니다. 다른 사진을 선택해주세요.`
- If `repository.getLastWarning()` is `storage-quota`, show `브라우저 저장 공간이 부족해 현재 화면에서만 제보가 유지됩니다.`
- In the admin screen, keep the map container and data panels mounted on tile error.
- The reset dialog must use `취소` and `초기화` buttons, call `repository.reset()` only after confirmation, then rerender metrics, layers, and candidates.
- Do not use `alert()` or `confirm()`.

- [ ] **Step 8: Run resilience tests**

Run:

```powershell
npm run test -- src/data/report-repository.test.ts src/screens/resident src/screens/admin
npm run build
```

Expected: quota, synchronization, geolocation, tile error, reset, and build checks PASS.

- [ ] **Step 9: Commit**

```powershell
git add src
git commit -m "feat: add demo recovery and synchronization"
```

---

### Task 9: 발표 흐름 E2E, 접근성, 최종 시각 검증

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/ssudam-flow.spec.ts`
- Modify: `src/style.css`
- Modify: `src/screens/home/home.css`
- Modify: `src/screens/resident/resident.css`
- Modify: `src/screens/admin/admin.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete app through browser-visible behavior
- Produces: repeatable presentation flow and documented run commands

- [ ] **Step 1: Configure Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ko-KR',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Write the failing presentation-flow E2E test**

Create `tests/e2e/ssudam-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6WQAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await page.route('https://mt.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng })
  })
  await page.goto('#/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('resident report appears in the administrator portal', async ({ page }) => {
  await page.getByRole('button', { name: /주민으로 시작/ }).click()
  await page.getByLabel('시 선택').selectOption('11')
  await page.locator('.leaflet-container').click({ position: { x: 220, y: 180 } })
  await page.getByLabel('쓰레기 사진').setInputFiles({
    name: 'waste.png',
    mimeType: 'image/png',
    buffer: transparentPng,
  })
  await page.getByLabel('메모').fill('공모전 발표용 신규 제보')
  await page.getByRole('button', { name: '제보하기' }).click()

  await expect(page.getByRole('heading', { name: '제보 완료' })).toBeVisible()
  await expect(page.getByText('관리자 지도에 반영됨')).toBeVisible()

  await page.getByRole('button', { name: '홈으로 돌아가기' }).click()
  await page.getByRole('button', { name: /관리자 데모 입장/ }).click()

  await expect(page.getByText('공모전 발표용 신규 제보')).toBeVisible()
  await expect(page.getByText('최신 제보')).toBeVisible()
  await expect(page.locator('[data-metric="total"]')).not.toHaveText('0')
})

test('location denial falls back to map selection', async ({ browser }) => {
  const context = await browser.newContext({ permissions: [] })
  const page = await context.newPage()
  await page.route('https://mt.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng })
  })
  await page.goto('http://127.0.0.1:4173/#/resident/report')
  await page.getByRole('button', { name: '현재 위치 사용' }).click()
  await expect(page.getByText('지도에서 직접 선택해주세요.')).toBeVisible()
  await context.close()
})

test('tile failure preserves administrator data panels', async ({ page }) => {
  await page.unroute('https://mt.google.com/**')
  await page.route('https://mt.google.com/**', (route) => route.abort())
  await page.goto('#/admin')

  await expect(page.getByText('데이터 레이어는 계속 사용할 수 있습니다.')).toBeVisible()
  await expect(page.locator('[data-metric="total"]')).toBeVisible()
  await expect(page.getByRole('button', { name: '지도 다시 불러오기' })).toBeVisible()
})
```

- [ ] **Step 3: Run E2E and verify RED**

Run:

```powershell
npx playwright install chromium
npm run test:e2e
```

Expected: at least one flow assertion FAIL before final labels, wiring, or image handling are complete.

- [ ] **Step 4: Fix only the behaviors exposed by the E2E failures**

Use accessible labels exactly as the E2E test expects:

- `시 선택`
- `쓰레기 사진`
- `메모`
- `제보하기`
- `현재 위치 사용`
- `지도 다시 불러오기`

Ensure the administrator latest-report detail includes the note text and that map clicks set actual latitude and longitude.

- [ ] **Step 5: Verify responsive layouts at three sizes**

Add a Playwright test loop:

```ts
for (const viewport of [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`${viewport.name} layouts do not overflow horizontally`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const path of ['#/', '#/resident/report', '#/admin']) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
    }
  })
}
```

Adjust CSS until all sizes pass without hiding required controls.

- [ ] **Step 6: Perform keyboard and reduced-motion checks**

Add E2E assertions that:

- Tab reaches both role buttons in source order;
- the resident form can be submitted without pointer use after a map location is already selected;
- each layer checkbox has a visible label;
- the reset `<dialog>` returns focus to its trigger after closing;
- `prefers-reduced-motion: reduce` disables decorative transitions.

Do not remove native focus outlines.

- [ ] **Step 7: Write the project README**

Create `README.md` containing:

```markdown
# 쓰담쓰담

시민의 위치 기반 쓰레기 제보를 지도와 히트맵으로 시각화하고,
쓰레기통 설치 후보를 제안하는 공모전·수업 발표용 데모입니다.

## 실행

```powershell
npm install
npm run dev
```

## 검증

```powershell
npm run test
npm run test:e2e
npm run build
```

## 발표 초기화

관리자 화면의 `데모 데이터 초기화`를 사용하면 초기 제보와 쓰레기통 데이터로 돌아갑니다.

## 지도

배경 지도는 프로젝트 요구사항에 따라 지정된 Google 타일 주소를 사용합니다.
타일이 로딩되지 않아도 저장된 제보와 분석 데이터는 유지됩니다.
```

When writing the actual file, use a four-backtick outer fence or omit the outer example fence so nested PowerShell fences render correctly.

- [ ] **Step 8: Run the complete verification suite**

Run:

```powershell
npm run test
npm run test:e2e
npm run build
```

Expected:

- Vitest exits 0 with no failed tests.
- Playwright exits 0 for the presentation, failure-state, responsive, and keyboard checks.
- TypeScript and Vite build exit 0.
- No console errors occur during the main presentation flow except intentionally aborted tile requests in the tile-failure test.

- [ ] **Step 9: Manually rehearse the 3–5 minute presentation**

Run:

```powershell
npm run dev
```

Rehearse in this exact order:

1. Home service purpose.
2. Resident city, map position, photo, note, submit.
3. `제보 완료` and `관리자 지도에 반영됨`.
4. Home, then administrator entry.
5. Updated metric and latest report.
6. Heatmap layer.
7. Top candidate score and evidence.
8. Demo data reset.

Record any presentation blocker as a failing E2E test before fixing it.

- [ ] **Step 10: Commit**

```powershell
git add playwright.config.ts tests src README.md
git commit -m "test: verify ssudam presentation flow"
```

---

## Final Verification Checklist

- [ ] `npm run test` passes from a fresh checkout.
- [ ] `npm run test:e2e` passes with the tile endpoint stubbed.
- [ ] `npm run build` passes.
- [ ] Home has no login or signup fields.
- [ ] All required Korean copy matches the approved design.
- [ ] Resident report survives refresh when storage is available.
- [ ] New resident report changes administrator metrics and map data.
- [ ] National and city filters affect metrics, heatmap, and candidates consistently.
- [ ] Candidate cards show score, report count, and nearest-bin distance.
- [ ] Tile failure leaves data panels and retry action visible.
- [ ] Storage quota failure preserves the report in the current session.
- [ ] Reset restores deterministic seed data.
- [ ] 360px, 768px, and 1440px widths have no horizontal overflow.
- [ ] Keyboard focus and visible labels are present for all controls.
- [ ] The 3–5 minute presentation rehearsal completes without manual data repair.
