import type { WorkspaceKind } from '../../types'

export type { WorkspaceKind }

export interface WorkspaceProfile {
  id: WorkspaceKind
  name: string
  summary: string
  hint: string
  tools: string[]
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
    hint: 'Open an existing MythicMobs Packs folder (or a root with Mobs/Skills), or start a new pack.',
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
    startDialogTitle: 'Start new Class Pack workspace',
    nameFieldLabel: 'MythicMobs pack name',
    confirmLabel: 'Create workspace',
  },
  {
    id: 'mmoitems',
    name: 'MMOItems',
    summary: 'Item types, templates, and item configs.',
    hint: 'Open your MMOItems plugin folder, or start starter files. MMOItems does not use a MythicMobs-style Packs system.',
    tools: ['Start starter files'],
    startLabel: 'Start starter files',
    startDialogTitle: 'Start MMOItems starter',
    nameFieldLabel: 'Project name',
    confirmLabel: 'Create files',
  },
  {
    id: 'mythicrpg',
    name: 'MythicRPG',
    summary: 'RPG configs, classes, and related YAML.',
    hint: 'Open your MythicRPG plugin folder, or start starter files.',
    tools: ['Start starter files'],
    startLabel: 'Start starter files',
    startDialogTitle: 'Start MythicRPG starter',
    nameFieldLabel: 'Project name',
    confirmLabel: 'Create files',
  },
]

export function getWorkspace(id: WorkspaceKind | null): WorkspaceProfile | null {
  if (!id) return null
  return WORKSPACES.find((workspace) => workspace.id === id) ?? null
}

export function parseWorkspaceKind(value: string | null): WorkspaceKind | null {
  if (value === 'mythicmobs' || value === 'mmocore' || value === 'mmoitems' || value === 'mythicrpg') {
    return value
  }
  return null
}
