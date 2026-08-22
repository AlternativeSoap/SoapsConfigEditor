import type { ClassAttributeEntry } from '../../types'
import { DEFAULT_CLASS_ATTRIBUTES } from './attributes'

export interface ClassPreset {
  id: string
  label: string
  description: string
  themeColor: string
  manaName: string
  manaChar: string
  manaIcon: string
  item: string
  attributes: ClassAttributeEntry[]
}

function attrs(
  rows: { id: string; base: number; perLevel: number; max?: number; showInLore?: boolean }[],
): ClassAttributeEntry[] {
  return rows.map((r) => ({
    id: r.id,
    base: r.base,
    perLevel: r.perLevel,
    max: r.max,
    showInLore: r.showInLore !== false,
  }))
}

export const CLASS_PRESETS: ClassPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default all-rounder stats, similar to Elementals starter classes.',
    themeColor: '#7dd3fc',
    manaName: 'Mana',
    manaChar: '♦',
    manaIcon: '&b♦',
    item: 'BLAZE_POWDER',
    attributes: DEFAULT_CLASS_ATTRIBUTES.map((a) => ({
      id: a.id,
      base: a.base,
      perLevel: a.perLevel,
      max: 'max' in a ? a.max : undefined,
      showInLore: a.showInLore,
    })),
  },
  {
    id: 'tank',
    label: 'Tank',
    description: 'Higher health and armor, with lower damage and mobility.',
    themeColor: '#94a3b8',
    manaName: 'Guard',
    manaChar: '▣',
    manaIcon: '&7▣',
    item: 'SHIELD',
    attributes: attrs([
      { id: 'ATTACK_DAMAGE', base: 2.2, perLevel: 0.04, max: 8 },
      { id: 'MAX_HEALTH', base: 32, perLevel: 1.2, max: 120 },
      { id: 'KNOCKBACK_RESISTANCE', base: 0.08, perLevel: 0.01, max: 0.4 },
      { id: 'ARMOR', base: 2, perLevel: 0.12, max: 16 },
      { id: 'ARMOR_TOUGHNESS', base: 1, perLevel: 0.05, max: 8 },
      { id: 'MAX_MANA', base: 14, perLevel: 0.8, max: 40 },
      { id: 'MANA_REGENERATION', base: 0.4, perLevel: 0.3 },
      { id: 'MOVEMENT_SPEED', base: 0.09, perLevel: 0, showInLore: true },
      { id: 'CRITICAL_STRIKE_CHANCE', base: 5, perLevel: 0.2, max: 25 },
      { id: 'CRITICAL_STRIKE_POWER', base: 5, perLevel: 0.3, max: 25 },
      { id: 'SKILL_DAMAGE', base: 0.8, perLevel: 0, showInLore: false },
    ]),
  },
  {
    id: 'mage',
    label: 'Mage',
    description: 'Higher mana and skill damage, with lower health.',
    themeColor: '#a78bfa',
    manaName: 'Arcane',
    manaChar: '✦',
    manaIcon: '&d✦',
    item: 'BLAZE_ROD',
    attributes: attrs([
      { id: 'ATTACK_DAMAGE', base: 1.8, perLevel: 0.03, max: 6 },
      { id: 'MAX_HEALTH', base: 18, perLevel: 0.5, max: 70 },
      { id: 'ARMOR', base: 0.2, perLevel: 0.02, max: 6 },
      { id: 'MAX_MANA', base: 32, perLevel: 2.2, max: 80 },
      { id: 'MANA_REGENERATION', base: 1.2, perLevel: 0.9 },
      { id: 'SKILL_DAMAGE', base: 1.25, perLevel: 0.01, showInLore: true },
      { id: 'SKILL_CRITICAL_STRIKE_CHANCE', base: 12, perLevel: 0.8, max: 40 },
      { id: 'SKILL_CRITICAL_STRIKE_POWER', base: 12, perLevel: 0.9, max: 45 },
      { id: 'CRITICAL_STRIKE_CHANCE', base: 4, perLevel: 0.2, max: 20 },
      { id: 'CRITICAL_STRIKE_POWER', base: 4, perLevel: 0.3, max: 20 },
      { id: 'MAGIC_DAMAGE', base: 10, perLevel: 0.5, max: 40 },
    ]),
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Solid melee and skill damage. A flexible fighter.',
    themeColor: '#fb923c',
    manaName: 'Focus',
    manaChar: '◆',
    manaIcon: '&6◆',
    item: 'IRON_SWORD',
    attributes: attrs([
      { id: 'ATTACK_DAMAGE', base: 3.2, perLevel: 0.09, max: 12 },
      { id: 'MAX_HEALTH', base: 22, perLevel: 0.7, max: 90 },
      { id: 'ARMOR', base: 0.8, perLevel: 0.06, max: 12 },
      { id: 'MAX_MANA', base: 22, perLevel: 1.4, max: 55 },
      { id: 'MANA_REGENERATION', base: 0.7, perLevel: 0.5 },
      { id: 'SKILL_DAMAGE', base: 1.1, perLevel: 0, showInLore: true },
      { id: 'WEAPON_DAMAGE', base: 8, perLevel: 0.4, max: 30 },
      { id: 'CRITICAL_STRIKE_CHANCE', base: 12, perLevel: 0.6, max: 40 },
      { id: 'CRITICAL_STRIKE_POWER', base: 10, perLevel: 0.7, max: 40 },
      { id: 'SKILL_CRITICAL_STRIKE_CHANCE', base: 8, perLevel: 0.5, max: 32 },
      { id: 'SKILL_CRITICAL_STRIKE_POWER', base: 8, perLevel: 0.5, max: 32 },
    ]),
  },
]
