# 쓰담쓰담 Material You UI 전면 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 기능과 데이터 계약을 보존하면서 홈·주민 제보·완료·관리자 화면을 Forest Sage 기반 Material You 디자인으로 전면 재설계한다.

**Architecture:** Vanilla TypeScript 화면 렌더러와 Leaflet 지도 구조는 그대로 유지한다. 전역 CSS에 디자인 토큰과 공통 프리미티브를 정의하고 역할별 화면은 기존 CSS 파일 안에서 정보 구조와 반응형 레이아웃을 담당한다. DOM 계약은 Vitest로, 실제 브라우저 흐름·반응형·시각 결과는 Playwright로 검증한다.

**Tech Stack:** TypeScript 6, Vite 8, Vitest 4, happy-dom, Playwright 1.62, Leaflet 1.9, CSS

## Global Constraints

- React와 shadcn/ui 패키지를 추가하지 않는다.
- 지정 타일 URL `https://mt.google.com/vt/lyrs=m&hl=ko_KR&scale=2&x={x}&y={y}&z={z}`를 변경하지 않는다.
- Primary `#225F4D`, Primary Hover `#184C3C`, Secondary `#397763`, Primary Container `#DCEFE4`를 사용한다.
- Canvas `#F5F8F3`, Surface `#FFFFFF`, Surface Variant `#EDF3EF`, Ink `#18372D`, Muted `#69756F`, Outline `#DFE7E2`를 사용한다.
- Error `#B3261E`, Error Container `#F9DEDC`, Warning Container `#FFF1C2`를 사용한다.
- 모든 상호작용 요소는 최소 44px 터치 영역과 3px `:focus-visible` 링을 제공한다.
- 전환 시간은 160–220ms이고 `prefers-reduced-motion: reduce`에서는 사실상 제거한다.
- `제보 완료`, `관리자 지도에 반영됨`, `지도 다시 불러오기` 문구를 유지한다.
- 전국 시 카탈로그, 저장·복구, 사진 압축, 위치 선택, 지도 레이어, 추천 점수, 초기화 다이얼로그 동작을 변경하지 않는다.
- 추천 분석의 300m 그룹, 밀집도 70·반복 20·거리 10 점수, 기존 쓰레기통 500m 중복 제거를 변경하지 않는다.
- 텍스트와 상태 색상은 WCAG AA 대비를 목표로 검증하고 상태 변경은 기존 `aria-live`로 전달한다.
- 기존 Vitest 87개 이상, Playwright 10개 이상과 프로덕션 빌드가 모두 통과해야 한다.
- 360×800, 768×1024, 1440×900에서 가로 오버플로가 없어야 한다.

## File Map

- `src/style.css`: Forest Sage 토큰, 타이포그래피, 버튼·입력·배너·앱 바 공통 프리미티브
- `src/style.test.ts`: 전역 토큰과 접근성·모션 CSS 계약
- `src/map/map.css`: Leaflet 표면과 마커를 새 토큰에 맞추는 지도 전용 스타일
- `src/screens/home/home.ts`: 홈 앱 바, 히어로, 역할 CTA, 가치 설명의 의미 구조
- `src/screens/home/home.css`: 홈 전용 반응형과 Material You 표현
- `src/screens/home/home.test.ts`: 홈 정보 계층과 기존 이동 계약
- `src/screens/resident/report.ts`: 주민 앱 바, 얇은 진행 표시, 폼 구획과 지도 상태 구조
- `src/screens/resident/complete.ts`: 성공 상태, 제보 번호, 관리자 반영 상태, 후속 CTA 구조
- `src/screens/resident/resident.css`: 주민 제보·완료 화면 반응형과 상태 표현
- `src/screens/resident/report.test.ts`: 주민 화면 구조와 기존 제보 동작
- `src/screens/resident/complete.test.ts`: 완료 화면 구조와 필수 문구
- `src/screens/admin/dashboard.ts`: 관리자 앱 바, 필터 툴바, KPI, 지도·인사이트 패널 구조
- `src/screens/admin/admin.css`: 관리자 균형형 밀도, 2:1 레이아웃, 모바일 스택
- `src/screens/admin/dashboard.test.ts`: 관리자 정보 계층과 기존 분석 동작
- `tests/e2e/helpers.ts`: Google 타일 모킹과 시각 테스트 공통 도우미
- `tests/e2e/ssudam-flow.spec.ts`: 새 카피와 기존 전체 흐름 검증
- `tests/e2e/visual-regression.spec.ts`: 7개 핵심 뷰포트 스크린샷 회귀
- `tests/e2e/visual-regression.spec.ts-snapshots/*.png`: 승인된 브라우저 기준 이미지

---

### Task 1: Forest Sage 전역 디자인 시스템

**Files:**
- Create: `src/style.test.ts`
- Modify: `src/style.css`
- Modify: `src/map/map.css`

**Interfaces:**
- Consumes: 현재 모든 화면이 사용하는 `--color-*`, `--radius-*`, `--shadow-*` CSS 변수
- Produces: `--md-primary`, `--md-primary-hover`, `--md-secondary`, `--md-primary-container`, `--md-canvas`, `--md-surface`, `--md-surface-variant`, `--md-ink`, `--md-muted`, `--md-outline`, `--md-error`, `--md-error-container`, `--md-warning-container`와 `.app-bar`, `.button`, `.button--filled`, `.button--tonal`, `.button--text`, `.status-banner`

- [ ] **Step 1: 전역 CSS 계약 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import globalCss from './style.css?raw'

describe('Material You global design contract', () => {
  it.each([
    ['--md-primary', '#225F4D'],
    ['--md-primary-hover', '#184C3C'],
    ['--md-secondary', '#397763'],
    ['--md-primary-container', '#DCEFE4'],
    ['--md-canvas', '#F5F8F3'],
    ['--md-surface', '#FFFFFF'],
    ['--md-surface-variant', '#EDF3EF'],
    ['--md-ink', '#18372D'],
    ['--md-muted', '#69756F'],
    ['--md-outline', '#DFE7E2'],
    ['--md-error', '#B3261E'],
    ['--md-error-container', '#F9DEDC'],
    ['--md-warning-container', '#FFF1C2'],
  ])('defines %s as %s', (token, value) => {
    expect(globalCss).toContain(`${token}: ${value}`)
  })

  it('keeps controls accessible and honors reduced motion', () => {
    expect(globalCss).toMatch(/min-height:\s*44px/)
    expect(globalCss).toMatch(/outline:\s*3px solid/)
    expect(globalCss).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
```

- [ ] **Step 2: 새 테스트가 기존 토큰 때문에 실패하는지 확인**

Run: `npm test -- src/style.test.ts`

Expected: FAIL because `--md-primary: #225F4D` and the other Material tokens do not exist.

- [ ] **Step 3: 전역 토큰과 공통 프리미티브 구현**

```css
:root {
  --md-primary: #225F4D;
  --md-primary-hover: #184C3C;
  --md-secondary: #397763;
  --md-primary-container: #DCEFE4;
  --md-canvas: #F5F8F3;
  --md-surface: #FFFFFF;
  --md-surface-variant: #EDF3EF;
  --md-ink: #18372D;
  --md-muted: #69756F;
  --md-outline: #DFE7E2;
  --md-error: #B3261E;
  --md-error-container: #F9DEDC;
  --md-warning-container: #FFF1C2;
  --radius-control: 12px;
  --radius-card: 24px;
  --radius-hero: 32px;
  --shadow-soft: 0 12px 36px rgb(24 55 45 / 8%);
  --transition-ui: 180ms ease;
}

button,
.button,
input,
select {
  min-height: 44px;
}

.button--filled { color: #fff; background: var(--md-primary); }
.button--tonal { color: var(--md-ink); background: var(--md-primary-container); }
.button--text { color: var(--md-primary); background: transparent; }

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--md-secondary) 72%, white);
  outline-offset: 3px;
}
```

`src/style.css`에서는 기존 변수에 새 토큰 별칭을 제공해 Leaflet과 기존 상태 코드가 깨지지 않게 한다. `.app-bar`는 최대 폭 컨테이너, 64px 높이, 로고와 보조 동작의 양끝 정렬을 담당한다. `.status-banner`는 오류·경고·성공 변형을 제공한다. `src/map/map.css`는 배경·마커 그림자를 새 토큰으로 교체하고 지도 내부 Leaflet 컨트롤에 12px 반경과 얇은 경계를 적용한다.

- [ ] **Step 4: 전역 계약과 프로덕션 빌드 확인**

Run: `npm test -- src/style.test.ts && npm run build`

Expected: the new test passes and Vite production build succeeds.

- [ ] **Step 5: 전역 디자인 시스템 커밋**

```powershell
git add src/style.css src/style.test.ts src/map/map.css
git commit -m "style: establish Forest Sage design system"
```

---

### Task 2: 홈 화면 재구성

**Files:**
- Modify: `src/screens/home/home.ts`
- Modify: `src/screens/home/home.css`
- Modify: `src/screens/home/home.test.ts`

**Interfaces:**
- Consumes: Task 1의 `.app-bar`, `.button`, `.button--filled`, `.button--tonal`과 Forest Sage 토큰
- Produces: 기존 `[data-action="resident"]`, `[data-action="admin"]` 이동 계약을 유지하는 홈 구조

- [ ] **Step 1: 홈 정보 계층 실패 테스트 추가**

```ts
it('presents the approved home hierarchy and value summary', () => {
  const screen = renderHome({ navigate() {} })
  document.body.append(screen.element)

  expect(screen.element.querySelector('.app-bar')).not.toBeNull()
  expect(screen.element.querySelector('h1')?.textContent).toContain('발견하고, 함께 바꿔요.')
  expect(screen.element.querySelector('[data-action="resident"]')?.textContent)
    .toContain('주민 제보 시작')
  expect(screen.element.querySelector('[data-action="admin"]')?.textContent)
    .toContain('관리자 데모')
  expect(screen.element.querySelectorAll('.value-item')).toHaveLength(3)
})
```

- [ ] **Step 2: 새 홈 테스트가 기존 히어로 구조에서 실패하는지 확인**

Run: `npm test -- src/screens/home/home.test.ts`

Expected: FAIL because `.app-bar`, the approved heading, and `.value-item` do not exist.

- [ ] **Step 3: 앱 바·히어로·역할 CTA·가치 항목 구현**

```html
<header class="app-bar home-app-bar">
  <a class="brand" href="#/" aria-label="쓰담쓰담 홈">
    <span class="brand-mark" aria-hidden="true">쓰</span>
    <span>쓰담쓰담</span>
  </a>
  <span class="app-bar-label">시민 참여형 환경 데이터</span>
</header>
<main class="home-screen">
  <section class="home-hero" aria-labelledby="home-title">
    <p class="eyebrow">사진 한 장이 만드는 깨끗한 변화</p>
    <h1 id="home-title">발견하고,<br><span>함께 바꿔요.</span></h1>
    <p class="home-intro">길거리 쓰레기를 사진과 위치로 제보하면 데이터가 모여 꼭 필요한 곳에 쓰레기통을 제안합니다.</p>
    <div class="role-actions">
      <button class="button button--filled role-action" data-action="resident" type="button">
        <strong>주민 제보 시작</strong><span>사진과 위치로 1분 안에 제보하기</span>
      </button>
      <button class="button button--tonal role-action" data-action="admin" type="button">
        <strong>관리자 데모</strong><span>히트맵과 설치 후보 살펴보기</span>
      </button>
    </div>
  </section>
  <section class="value-grid" aria-label="쓰담쓰담 서비스 특징">
    <article class="value-item"><strong>간편 제보</strong><span>사진과 위치만 남기면 접수 완료</span></article>
    <article class="value-item"><strong>데이터 시각화</strong><span>전국 시 단위 밀집 구역을 한눈에</span></article>
    <article class="value-item"><strong>설치 위치 제안</strong><span>객관적인 점수로 쓰레기통 후보 추천</span></article>
  </section>
</main>
```

`home.css`는 페이지 전체를 거대한 카드로 감싸지 않는다. 1200px 컨테이너, 넓은 좌우 여백, 32px 히어로 반경, 2열 CTA를 사용하며 767px 이하에서 CTA와 가치 항목을 한 열로 배치한다. 첫 Tab 초점은 주민 CTA, 두 번째는 관리자 CTA라는 기존 키보드 E2E 계약을 유지하도록 앱 바에는 새로운 포커스 가능 동작을 추가하지 않는다.

- [ ] **Step 4: 홈 단위 테스트와 전체 단위 회귀 확인**

Run: `npm test -- src/screens/home/home.test.ts && npm test`

Expected: all home tests and at least 87 total unit tests pass.

- [ ] **Step 5: 홈 화면 커밋**

```powershell
git add src/screens/home/home.ts src/screens/home/home.css src/screens/home/home.test.ts
git commit -m "style: redesign the home experience"
```

---

### Task 3: 주민 제보와 완료 화면 재구성

**Files:**
- Modify: `src/screens/resident/report.ts`
- Modify: `src/screens/resident/complete.ts`
- Modify: `src/screens/resident/resident.css`
- Modify: `src/screens/resident/report.test.ts`
- Modify: `src/screens/resident/complete.test.ts`

**Interfaces:**
- Consumes: Task 1의 공통 앱 바·버튼·입력·배너 토큰과 기존 `ReportRepository`, `MapFactory`, `ImageCompressor`
- Produces: 기존 `name`, `data-*`, `aria-describedby`, 제출·복구·지도 재시도 이벤트 계약을 그대로 유지하는 새 주민 UI

- [ ] **Step 1: 주민 화면 구조 실패 테스트 추가**

```ts
it('renders the approved resident form hierarchy', () => {
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })

  expect(screen.element.querySelector('.app-bar')).not.toBeNull()
  expect(screen.element.querySelector('.flow-progress')).not.toBeNull()
  expect(screen.element.querySelectorAll('.form-section')).toHaveLength(3)
  expect(screen.element.querySelector('.resident-map-surface [data-map]')).not.toBeNull()
  expect(screen.element.querySelector('.submit-button')?.textContent).toContain('제보하기')
})
```

```ts
it('renders completion actions with filled and tonal hierarchy', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const screen = renderResidentComplete({ repository, reportId: report.id, navigate() {} })

  expect(screen.element.querySelector('[data-action="home"]')?.classList)
    .toContain('button--filled')
  expect(screen.element.querySelector('[data-action="another"]')?.classList)
    .toContain('button--tonal')
  expect(screen.element.querySelector('.admin-sync')?.textContent)
    .toContain('관리자 지도에 반영됨')
})
```

- [ ] **Step 2: 새 구조 테스트가 기존 주민 마크업에서 실패하는지 확인**

Run: `npm test -- src/screens/resident/report.test.ts src/screens/resident/complete.test.ts`

Expected: FAIL because `.app-bar`, `.flow-progress`, `.form-section`, `.resident-map-surface`, and button hierarchy classes do not exist.

- [ ] **Step 3: 주민 제보 마크업을 의미 있는 세 구획으로 정리**

```html
<header class="app-bar resident-app-bar">
  <a class="brand" href="#/" aria-label="쓰담쓰담 홈"><span class="brand-mark" aria-hidden="true">쓰</span><span>쓰담쓰담</span></a>
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
    <form novalidate>
      <section class="form-section" aria-labelledby="city-section-title">
        <h2 id="city-section-title">1. 지역 선택</h2>
        <div class="field">
          <label for="city-code">시 선택</label>
          <select id="city-code" name="cityCode" aria-describedby="city-error">
            <option value="">시를 선택해 주세요</option>
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
```

시 선택 옵션은 기존 `cityOptions` 결과를 `<option value="">` 뒤에 삽입한다. 시 선택·위치·사진 오류 DOM은 기존 테스트가 기대하는 문구와 `aria-live` 속성을 유지한다. 위치 좌표는 별도 `.location-summary` 톤 표면에, 지도 오류와 `지도 다시 불러오기`는 별도 상태 행에 둔다.

- [ ] **Step 4: 완료 화면 성공 상태와 CTA 계층 구현**

```html
<header class="app-bar resident-app-bar">
  <a class="brand" href="#/" aria-label="쓰담쓰담 홈"><span class="brand-mark" aria-hidden="true">쓰</span><span>쓰담쓰담</span></a>
</header>
<main class="complete-screen">
  <section aria-labelledby="complete-title">
    <div class="success-check" aria-hidden="true">✓</div>
    <p class="eyebrow">제보 접수</p>
    <h1 id="complete-title">제보 완료</h1>
    <p>소중한 제보가 깨끗한 거리의 데이터가 되었습니다.</p>
    <dl class="report-id-row"><dt>제보 번호</dt><dd data-report-id></dd></dl>
    <div class="admin-sync" role="status">
      <strong>관리자 지도에 반영됨</strong>
      <span>히트맵과 쓰레기통 추천 위치가 새 데이터로 갱신됩니다.</span>
    </div>
    <p class="status-banner status-banner--warning" data-session-only hidden>
      저장되지 않아 현재 브라우저 세션에서만 유지됩니다. 새로고침하면 사라질 수 있습니다.
    </p>
    <div class="complete-actions">
      <button class="button button--filled" data-action="home" type="button">홈으로 돌아가기</button>
      <button class="button button--tonal" data-action="another" type="button">다른 제보하기</button>
    </div>
  </section>
</main>
```

`resident.css`는 제보 콘텐츠 최대 840px, 24px 폼 표면, 320–380px 모바일 지도 높이를 사용한다. 데스크톱에서는 필드 내부에 충분한 여백을 두고 모바일에서는 16px 페이지 패딩과 한 열 버튼을 사용한다. 오류·압축·저장 경고는 전역 상태 토큰을 사용한다.

- [ ] **Step 5: 주민 단위 테스트와 전체 단위 회귀 확인**

Run: `npm test -- src/screens/resident/report.test.ts src/screens/resident/complete.test.ts && npm test`

Expected: all resident tests and at least 87 total unit tests pass.

- [ ] **Step 6: 주민 화면 커밋**

```powershell
git add src/screens/resident/report.ts src/screens/resident/complete.ts src/screens/resident/resident.css src/screens/resident/report.test.ts src/screens/resident/complete.test.ts
git commit -m "style: redesign resident reporting flow"
```

---

### Task 4: 관리자 대시보드 재구성

**Files:**
- Modify: `src/screens/admin/dashboard.ts`
- Modify: `src/screens/admin/admin.css`
- Modify: `src/screens/admin/dashboard.test.ts`

**Interfaces:**
- Consumes: Task 1의 공통 토큰과 기존 요약·추천·지도 레이어 함수
- Produces: 기존 `[data-filter]`, `[data-layer]`, `[data-metric]`, `[data-candidates]`, `[data-latest]`, 다이얼로그 이벤트 계약을 유지하는 새 대시보드

- [ ] **Step 1: 관리자 계층 실패 테스트 추가**

```ts
it('renders the approved dashboard hierarchy', () => {
  const screen = renderAdminDashboard({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    navigate() {},
  })

  expect(screen.element.querySelector('.app-bar')).not.toBeNull()
  expect(screen.element.querySelector('.dashboard-intro h1')?.textContent)
    .toBe('쓰담쓰담 관리자')
  expect(screen.element.querySelectorAll('.metric-card')).toHaveLength(4)
  expect(screen.element.querySelectorAll('.metric-card--primary')).toHaveLength(1)
  expect(screen.element.querySelector('.filter-toolbar')).not.toBeNull()
  expect(screen.element.querySelector('.map-panel h2')?.textContent).toBe('전국 제보 지도')
})
```

- [ ] **Step 2: 새 관리자 구조 테스트가 기존 마크업에서 실패하는지 확인**

Run: `npm test -- src/screens/admin/dashboard.test.ts`

Expected: FAIL because `.app-bar`, `.dashboard-intro`, `.metric-card`, `.filter-toolbar`, and the map heading do not exist.

- [ ] **Step 3: 관리자 상단·필터·KPI 마크업 재구성**

```html
<header class="app-bar admin-app-bar">
  <a class="brand" href="#/" aria-label="쓰담쓰담 홈"><span class="brand-mark" aria-hidden="true">쓰</span><span>쓰담쓰담</span></a>
  <span class="app-bar-label">관리자 데모</span>
</header>
<main class="admin-dashboard">
  <section class="dashboard-intro">
    <div><p class="eyebrow">전국 환경 데이터</p><h1>쓰담쓰담 관리자</h1><p>주민 제보를 분석해 관리 우선순위와 쓰레기통 설치 후보를 확인합니다.</p></div>
    <button type="button" class="button button--text reset-trigger" data-action="open-reset">데모 데이터 초기화</button>
  </section>
  <section class="filter-toolbar" aria-label="대시보드 필터">
    <div class="select-filters">
      <label>지역 <select data-filter="city" aria-label="지역 선택"></select></label>
      <label>기간 <select data-filter="days" aria-label="기간 선택"><option value="7">최근 7일</option><option value="30" selected>최근 30일</option><option value="90">최근 90일</option></select></label>
    </div>
    <fieldset class="layer-controls"><legend>지도 레이어</legend>
      <label><input type="checkbox" data-layer="reports" checked> 제보</label>
      <label><input type="checkbox" data-layer="heat" checked> 히트맵</label>
      <label><input type="checkbox" data-layer="bins" checked> 기존 쓰레기통</label>
      <label><input type="checkbox" data-layer="candidates" checked> 추천 위치</label>
    </fieldset>
  </section>
  <section class="metric-grid" aria-label="요약 지표">
    <article class="metric-card metric-card--primary"><span>전체 제보</span><strong data-metric="total">0</strong><small>선택 기간 기준</small></article>
    <article class="metric-card"><span>오늘 제보</span><strong data-metric="today">0</strong><small>오늘 접수된 건수</small></article>
    <article class="metric-card"><span>집중 관리 지역</span><strong data-metric="cities">0</strong><small>제보가 있는 시군구</small></article>
    <article class="metric-card"><span>설치 추천 위치</span><strong data-metric="candidates">0</strong><small>상위 3개 후보</small></article>
  </section>
</main>
```

손상 데이터 경고는 intro 아래 전폭 `status-banner--warning`으로 배치한다. 초기화는 낮은 강조 텍스트 버튼을 유지하고, 확인 전에는 저장소를 변경하지 않는다.

- [ ] **Step 4: 지도와 인사이트를 2:1 레이아웃으로 구현**

```html
<section class="admin-content">
  <section class="map-panel" aria-labelledby="admin-map-title">
    <div class="panel-heading">
      <div><p class="eyebrow">실시간 밀집도</p><h2 id="admin-map-title">전국 제보 지도</h2></div>
      <span class="map-helper">마커를 선택하면 상세 근거를 확인할 수 있어요.</span>
    </div>
    <div class="admin-map" data-map aria-label="제보와 추천 위치 지도"></div>
    <div class="map-state-row">
      <p class="map-status" data-map-status aria-live="polite"></p>
      <button type="button" class="button button--tonal tile-retry" data-action="retry-tiles" hidden>지도 다시 불러오기</button>
    </div>
  </section>
  <aside class="insight-panel">
    <section aria-labelledby="candidate-title">
      <div class="section-heading">
        <div><p class="eyebrow">설명 가능한 점수</p><h2 id="candidate-title">추천 위치</h2></div>
        <span class="score-legend">밀집도 70 · 반복 20 · 거리 10</span>
      </div>
      <div class="candidate-list" data-candidates></div>
    </section>
    <section class="latest-report" aria-labelledby="latest-title">
      <h2 id="latest-title">주민 제보 확인</h2>
      <div data-latest></div>
    </section>
  </aside>
</section>
```

`admin.css`는 최대 1480px 컨테이너, 데스크톱 `minmax(0, 2fr) minmax(320px, 1fr)`, 균형형 KPI 밀도를 사용한다. 첫 KPI만 Primary 배경과 흰 글자를 사용하고 나머지는 흰 표면과 Outline 경계를 사용한다. 1199px 이하에서 지도·인사이트를 한 열로, 767px 이하에서 KPI 2열과 필터 한 열로 바꾸며 360px에서도 가로 스크롤이 없어야 한다.

- [ ] **Step 5: 관리자 단위 테스트와 전체 단위 회귀 확인**

Run: `npm test -- src/screens/admin/dashboard.test.ts && npm test`

Expected: all administrator tests and at least 87 total unit tests pass.

- [ ] **Step 6: 관리자 화면 커밋**

```powershell
git add src/screens/admin/dashboard.ts src/screens/admin/admin.css src/screens/admin/dashboard.test.ts
git commit -m "style: redesign administrator dashboard"
```

---

### Task 5: 브라우저 흐름과 시각 회귀

**Files:**
- Create: `tests/e2e/helpers.ts`
- Create: `tests/e2e/visual-regression.spec.ts`
- Create: `tests/e2e/visual-regression.spec.ts-snapshots/*.png`
- Modify: `tests/e2e/ssudam-flow.spec.ts`

**Interfaces:**
- Consumes: Tasks 2–4의 최종 DOM, 기존 해시 라우트, Google 타일 요청
- Produces: `mockGoogleTiles(page)` 도우미와 데스크톱 4장·모바일 3장 기준 스크린샷

- [ ] **Step 1: 타일 모킹 공통 도우미 추출**

```ts
import type { Page } from '@playwright/test'

export const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6WQAAAABJRU5ErkJggg==',
  'base64',
)

export async function mockGoogleTiles(page: Page) {
  await page.route('https://mt.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng })
  })
}
```

`ssudam-flow.spec.ts`는 로컬 상수 대신 이 두 export를 import한다. 기존 10개 E2E의 의미와 타일 실패를 위해 `unroute`하는 흐름은 유지한다. 홈의 첫 문구 검증은 `발견하고, 함께 바꿔요.`와 `주민 제보 시작`으로 갱신한다.

- [ ] **Step 2: 새 전체 흐름 E2E가 현재 카피에서 실패하는지 확인**

Run: `npm run test:e2e -- --grep "resident report appears"`

Expected: FAIL until the new home copy and selectors from Task 2 are present; after Tasks 2–4 it passes.

- [ ] **Step 3: 핵심 화면 시각 회귀 테스트 작성**

```ts
import { expect, test } from '@playwright/test'
import { mockGoogleTiles, transparentPng } from './helpers'

test.beforeEach(async ({ page }) => {
  await mockGoogleTiles(page)
  await page.goto('#/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function expectPageScreenshot(page: import('@playwright/test').Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.01,
  })
}

test('desktop home visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await expectPageScreenshot(page, 'desktop-home.png')
})

test('desktop resident visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('#/resident/report')
  await expectPageScreenshot(page, 'desktop-resident.png')
})

test('desktop completion visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: /주민 제보 시작/ }).click()
  await page.getByLabel('시 선택').selectOption('11')
  await page.getByRole('button', { name: '선택한 시 중심 사용' }).click()
  await page.getByLabel('쓰레기 사진').setInputFiles({
    name: 'waste.png',
    mimeType: 'image/png',
    buffer: transparentPng,
  })
  await page.getByRole('button', { name: '제보하기' }).click()
  await expectPageScreenshot(page, 'desktop-complete.png')
})

test('desktop admin visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('#/admin')
  await expectPageScreenshot(page, 'desktop-admin.png')
})

for (const screen of [
  { name: 'mobile-home.png', path: '#/' },
  { name: 'mobile-resident.png', path: '#/resident/report' },
  { name: 'mobile-admin.png', path: '#/admin' },
]) {
  test(screen.name, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(screen.path)
    await expectPageScreenshot(page, screen.name)
  })
}
```

- [ ] **Step 4: 기준 스크린샷 생성 후 눈으로 검토**

Run: `npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots`

Expected: 7 tests pass and seven PNG baselines are created. Inspect every image for clipped Korean copy, accidental nested giant cards, inconsistent corner radii, weak CTA hierarchy, map/control overlap, and horizontal overflow. If an issue is visible, fix the owning screen CSS and regenerate only the affected baseline.

- [ ] **Step 5: 전체 E2E와 시각 회귀 재실행**

Run: `npm run test:e2e`

Expected: all original 10 flows plus 7 visual regression tests pass with no unexpected console errors.

- [ ] **Step 6: 브라우저 회귀 커밋**

```powershell
git add tests/e2e
git commit -m "test: add Material You visual regression coverage"
```

---

### Task 6: 최종 검증과 main 푸시

**Files:**
- Verify only: all modified files

**Interfaces:**
- Consumes: Tasks 1–5의 커밋
- Produces: 검증된 `main`과 갱신된 `origin/main`

- [ ] **Step 1: 전체 단위 테스트를 깨끗한 상태에서 실행**

Run: `npm test`

Expected: at least 87 tests pass, 0 fail.

- [ ] **Step 2: 전체 브라우저 테스트 실행**

Run: `npm run test:e2e`

Expected: at least 17 tests pass, 0 fail, including 360/768/1440 overflow and 7 screenshots.

- [ ] **Step 3: 프로덕션 빌드 실행**

Run: `npm run build`

Expected: TypeScript and Vite build succeed with exit code 0.

- [ ] **Step 4: 커밋과 작업 트리 확인**

```powershell
git status --short
git log --oneline -6
```

Expected: `git status --short` prints nothing and the design-system, home, resident, admin, and visual-regression commits are present above `3bd196f`.

- [ ] **Step 5: main을 origin으로 푸시**

Run: `git push origin main`

Expected: Git reports `main -> main` and `origin/main` resolves to the same commit as local `main`.
