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
