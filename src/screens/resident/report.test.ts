import { expect, it, vi } from 'vitest'
import { createApp } from '../../app/app'
import { createRepositoryFake, createMapFactoryFake } from '../../test/fakes'
import { renderResidentReport } from './report'

it('stores a map-selected report and navigates to 제보 완료', async () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const map = createMapFactoryFake()
  const navigate = vi.fn()
  const screen = renderResidentReport({
    repository,
    mapFactory: map.factory,
    imageCompressor: vi.fn().mockResolvedValue('data:image/webp;base64,AAAA'),
    geolocation: undefined,
    navigate,
  })
  document.body.append(screen.element)
  screen.mount?.()

  const city = screen.element.querySelector<HTMLSelectElement>('[name="cityCode"]')!
  city.value = '11'
  city.dispatchEvent(new Event('change', { bubbles: true }))
  map.click(37.5665, 126.978)

  const file = new File(['image'], 'waste.png', { type: 'image/png' })
  const input = screen.element.querySelector<HTMLInputElement>('[name="photo"]')!
  Object.defineProperty(input, 'files', { value: [file] })
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await Promise.resolve()
  await Promise.resolve()

  screen.element.querySelector<HTMLFormElement>('form')!
    .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  screen.element.querySelector<HTMLFormElement>('form')!
    .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))

  expect(repository.getReport('SSUDAM-TEST-1')).toMatchObject({
    cityCode: '11',
    latitude: 37.5665,
    longitude: 126.978,
  })
  expect(navigate).toHaveBeenCalledWith({
    name: 'resident-complete',
    reportId: 'SSUDAM-TEST-1',
  })
  expect(repository.getState().reports).toHaveLength(1)
})

it('mounts the map only after the screen is connected to the app root', () => {
  const root = document.createElement('div')
  document.body.append(root)
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const map = createMapFactoryFake()
  const mapFactory = vi.fn((container, options) => {
    expect(container.isConnected).toBe(true)
    return map.factory(container, options)
  })
  const app = createApp(root, () => renderResidentReport({
    repository,
    mapFactory,
    imageCompressor: vi.fn(),
    navigate() {},
  }))

  app.start()

  expect(mapFactory).toHaveBeenCalledTimes(1)
  app.destroy()
})

it('keeps the newest compressed image when an earlier selection finishes late', async () => {
  let resolveFirst: ((value: string) => void) | undefined
  let resolveSecond: ((value: string) => void) | undefined
  const first = new Promise<string>((resolve) => { resolveFirst = resolve })
  const second = new Promise<string>((resolve) => { resolveSecond = resolve })
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn((file: File) => file.name === 'first.png' ? first : second),
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()
  const input = screen.element.querySelector<HTMLInputElement>('[name="photo"]')!

  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['first'], 'first.png', { type: 'image/png' })] })
  input.dispatchEvent(new Event('change', { bubbles: true }))
  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['second'], 'second.png', { type: 'image/png' })] })
  input.dispatchEvent(new Event('change', { bubbles: true }))

  resolveSecond?.('data:image/webp;base64,SECOND')
  await Promise.resolve()
  resolveFirst?.('data:image/webp;base64,FIRST')
  await Promise.resolve()

  expect(screen.element.querySelector<HTMLImageElement>('[data-preview]')?.getAttribute('src'))
    .toBe('data:image/webp;base64,SECOND')
})
