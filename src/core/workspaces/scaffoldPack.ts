import type { FileRecord, WorkspaceKind } from '../../types'

export interface ScaffoldOptions {
  packName: string
}

function sanitizePackName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
  return cleaned || 'NewPack'
}

function file(
  path: string,
  content: string,
  pack: string,
  category: FileRecord['category'],
): FileRecord {
  const name = path.split('/').pop() ?? path
  return { path, name, pack, category, content, ids: [] }
}

/** Default MMOCore exp curve (50 levels), linear steps. */
export function defaultExpCurveContent(maxLevel = 50): string {
  const lines: string[] = []
  for (let i = 1; i <= maxLevel; i += 1) {
    lines.push(String(i * 200))
  }
  return `${lines.join('\n')}\n`
}

export function scaffoldPack(kind: WorkspaceKind, options: ScaffoldOptions): FileRecord[] {
  const packName = sanitizePackName(options.packName)

  if (kind === 'mythicmobs') {
    const base = `Packs/${packName}`
    return [
      file(
        `${base}/packinfo.yml`,
        `# MythicMobs pack: ${packName}\nPack:\n  Name: ${packName}\n  Version: 1.0\n`,
        packName,
        'other',
      ),
      file(`${base}/mobs/mobs.yml`, `# Mobs for ${packName}\n`, packName, 'mobs'),
      file(`${base}/items/items.yml`, `# Items for ${packName}\n`, packName, 'items'),
      file(`${base}/skills/skills.yml`, `# Skills for ${packName}\n`, packName, 'skills'),
      file(`${base}/droptables/droptables.yml`, `# Drop tables for ${packName}\n`, packName, 'droptables'),
      file(
        `${base}/randomspawns/randomspawns.yml`,
        `# Random spawns for ${packName}\n`,
        packName,
        'randomspawns',
      ),
    ]
  }

  if (kind === 'mmocore') {
    return [
      file(
        'MMOCore/classes/.keep.yml',
        `# MMOCore class configs (plugin folder: plugins/MMOCore/classes/).\n# One YAML per class (e.g. storm.yml). Use New → Class to create a class.\n# MMOCore has no Packs/ system.\n`,
        'MMOCore',
        'classes',
      ),
      file('MMOCore/exp-curves/levels.txt', defaultExpCurveContent(), 'MMOCore', 'exp-curves'),
      file(
        'MythicLib/skill/attack_skills.yml',
        `# MythicLib skill registrations (plugin folder: plugins/MythicLib/skill/).\n# Register regular-attack and critical-strike skills here.\n# Point MythicLib/elements.yml at these ids.\n# MythicLib has no Packs/ system; subfolders under skill/ are fine.\n`,
        'MythicLib',
        'skills',
      ),
      file(
        'MythicLib/elements.yml',
        `# MythicLib elements (plugins/MythicLib/elements.yml).\n# Add rows with New → Edit elements, or edit here.\n# Example:\n# STORM:\n#   name: Storm\n#   icon: LIGHTNING_ROD\n#   lore-icon: '⚡'\n#   color: '&b'\n#   regular-attack:\n#     mythiclib-skill-id: storm_regular_attack\n#   crit-strike:\n#     mythiclib-skill-id: storm_critical_strike\n`,
        'MythicLib',
        'other',
      ),
      file(
        `MythicMobs/Packs/${packName}/packinfo.yml`,
        `# MythicMobs Packs system only (plugins/MythicMobs/Packs/${packName}/).\n# MMOCore and MythicLib files above are separate plugin folders, not packs.\nPack:\n  Name: ${packName}\n  Version: 1.0\n`,
        packName,
        'other',
      ),
      file(
        `MythicMobs/Packs/${packName}/Skills/.keep.yml`,
        `# MythicMobs skill mechanics for this pack.\n# One skills file per class (e.g. Storm.yml).\n# The class wizard writes stubs here.\n`,
        packName,
        'skills',
      ),
    ]
  }

  if (kind === 'mmoitems') {
    return [
      file(
        'item/material.yml',
        `# MMOItems starter\n# Add item templates below.\n`,
        'MMOItems',
        'other',
      ),
    ]
  }

  // mythicrpg
  return [
    file(
      'config/starter.yml',
      `# MythicRPG starter\n# Add configs below.\n`,
      'MythicRPG',
      'other',
    ),
  ]
}

export function sanitizePackFolderName(name: string): string {
  return sanitizePackName(name)
}
