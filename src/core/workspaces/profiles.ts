import type { WorkspaceKind } from '../../types'

export type { WorkspaceKind }

export interface WorkspaceProfile {
  id: WorkspaceKind
  name: string
  summary: string
  hint: string
  tools: string[]
  /** Smaller tile for secondary / upcoming plugins */
  compact?: boolean
  /** Primary CTA on the welcome / top bar for scaffolding */
  startLabel: string
  /** Title for the new-scaffold dialog */
  startDialogTitle: string
  /** Name field label in the scaffold dialog */
  nameFieldLabel: string
  /** Confirm button on the scaffold dialog */
  confirmLabel: string
}

export const WORKSPACES: WorkspaceProfile[] = [
  {
    id: 'mythicmobs',
    name: 'MythicMobs',
    summary: 'Packs, mobs, items, skills, and drop tables.',
    hint: 'Open your server plugins/ folder (or MythicMobs/), or start a new pack. New packs write to MythicMobs/Packs/{name}/. Use the add-on switches on the MythicMobs tile if you use MythicRPG or Crucible.',
    tools: ['Mob generator', 'Item generator', 'Start new pack'],
    startLabel: 'Start new pack',
    startDialogTitle: 'Start new pack',
    nameFieldLabel: 'Pack name',
    confirmLabel: 'Create pack',
  },
  {
    id: 'mmocore',
    name: 'MMOCore',
    summary: 'Classes, MythicLib skills, and linked MythicMobs stubs.',
    hint:
      'Open a folder that contains MMOCore/, MythicLib/, and MythicMobs/ side by side (as on a server under plugins/), or start a new workspace. Only MythicMobs uses a Packs/ folder.',
    tools: ['Class creator', 'Skill stub', 'Start new workspace'],
    startLabel: 'Start new workspace',
    startDialogTitle: 'Start new workspace',
    nameFieldLabel: 'MythicMobs pack name',
    confirmLabel: 'Create workspace',
  },
  {
    id: 'mmoitems',
    name: 'MMOItems',
    summary: 'Item types, templates, and item configs.',
    hint: 'Open your MMOItems plugin folder (plugins/MMOItems/), or start starter files under MMOItems/item/. MMOItems does not use a MythicMobs-style Packs system.',
    tools: ['Start starter files'],
    startLabel: 'Start starter files',
    startDialogTitle: 'Start MMOItems starter',
    nameFieldLabel: 'Project name',
    confirmLabel: 'Create files',
  },
  {
    id: 'soapsquest',
    name: 'SoapsQuest',
    summary: 'Quest papers, tiers, and difficulties.',
    hint:
      'Open your SoapsQuest plugin folder (plugins/SoapsQuest/), or start a new workspace. SoapsQuest has no Packs/ system.',
    tools: ['Quest creator', 'Start new workspace'],
    compact: true,
    startLabel: 'Start new workspace',
    startDialogTitle: 'Start new workspace',
    nameFieldLabel: 'Project name',
    confirmLabel: 'Create workspace',
  },
  {
    id: 'soapstraits',
    name: 'SoapsTraits',
    summary: 'Trait configs for SoapsTraits.',
    hint: 'Open your SoapsTraits plugin folder (plugins/SoapsTraits/), or start a traits.yml starter.',
    tools: ['Start starter files'],
    compact: true,
    startLabel: 'Start starter files',
    startDialogTitle: 'Start SoapsTraits starter',
    nameFieldLabel: 'Project name',
    confirmLabel: 'Create files',
  },
]

export function getWorkspace(id: WorkspaceKind | null): WorkspaceProfile | null {
  if (!id) return null
  return WORKSPACES.find((workspace) => workspace.id === id) ?? null
}

/**
 * Parses a stored workspace id. Legacy `mythicrpg` maps to `mythicmobs`
 * (callers should also enable the MythicRPG add-on).
 */
export function parseWorkspaceKind(value: string | null): WorkspaceKind | null {
  if (
    value === 'mythicmobs' ||
    value === 'mmocore' ||
    value === 'mmoitems' ||
    value === 'soapsquest' ||
    value === 'soapstraits'
  ) {
    return value
  }
  if (value === 'mythicrpg') {
    return 'mythicmobs'
  }
  return null
}

/** True when the raw storage value was the old MythicRPG-only tile. */
export function wasLegacyMythicRpgWorkspace(value: string | null): boolean {
  return value === 'mythicrpg'
}

export function mythicToolsLabel(mythicrpg: boolean): string[] {
  const base = ['Mob generator', 'Item generator', 'Start new pack']
  if (!mythicrpg) return base
  return [
    'Mob generator',
    'Item generator',
    'Spell creator',
    'Archetype creator',
    'Reagent starter',
    'Start new pack',
  ]
}
