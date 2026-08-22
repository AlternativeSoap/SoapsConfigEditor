import { parseYaml } from '../yaml/parseYaml'
import { createDefaultClassInput } from './generators'
import type {
  ClassAttributeEntry,
  ClassGeneratorInput,
  ClassSkillBinding,
  ClassSkillSlot,
  SkillBuffEntry,
  SkillModifierValues,
} from '../../types'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  return fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String)
}

function readModifier(raw: unknown): SkillModifierValues {
  const obj = asRecord(raw)
  if (!obj) return { base: 0, perLevel: 0 }
  return {
    base: asNumber(obj.base),
    perLevel: asNumber(obj['per-level'] ?? obj.perLevel),
    min: obj.min !== undefined ? asNumber(obj.min) : undefined,
    max: obj.max !== undefined ? asNumber(obj.max) : undefined,
    decimalFormat: typeof obj['decimal-format'] === 'string' ? obj['decimal-format'] : undefined,
  }
}

function parseBuffLine(line: string): SkillBuffEntry | null {
  const mod = line.match(/modifier="([^"]+)"/i)
  const amount = line.match(/amount=(-?\d+(?:\.\d+)?)/i)
  const type = line.match(/type="(FLAT|RELATIVE)"/i)
  if (!mod || !amount || !type) return null
  return {
    modifier: mod[1],
    amount: Number(amount[1]),
    type: type[1] as 'FLAT' | 'RELATIVE',
  }
}

const RESERVED_SKILL_KEYS = new Set([
  'level',
  'max-level',
  'unlocked-by-default',
  'needs-bound',
  'mana',
  'cooldown',
  'decimal-format',
  'trigger',
  'timer',
])

/**
 * Parse an MMOCore class YAML file into wizard form state.
 * `classId` should be the filename stem (e.g. fire).
 */
export function parseClassYaml(content: string, classId: string): ClassGeneratorInput {
  const base = createDefaultClassInput({ id: classId })
  const parsed = parseYaml(content)
  const root = asRecord(parsed.data)
  if (!root) return base

  const display = asRecord(root.display) ?? {}
  const options = asRecord(root.options) ?? {}
  const mana = asRecord(root.mana) ?? {}
  const manaColor = asRecord(mana.color) ?? {}
  const resource = asRecord(root.resource) ?? {}
  const healthRes = asRecord(resource.health) ?? {}
  const manaRes = asRecord(resource.mana) ?? {}
  const healthVal = asRecord(healthRes.value) ?? {}
  const manaVal = asRecord(manaRes.value) ?? {}
  const cast = asRecord(root.castParticle ?? root['cast-particle']) ?? {}
  const castColor = asRecord(cast.color) ?? {}
  const triggers = asRecord(root.triggers) ?? {}
  const levelUp = asStringList(triggers['level-up'] ?? triggers.levelUp)

  const itemRaw = display.item
  let item = base.item
  let customModelData: number | undefined
  if (typeof itemRaw === 'string') {
    const parts = itemRaw.split(':')
    item = parts[0] || item
    if (parts[1] && !Number.isNaN(Number(parts[1]))) customModelData = Number(parts[1])
  } else if (asRecord(itemRaw)) {
    const ir = asRecord(itemRaw)!
    item = asString(ir.item ?? ir.material, item)
    if (ir['custom-model-data'] !== undefined) customModelData = asNumber(ir['custom-model-data'])
  }

  const attributes: ClassAttributeEntry[] = []
  const attrRoot = asRecord(root.attributes) ?? asRecord(root.stats) ?? {}
  for (const [id, raw] of Object.entries(attrRoot)) {
    const mod = readModifier(raw)
    attributes.push({
      id: id.toUpperCase(),
      base: mod.base,
      perLevel: mod.perLevel,
      min: mod.min,
      max: mod.max,
      showInLore: true,
    })
  }

  const skills: ClassSkillBinding[] = []
  const skillsRoot = asRecord(root.skills) ?? {}
  for (const [id, raw] of Object.entries(skillsRoot)) {
    const s = asRecord(raw)
    if (!s) continue
    const modifiers: Record<string, SkillModifierValues> = {}
    for (const [key, val] of Object.entries(s)) {
      if (RESERVED_SKILL_KEYS.has(key)) continue
      if (val && typeof val === 'object' && !Array.isArray(val) && 'base' in (val as object)) {
        modifiers[key] = readModifier(val)
      }
    }
    const trigger = asString(s.trigger).toUpperCase()
    const hasNeedsBoundKey = Object.prototype.hasOwnProperty.call(s, 'needs-bound')
      || Object.prototype.hasOwnProperty.call(s, 'needsBound')
    skills.push({
      id,
      displayName: id
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' '),
      level: asNumber(s.level, 1),
      maxLevel: asNumber(s['max-level'] ?? s.maxLevel, 1),
      unlockedByDefault: Boolean(s['unlocked-by-default'] ?? s.unlockedByDefault ?? true),
      // Phoenix: omitted needs-bound on passives usually means bind is not required.
      needsBound: hasNeedsBoundKey
        ? Boolean(s['needs-bound'] ?? s.needsBound)
        : !trigger,
      trigger,
      timer: s.timer !== undefined ? asNumber(s.timer) : trigger === 'TIMER' ? 5 : undefined,
      mana: readModifier(s.mana),
      cooldown: readModifier(s.cooldown),
      modifiers,
    })
  }

  const slots: ClassSkillSlot[] = []
  const slotsRoot = asRecord(root['skill-slots'] ?? root.skillSlots) ?? {}
  for (const [key, raw] of Object.entries(slotsRoot)) {
    const s = asRecord(raw)
    if (!s) continue
    const buffs: SkillBuffEntry[] = []
    for (const line of asStringList(s['skill-buffs'] ?? s.skillBuffs)) {
      const buff = parseBuffLine(line)
      if (buff) buffs.push(buff)
    }
    slots.push({
      index: Number(key) || slots.length + 1,
      name: asString(s.name, `Skill Slot ${key}`),
      lore: asStringList(s.lore),
      unlockedByDefault: Boolean(s['unlocked-by-default'] ?? s.unlockedByDefault ?? true),
      canManuallyBind: s['can-manually-bind'] !== false && s.canManuallyBind !== false,
      formula: asString(s.formula),
      hardset: asString(s.hardset),
      buffs,
      autoLoreFromBuffs: buffs.length > 0 && asStringList(s.lore).length === 0,
    })
  }
  slots.sort((a, b) => a.index - b.index)

  const hasSkillPts = levelUp.some((l) => l.includes('skill-points'))
  const hasClassPts = levelUp.some((l) => l.includes('class-points'))
  const hasAttrPts = levelUp.some((l) => l.includes('attribute-points'))

  const attackSkill = skills.find((s) => /_regular_attack$/i.test(s.id))
  const attackSkillPrefix = attackSkill
    ? attackSkill.id.replace(/_regular_attack$/i, '')
    : classId

  return {
    ...base,
    id: classId,
    displayName: asString(display.name, classId),
    lore: asStringList(display.lore),
    attributeLore: asStringList(display['attribute-lore'] ?? display.attributeLore),
    attributeLoreMode: 'custom',
    item,
    customModelData,
    maxLevel: asNumber(root['max-level'] ?? root.maxLevel, base.maxLevel),
    expCurve: asString(root['exp-curve'] ?? root.expCurve, base.expCurve),
    expTable: asString(root['exp-table'] ?? root.expTable, ''),
    skillTrees: asStringList(root['skill-trees'] ?? root.skillTrees),
    createExpCurveIfMissing: false,
    options: {
      default: Boolean(options.default),
      display: options.display !== false,
      needsPermission: Boolean(options['needs-permission'] ?? options.needsPermission),
      offCombatHealthRegen: Boolean(options['off-combat-health-regen']),
      offCombatManaRegen: Boolean(options['off-combat-mana-regen'] ?? options.offCombatManaRegen),
      offCombatStaminaRegen: Boolean(options['off-combat-stamina-regen']),
      offCombatStelliumRegen: Boolean(options['off-combat-stellium-regen']),
    },
    levelUpTriggers: {
      // Only default skill points when there is no level-up block at all.
      skillPoints: hasSkillPts || levelUp.length === 0,
      classPoints: hasClassPts,
      attributePoints: hasAttrPts,
    },
    mainExpSources: asStringList(root['main-exp-sources'] ?? root.mainExpSources),
    resource: {
      health: {
        type: asString(healthRes.type, 'MAX'),
        base: asNumber(healthVal.base, 1),
        perLevel: asNumber(healthVal['per-level'], 0.1),
        max: asNumber(healthVal.max, 100),
        offCombat: Boolean(healthRes['off-combat'] ?? healthRes.offCombat ?? true),
      },
      mana: {
        type: asString(manaRes.type, 'MAX'),
        base: asNumber(manaVal.base, 1),
        perLevel: asNumber(manaVal['per-level'], 0.05),
        max: asNumber(manaVal.max, 100),
        offCombat: Boolean(manaRes['off-combat'] ?? manaRes.offCombat ?? false),
      },
    },
    mana: {
      char: asString(mana.char, base.mana.char),
      icon: asString(mana.icon, base.mana.icon),
      name: asString(mana.name, base.mana.name),
      colorFull: asString(manaColor.full, base.mana.colorFull),
      colorHalf: asString(manaColor.half, base.mana.colorHalf),
      colorEmpty: asString(manaColor.empty, base.mana.colorEmpty),
    },
    castParticle: {
      enabled: Boolean(cast.particle),
      particle: asString(cast.particle, 'REDSTONE'),
      red: asNumber(castColor.red, 100),
      green: asNumber(castColor.green, 180),
      blue: asNumber(castColor.blue, 255),
      size: cast.size !== undefined ? asNumber(cast.size) : undefined,
      material: asString(cast.material) || undefined,
    },
    keyCombos: (() => {
      const rootCombos = asRecord(root['key-combos'] ?? root.keyCombos) ?? {}
      const out: Record<string, string[]> = {}
      for (const [slot, raw] of Object.entries(rootCombos)) {
        out[slot] = asStringList(raw)
      }
      return out
    })(),
    attributes: attributes.length > 0 ? attributes : base.attributes,
    skills,
    slots: slots.length > 0 ? slots : base.slots,
    includeAttackSkills: Boolean(attackSkill),
    attackSkillPrefix,
    syncElementRow: true,
  }
}
