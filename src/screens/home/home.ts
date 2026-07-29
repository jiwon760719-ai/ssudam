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
