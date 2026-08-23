import { buildPackZip, downloadBlob, packZipFilename } from './packZip'

export function downloadPackZip(
  files: { path: string; content: string }[],
  baseName = 'pack',
): string {
  if (files.length === 0) {
    throw new Error('No files to export.')
  }
  const filename = packZipFilename(baseName)
  const zipped = buildPackZip(files)
  downloadBlob(filename, zipped, 'application/zip')
  return filename
}

export function downloadTextExport(filename: string, content: string): void {
  const safeName = filename.split('/').pop() ?? 'file.yml'
  downloadBlob(safeName, new TextEncoder().encode(content), 'text/plain;charset=utf-8')
}
