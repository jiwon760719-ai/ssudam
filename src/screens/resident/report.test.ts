import { expect, it, vi } from 'vitest'
import { createApp } from '../../app/app'
import { createRepositoryFake, createMapFactoryFake } from '../../test/fakes'
import { renderResidentReport } from './report'

it('renders the approved resident form hierarchy', () => {
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })

  expect(screen.element.querySelector('.app-bar')).not.toBeNull()
  expect(screen.element.querySelector('.flow-progress')).not.toBeNull()
  expect(screen.element.querySelectorAll('.form-section')).toHaveLength(3)
  expect(screen.element.querySelector('.resident-map-surface [data-map]')).not.toBeNull()
  expect(screen.element.querySelector('.submit-button')?.textContent).toContain('제보하기')
})

it('links the resident app-bar brand to home', () => {
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })

  expect(screen.element.querySelector(
    '.app-bar .brand[href="#/"][aria-label="쓰담쓰담 홈"]',
  )).not.toBeNull()
})

it('shows readable Korean errors for every missing required field', () => {
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })
  document.body.append(screen.element)

  screen.element.querySelector<HTMLFormElement>('form')!
    .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))

  expect(screen.element.querySelector('[data-error="cityCode"]')?.textContent)
    .toBe('시를 선택해주세요.')
  expect(screen.element.querySelector('[data-error="location"]')?.textContent)
    .toBe('지도에서 제보 위치를 선택해주세요.')
  expect(screen.element.querySelector('[data-error="photoDataUrl"]')?.textContent)
    .toBe('쓰레기 사진을 추가해주세요.')
})

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
    .toContain('지도에서 직접 선택해주세요.')
  map.click(37.5665, 126.978)

  expect(screen.element.querySelector('[data-location]')?.textContent)
    .toContain('선택 위치: 37.56650, 126.97800')
  expect(screen.element.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(false)
})

it('recompresses once at lower quality and retries the same report after quota', async () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  vi.spyOn(repository, 'getLastWarning').mockReturnValue('storage-quota')
  const retry = vi.spyOn(repository, 'retryReportPersistence').mockReturnValue(true)
  const imageCompressor = vi.fn()
    .mockResolvedValueOnce('data:image/webp;base64,NORMAL')
    .mockResolvedValueOnce('data:image/webp;base64,LOWER')
  const navigate = vi.fn()
  const map = createMapFactoryFake()
  const screen = renderResidentReport({
    repository,
    mapFactory: map.factory,
    imageCompressor,
    navigate,
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
  await Promise.resolve()
  await Promise.resolve()

  expect(imageCompressor).toHaveBeenNthCalledWith(2, input.files?.[0], { quality: 0.45 })
  expect(retry).toHaveBeenCalledWith('SSUDAM-TEST-1', 'data:image/webp;base64,LOWER')
  expect(repository.getState().reports).toHaveLength(1)
  expect(navigate).toHaveBeenCalledOnce()
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

it('offers a clear reset action when stored data was corrupt', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  vi.spyOn(repository, 'getLastWarning').mockReturnValue('corrupt-data')
  const reset = vi.spyOn(repository, 'reset')
  const screen = renderResidentReport({
    repository,
    mapFactory: createMapFactoryFake().factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })
  document.body.append(screen.element)

  expect(screen.element.textContent)
    .toContain('저장된 데이터가 손상되어 안전한 초기 샘플로 복구했습니다.')
  const recovery = screen.element.querySelector<HTMLButtonElement>('[data-action="reset-corrupt"]')
  expect(recovery?.textContent).toBe('손상된 데이터 초기화')
  recovery?.click()

  expect(reset).toHaveBeenCalledOnce()
  expect(screen.element.querySelector<HTMLElement>('[data-corrupt-warning]')?.hidden).toBe(true)
})

it('selects the chosen city center with a keyboard-operable button', () => {
  const map = createMapFactoryFake()
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: map.factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()
  const city = screen.element.querySelector<HTMLSelectElement>('[name="cityCode"]')!
  city.value = '11'
  city.dispatchEvent(new Event('change'))

  screen.element.querySelector<HTMLButtonElement>('[data-action="use-city-center"]')?.click()

  expect(screen.element.querySelector('[data-location]')?.textContent)
    .toBe('선택 위치: 37.56650, 126.97800')
})

it('keeps selected coordinates while retrying resident map tiles', () => {
  const map = createMapFactoryFake()
  const screen = renderResidentReport({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: map.factory,
    imageCompressor: vi.fn(),
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()
  map.click(37.5665, 126.978)

  map.tileError('지도를 불러오지 못했습니다.')

  expect(screen.element.querySelector('[data-location]')?.textContent)
    .toBe('선택 위치: 37.56650, 126.97800')
  expect(screen.element.querySelector('[data-map-status]')?.textContent)
    .toBe('지도를 불러오지 못했습니다.')
  const retry = screen.element.querySelector<HTMLButtonElement>('[data-action="retry-tiles"]')
  expect(retry?.hidden).toBe(false)
  retry?.click()
  expect(map.retryTileCalls()).toBe(1)

  map.tileReady()
  expect(screen.element.querySelector('[data-map-status]')?.textContent).toBe('')
  expect(retry?.hidden).toBe(true)
  expect(screen.element.querySelector('[data-location]')?.textContent)
    .toBe('선택 위치: 37.56650, 126.97800')
})
