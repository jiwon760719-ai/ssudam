import type { AppRoute } from '../../app/router'
import type { ReportRepository } from '../../domain/models'
import './resident.css'

type CompleteDependencies = {
  repository: ReportRepository
  reportId: string
  navigate(route: AppRoute): void
}

export function renderResidentComplete(dependencies: CompleteDependencies) {
  const report = dependencies.repository.getReport(dependencies.reportId)
  if (!report) {
    dependencies.navigate({ name: 'home' })
    return { element: document.createElement('main'), destroy() {} }
  }
  const element = document.createElement('div')
  element.className = 'complete-page'
  element.innerHTML = `
    <header class="app-bar resident-app-bar">
      <a class="brand" href="#/" aria-label="쓰담쓰담 홈">
        <span class="brand-mark" aria-hidden="true">쓰</span>
        <span>쓰담쓰담</span>
      </a>
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
  `
  element.querySelector<HTMLElement>('[data-report-id]')!.textContent = report.id
  element.querySelector<HTMLElement>('[data-session-only]')!.hidden =
    dependencies.repository.isReportPersisted(report.id)
  element.querySelector('[data-action="home"]')
    ?.addEventListener('click', () => dependencies.navigate({ name: 'home' }))
  element.querySelector('[data-action="another"]')
    ?.addEventListener('click', () => dependencies.navigate({ name: 'resident-report' }))
  return { element, destroy() {} }
}
