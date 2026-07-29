import { parseHash, type AppRoute } from './router'

export type ScreenHandle = { element: HTMLElement; destroy(): void }
export type ScreenFactory = (route: AppRoute) => ScreenHandle

export function createApp(root: HTMLElement, createScreen: ScreenFactory) {
  let active: ScreenHandle | undefined
  let destroyed = false

  const render = () => {
    if (destroyed) return
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
      if (destroyed) return
      destroyed = true
      window.removeEventListener('hashchange', render)
      active?.destroy()
      active = undefined
    },
  }
}
