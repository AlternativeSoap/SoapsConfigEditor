import { strToU8, zipSync } from 'fflate'

export function buildPackZip(files: { path: string; content: string }[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    const key = file.path.replace(/\\/g, '/')
    entries[key] = strToU8(file.content)
  }
  return zipSync(entries, { level: 6 })
}

export function packZipFilename(baseName: string): string {
  const safe = baseName
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 48) || 'pack'
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .slice(0, 19)
  return `${safe}_${timestamp}.zip`
}

export function downloadBlob(filename: string, data: Uint8Array, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
