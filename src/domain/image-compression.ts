export type ImageSize = { width: number; height: number }

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file)
  } catch {
    const objectUrl = URL.createObjectURL(file)
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('image-decode-failed'))
      }
      image.src = objectUrl
    })
  }
}

export function calculateContainSize(
  width: number,
  height: number,
  maxDimension = 1280,
): ImageSize {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('invalid-image-type')
  const image = await decodeImage(file)

  try {
    const size = calculateContainSize(image.width, image.height, options.maxDimension ?? 1280)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas-unavailable')
    context.drawImage(image, 0, 0, size.width, size.height)
    return canvas.toDataURL('image/webp', options.quality ?? 0.72)
  } finally {
    if (image instanceof ImageBitmap) image.close()
  }
}
