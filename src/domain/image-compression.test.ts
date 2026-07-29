import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateContainSize, compressImage } from './image-compression'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('calculateContainSize', () => {
  it.each([
    [4000, 3000, { width: 1280, height: 960 }],
    [1000, 2000, { width: 640, height: 1280 }],
    [800, 600, { width: 800, height: 600 }],
    [1, 3000, { width: 1, height: 1280 }],
  ])('fits %sx%s inside 1280px', (width, height, expected) => {
    expect(calculateContainSize(width, height, 1280)).toEqual(expected)
  })
})

it('cleans up a successful image fallback when ImageBitmap is unavailable', async () => {
  const drawImage = vi.fn()
  const file = new File([new Uint8Array([1])], 'waste.png', { type: 'image/png' })
  const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fallback')
  const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue('data:image/webp;base64,FALLBACK')
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bitmap unavailable')))
  vi.stubGlobal('ImageBitmap', undefined)
  vi.stubGlobal('Image', class {
    width = 1
    height = 1
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  })

  await expect(compressImage(file)).resolves.toBe('data:image/webp;base64,FALLBACK')
  expect(createObjectUrl).toHaveBeenCalledWith(file)
  expect(revokeObjectUrl).toHaveBeenCalledWith('blob:fallback')
  expect(drawImage).toHaveBeenCalledOnce()
})
