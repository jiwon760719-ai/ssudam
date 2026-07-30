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
  const element = document.createElement('main')
  element.className = 'complete-screen'
  element.innerHTML = `
    <section aria-labelledby="complete-title">
      <div class="success-check" aria-hidden="true">✓</div>
      <h1 id="complete-title">제보 완료</h1>
      <p>소중한 제보가 접수되었습니다.</p>
      <dl><dt>제보 번호</dt><dd data-report-id></dd></dl>
      <div class="admin-sync" role="status">
        <strong>관리자 지도에 반영됨</strong>
        <span>히트맵과 쓰레기통 추천 위치가 새 데이터로 갱신됩니다.</span>
      </div>
      <p class="storage-warning" data-session-only hidden>
        저장되지 않아 현재 브라우저 세션에서만 유지됩니다. 새로고침하면 사라질 수 있습니다.
      </p>
      <button data-action="home" type="button">홈으로 돌아가기</button>
      <button data-action="another" type="button">다른 제보하기</button>
    </section>
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
