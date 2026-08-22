/** Detect browser quirks that affect folder pickers and local storage. */

export type BrowserKind = 'brave' | 'firefox' | 'chromium' | 'other'

interface BraveNavigator extends Navigator {
  brave?: { isBrave?: () => Promise<boolean> }
}

export async function detectBrowserKind(): Promise<BrowserKind> {
  if (typeof navigator === 'undefined') return 'other'

  const nav = navigator as BraveNavigator
  if (nav.brave?.isBrave) {
    try {
      if (await nav.brave.isBrave()) return 'brave'
    } catch {
      /* ignore */
    }
  }

  const ua = navigator.userAgent
  if (/Brave/i.test(ua)) return 'brave'
  if (/Firefox/i.test(ua)) return 'firefox'
  if (/Chrome|Chromium|Edg\//i.test(ua)) return 'chromium'
  return 'other'
}

const STORAGE_NOTE =
  'Your edits are still saved in this browser and come back when you reopen the editor, as long as you do not clear site data for this page.'

export function folderWriteBlockedHelp(
  browserKind: BrowserKind,
  pickerAvailable: boolean,
): { message: string; detail: string } {
  if (browserKind === 'brave' && !pickerAvailable) {
    return {
      message: 'Brave blocks folder saving until you enable one setting.',
      detail: `${STORAGE_NOTE} To pick a save folder in Brave, open brave://flags/#file-system-access-api, set File System Access API to Enabled, and relaunch Brave. You can also use Chrome or Edge. Open folder still works read-only without the flag.`,
    }
  }

  if (browserKind === 'firefox' && !pickerAvailable) {
    return {
      message: 'Firefox cannot write new YAML files back to a folder from the browser.',
      detail: `${STORAGE_NOTE} Use Chrome or Edge to choose a save folder. You can open folders read-only in Firefox and download individual files with Save.`,
    }
  }

  if (!pickerAvailable) {
    return {
      message: 'This browser cannot pick a folder for saving new YAML files to disk.',
      detail: `${STORAGE_NOTE} To write files to a folder, use Chrome or Edge on desktop, or enable the File System Access API in Brave (see brave://flags/#file-system-access-api).`,
    }
  }

  return {
    message: 'Could not open the folder picker.',
    detail: `${STORAGE_NOTE} Try again, or use Chrome or Edge if the picker keeps failing.`,
  }
}
