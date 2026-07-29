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
      <dl><dt>제보 번호</dt><dd>${report.id}</dd></dl>
      <div class="admin-sync" role="status">
        <strong>관리자 지도에 반영됨</strong>
        <span>히트맵과 쓰레기통 추천 위치가 새 데이터로 갱신됩니다.</span>
      </div>
      <button data-action="home" type="button">처음으로 돌아가기</button>
      <button data-action="another" type="button">다른 제보하기</button>
    </section>
  `
  element.querySelector('[data-action="home"]')
    ?.addEventListener('click', () => dependencies.navigate({ name: 'home' }))
  element.querySelector('[data-action="another"]')
    ?.addEventListener('click', () => dependencies.navigate({ name: 'resident-report' }))
  return { element, destroy() {} }
}
