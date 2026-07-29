import { expect, it, vi } from 'vitest'
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

  expect(repository.getReport('SSUDAM-TEST-1')).toMatchObject({
    cityCode: '11',
    latitude: 37.5665,
    longitude: 126.978,
  })
  expect(navigate).toHaveBeenCalledWith({
    name: 'resident-complete',
    reportId: 'SSUDAM-TEST-1',
  })
})
