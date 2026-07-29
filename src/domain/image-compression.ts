export type ImageSize = { width: number; height: number }

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
  const bitmap = await createImageBitmap(file)

  try {
    const size = calculateContainSize(bitmap.width, bitmap.height, options.maxDimension ?? 1280)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas-unavailable')
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    return canvas.toDataURL('image/webp', options.quality ?? 0.72)
  } finally {
    bitmap.close()
  }
}
