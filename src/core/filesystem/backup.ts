import { strToU8, zipSync } from 'fflate'
import type { FileRecord } from '../../types'
import { writeBackupZip } from './browserFs'

export async function backupPack(files: FileRecord[]): Promise<string> {
  const entries: Record<string, Uint8Array> = {}
  for (const f of files) {
    // Use forward slashes and normalise path
    const key = f.path.replace(/\\/g, '/')
    entries[key] = strToU8(f.content)
  }
  const zipped = zipSync(entries, { level: 6 })
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .slice(0, 19)
  const filename = `backup_${timestamp}.zip`
  await writeBackupZip(filename, zipped)
  return filename
}
