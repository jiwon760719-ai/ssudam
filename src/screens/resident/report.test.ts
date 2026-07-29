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

it('keeps map selection available when geolocation permission is rejected', () => {
  const map = createMapFactoryFake()
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: map.factory,
    imageCompressor: vi.fn(),
    geolocation: {
      getCurrentPosition(_success, failure) {
        failure?.({} as GeolocationPositionError)
      },
    } as Geolocation,
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()

  screen.element.querySelector<HTMLElement>('[data-action="geolocation"]')?.click()
  expect(screen.element.querySelector('[data-location]')?.textContent)
    .toContain('위치 권한을 사용할 수 없습니다. 지도에서 직접 선택해 주세요.')
  map.click(37.5665, 126.978)

  expect(screen.element.querySelector('[data-location]')?.textContent)
    .toContain('선택 위치: 37.56650, 126.97800')
  expect(screen.element.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(false)
})

it('shows a nonblocking warning when a report is only kept in this browser session', async () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  vi.spyOn(repository, 'getLastWarning').mockReturnValue('storage-quota')
  const map = createMapFactoryFake()
  const screen = renderResidentReport({
    repository,
    mapFactory: map.factory,
    imageCompressor: vi.fn().mockResolvedValue('data:image/webp;base64,AAAA'),
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()
  const city = screen.element.querySelector<HTMLSelectElement>('[name="cityCode"]')!
  city.value = '11'
  city.dispatchEvent(new Event('change'))
  map.click(37.5665, 126.978)
  const input = screen.element.querySelector<HTMLInputElement>('[name="photo"]')!
  Object.defineProperty(input, 'files', { value: [new File(['image'], 'waste.png', { type: 'image/png' })] })
  input.dispatchEvent(new Event('change'))
  await Promise.resolve()
  await Promise.resolve()

  screen.element.querySelector<HTMLFormElement>('form')?.dispatchEvent(new SubmitEvent('submit', { cancelable: true }))

  expect(screen.element.textContent)
    .toContain('브라우저 저장 공간이 부족해 현재 화면에서만 제보가 유지됩니다.')
})

it('keeps the report form usable when photo compression fails', async () => {
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn().mockRejectedValue(new Error('decode failed')),
    navigate() {},
  })
  document.body.append(screen.element)
  const input = screen.element.querySelector<HTMLInputElement>('[name="photo"]')!
  Object.defineProperty(input, 'files', { value: [new File(['image'], 'bad.png', { type: 'image/png' })] })
  input.dispatchEvent(new Event('change'))
  await Promise.resolve()
  await Promise.resolve()

  expect(screen.element.querySelector('[data-compression]')?.textContent)
    .toBe('사진을 처리하지 못했습니다. 다른 사진을 선택해 주세요.')
  expect(screen.element.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(false)
})
