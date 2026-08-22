export interface MythicAddons {
  crucible: boolean
  mythicrpg: boolean
}

export const DEFAULT_MYTHIC_ADDONS: MythicAddons = {
  crucible: false,
  mythicrpg: false,
}

const STORAGE_KEY = 'soaps-mythic-addons'

export function parseMythicAddons(value: unknown): MythicAddons {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MYTHIC_ADDONS }
  const raw = value as Record<string, unknown>
  return {
    crucible: Boolean(raw.crucible),
    mythicrpg: Boolean(raw.mythicrpg),
  }
}

export function loadMythicAddons(): MythicAddons {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_MYTHIC_ADDONS }
    return parseMythicAddons(JSON.parse(stored))
  } catch {
    return { ...DEFAULT_MYTHIC_ADDONS }
  }
}

export function saveMythicAddons(addons: MythicAddons): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addons))
}
