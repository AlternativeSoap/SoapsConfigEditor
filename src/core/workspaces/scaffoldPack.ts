import type { FileRecord, WorkspaceKind } from '../../types'
import type { MythicAddons } from './mythicAddons'
import { DEFAULT_MYTHIC_ADDONS } from './mythicAddons'

export interface ScaffoldOptions {
  packName: string
  mythicAddons?: MythicAddons
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

/**
 * Starter trees match a real server `plugins/` layout:
 *   plugins/MythicMobs/Packs/{Pack}/…
 *   plugins/MMOCore/… , plugins/MythicLib/… , plugins/MythicMobs/…
 *   plugins/MMOItems/item/…
 *   plugins/SoapsQuest/… , plugins/SoapsTraits/…
 *
 * Open (or save into) the `plugins` folder so these paths land correctly.
 */
export function scaffoldPack(kind: WorkspaceKind, options: ScaffoldOptions): FileRecord[] {
  const packName = sanitizePackName(options.packName)
  const addons = options.mythicAddons ?? DEFAULT_MYTHIC_ADDONS

  if (kind === 'mythicmobs') {
    // Matches plugins/MythicMobs/Packs/{PackName}/ (open plugins/ as the workspace root)
    const base = `MythicMobs/Packs/${packName}`
    const files: FileRecord[] = [
      file(
        `${base}/packinfo.yml`,
        `# MythicMobs pack: ${packName}\n# Server path: plugins/MythicMobs/Packs/${packName}/\nPack:\n  Name: ${packName}\n  Version: 1.0\n`,
        packName,
        'other',
      ),
      file(`${base}/Mobs/mobs.yml`, `# Mobs for ${packName}\n`, packName, 'mobs'),
      file(`${base}/Items/items.yml`, `# Items for ${packName}\n`, packName, 'items'),
      file(`${base}/Skills/skills.yml`, `# Skills for ${packName}\n`, packName, 'skills'),
      file(
        `${base}/DropTables/droptables.yml`,
        `# Drop tables for ${packName}\n`,
        packName,
        'droptables',
      ),
      file(
        `${base}/randomspawns/randomspawns.yml`,
        `# Random spawns for ${packName}\n`,
        packName,
        'randomspawns',
      ),
    ]
    if (addons.mythicrpg) {
      files.push(
        file(
          `${base}/Archetypes/classes.yml`,
          `# MythicRPG archetypes (classes / professions) for ${packName}.\n# Use New → New archetype to add one.\n`,
          packName,
          'archetypes',
        ),
        file(
          `${base}/reagents.yml`,
          `# MythicRPG reagents for ${packName}.\n# Use New → New reagent to add one.\n`,
          packName,
          'reagents',
        ),
      )
    }
    return files
  }

  if (kind === 'mmocore') {
    // Sibling plugin folders under plugins/
    return [
      file(
        'MMOCore/classes/.keep.yml',
        `# MMOCore class configs (plugins/MMOCore/classes/).\n# One YAML per class (e.g. storm.yml). Use New → Class to create a class.\n# MMOCore has no Packs/ system.\n`,
        'MMOCore',
        'classes',
      ),
      file('MMOCore/exp-curves/levels.txt', defaultExpCurveContent(), 'MMOCore', 'exp-curves'),
      file(
        'MythicLib/skill/attack_skills.yml',
        `# MythicLib skill registrations (plugins/MythicLib/skill/).\n# Register regular-attack and critical-strike skills here.\n# Point MythicLib/elements.yml at these ids.\n`,
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
        `# MythicMobs Packs only (plugins/MythicMobs/Packs/${packName}/).\n# MMOCore and MythicLib files above are separate plugin folders, not packs.\nPack:\n  Name: ${packName}\n  Version: 1.0\n`,
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
    // Matches plugins/MMOItems/item/ (open plugins/ as the workspace root)
    return [
      file(
        'MMOItems/item/material.yml',
        `# MMOItems item type file (plugins/MMOItems/item/material.yml).\n# Add item templates below. Other types use the same item/ folder (sword.yml, armor.yml, …).\n`,
        'MMOItems',
        'other',
      ),
    ]
  }

  if (kind === 'soapsquest') {
    // Matches plugins/SoapsQuest/ when that folder is the open root
    return [
      file(
        'quests.yml',
        `# SoapsQuest quests (plugins/SoapsQuest/quests.yml).\n# Use New → New quest to add one. After editing, run /sq reload on the server.\n# SoapsQuest has no Packs/ system.\n\nquests:\n  starter_quest:\n    display: "<#55FF55>Starter Quest"\n    material: PAPER\n    tier: common\n    difficulty: easy\n    sequential: false\n    lock-to-player: false\n    objectives:\n      - type: kill\n        target: ZOMBIE\n        amount: 10\n    reward:\n      xp: 100\n      money: 50\n\ncitizens-npcs: {}\n`,
        'SoapsQuest',
        'quests',
      ),
      file(
        'tiers.yml',
        `# SoapsQuest tiers (plugins/SoapsQuest/tiers.yml).\n# Order in this file is the GUI display order.\n\ntiers:\n  common:\n    display: "&fCommon"\n    prefix: "&7[COMMON]"\n    color: "&f"\n    weight: 40\n    description: "&7A standard quest available to all players."\n\n  uncommon:\n    display: "&2Uncommon"\n    prefix: "&2[UNCOMMON]"\n    color: "&2"\n    weight: 32\n    description: "&2Slightly rarer quests with modest rewards."\n\n  rare:\n    display: "&9Rare"\n    prefix: "&9[RARE]"\n    color: "&9"\n    weight: 25\n    description: "&9Quests worth seeking out for better loot."\n\n  epic:\n    display: "&5Epic"\n    prefix: "&5[EPIC]"\n    color: "&5"\n    weight: 18\n    description: "&5Challenging quests with substantial rewards."\n\n  legendary:\n    display: "&6Legendary"\n    prefix: "&6[LEGENDARY]"\n    color: "&6"\n    weight: 12\n    description: "&6Prestigious quests for dedicated adventurers."\n\n  mythic:\n    display: "&d&lMythic"\n    prefix: "&d&l[MYTHIC]"\n    color: "&d"\n    weight: 8\n    description: "&d&lThe rarest of quests."\n`,
        'SoapsQuest',
        'other',
      ),
      file(
        'difficulties.yml',
        `# SoapsQuest difficulties (plugins/SoapsQuest/difficulties.yml).\n# Order in this file is the GUI display order.\n\ndifficulties:\n  easy:\n    display: "&aEasy"\n    color: "&a"\n    weight: 50\n    description: "&aGreat for beginners."\n    multiplier:\n      objective-amount: 0.75\n      reward: 0.75\n\n  normal:\n    display: "&eNormal"\n    color: "&e"\n    weight: 35\n    description: "&eBalanced objectives and rewards."\n    multiplier:\n      objective-amount: 1.0\n      reward: 1.0\n\n  hard:\n    display: "&cHard"\n    color: "&c"\n    weight: 20\n    description: "&cMore demanding objectives with better rewards."\n    multiplier:\n      objective-amount: 1.5\n      reward: 1.5\n\n  expert:\n    display: "&6Expert"\n    color: "&6"\n    weight: 10\n    description: "&6Double the challenge, double the spoils."\n    multiplier:\n      objective-amount: 2.0\n      reward: 2.0\n\n  nightmare:\n    display: "&4&lNightmare"\n    color: "&4"\n    weight: 5\n    description: "&4&lExtreme objectives and rewards."\n    multiplier:\n      objective-amount: 2.5\n      reward: 2.5\n`,
        'SoapsQuest',
        'other',
      ),
    ]
  }

  // soapstraits — matches plugins/SoapsTraits/traits.yml
  return [
    file(
      'traits.yml',
      `# SoapsTraits traits (plugins/SoapsTraits/traits.yml).\n# Add trait configs below.\n`,
      'SoapsTraits',
      'other',
    ),
  ]
}

export function sanitizePackFolderName(name: string): string {
  return sanitizePackName(name)
}
