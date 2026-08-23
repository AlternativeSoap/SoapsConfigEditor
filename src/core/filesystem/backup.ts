import type { FileRecord } from '../../types'
import { buildPackZip, packZipFilename } from './packZip'
import { writeBackupZip } from './browserFs'

export async function backupPack(files: FileRecord[]): Promise<string> {
  const snapshot = files.map((f) => ({ path: f.path, content: f.content }))
  const zipped = buildPackZip(snapshot)
  const filename = packZipFilename('backup')
  await writeBackupZip(filename, zipped)
  return filename
}
