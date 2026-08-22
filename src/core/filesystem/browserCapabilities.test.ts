import { describe, expect, it } from 'vitest'
import { folderWriteBlockedHelp } from './browserCapabilities'

describe('folderWriteBlockedHelp', () => {
  it('explains Brave flag when picker is missing', () => {
    const help = folderWriteBlockedHelp('brave', false)
    expect(help.detail).toContain('brave://flags/#file-system-access-api')
    expect(help.detail).toContain('read-only')
  })

  it('mentions Firefox limitations', () => {
    const help = folderWriteBlockedHelp('firefox', false)
    expect(help.message).toMatch(/Firefox/)
  })
})
