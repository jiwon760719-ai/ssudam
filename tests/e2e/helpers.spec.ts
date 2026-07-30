import { inflateSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { transparentPng } from './helpers'

test('transparent image fixture is a checksum-valid 1x1 PNG', () => {
  expect(transparentPng.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  )

  const idatChunks: Buffer[] = []
  let offset = 8
  while (offset < transparentPng.length) {
    const length = transparentPng.readUInt32BE(offset)
    const type = transparentPng.toString('ascii', offset + 4, offset + 8)
    const data = transparentPng.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      expect(data.readUInt32BE(0)).toBe(1)
      expect(data.readUInt32BE(4)).toBe(1)
    }
    if (type === 'IDAT') idatChunks.push(data)
    offset += length + 12
  }

  expect(() => inflateSync(Buffer.concat(idatChunks))).not.toThrow()
})
