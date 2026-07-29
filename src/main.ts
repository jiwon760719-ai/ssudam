import './style.css'
import { createApp, type ScreenFactory } from './app/app'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('App root is missing')
}

const createScreen: ScreenFactory = (route) => {
  const element = document.createElement('main')
  element.textContent = route.name

  return {
    element,
    destroy() {},
  }
}

createApp(root, createScreen).start()
