import type { AppRoute } from '../../app/router'
import './home.css'

export function renderHome({ navigate }: { navigate(route: AppRoute): void }) {
  const element = document.createElement('div')
  element.className = 'home-page'
  element.innerHTML = `
    <header class="app-bar home-app-bar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">쓰</span>
        <span>쓰담쓰담</span>
      </div>
      <span class="app-bar-label">시민 참여형 환경 데이터</span>
    </header>
    <main class="home-screen">
      <section class="home-hero" aria-labelledby="home-title">
        <p class="eyebrow">사진 한 장이 만드는 깨끗한 변화</p>
        <h1 id="home-title">발견하고,<br> <span>함께 바꿔요.</span></h1>
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
  `
  element.querySelector('[data-action="resident"]')
    ?.addEventListener('click', () => navigate({ name: 'resident-report' }))
  element.querySelector('[data-action="admin"]')
    ?.addEventListener('click', () => navigate({ name: 'admin' }))
  return { element, destroy() {} }
}
