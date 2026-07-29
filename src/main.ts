import './style.css'
import { createApp, type ScreenFactory } from './app/app'
import { navigate } from './app/router'
import { createReportRepository } from './data/report-repository'
import { compressImage } from './domain/image-compression'
import { createLeafletMap } from './map/leaflet-map'
import { renderHome } from './screens/home/home'
import { renderResidentComplete } from './screens/resident/complete'
import { renderResidentReport } from './screens/resident/report'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('쓰담쓰담 앱의 #app 루트를 찾을 수 없습니다.')
}

const repository = createReportRepository({ storage: window.localStorage })

const createScreen: ScreenFactory = (route) => {
  switch (route.name) {
    case 'home':
      return renderHome({ navigate })
    case 'resident-report':
      return renderResidentReport({
        repository,
        mapFactory: createLeafletMap,
        imageCompressor: compressImage,
        geolocation: navigator.geolocation,
        navigate,
      })
    case 'resident-complete':
      return renderResidentComplete({ repository, reportId: route.reportId, navigate })
    case 'admin': {
      const element = document.createElement('main')
      element.className = 'admin-placeholder'
      element.innerHTML = '<p>관리자 데모 지도를 불러오는 중입니다.</p><a href="#/">처음으로</a>'
      return { element, destroy() {} }
    }
  }
}

const app = createApp(root, createScreen)
app.start()

let disposed = false
window.addEventListener('pagehide', () => {
  if (disposed) return
  disposed = true
  app.destroy()
  repository.destroy()
}, { once: true })
