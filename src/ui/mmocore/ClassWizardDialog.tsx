import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Switch } from '../Switch'
import { ATTRIBUTE_CATALOG, normalizeAttributeId, resolveAttributeMeta } from '../../data/mmocore/attributes'
import { FORMULA_CHIPS, SLOT_BUFF_PRESETS, CLASS_SKILL_TRIGGERS } from '../../data/mmocore/slotBuffs'
import { COMMON_MATERIALS } from '../../data/mmocore/materials'
import { BUKKIT_CHAT_COLORS } from '../../data/mmocore/bukkitColors'
import { CLASS_PRESETS, type ClassPreset } from '../../data/mmocore/presets'
import {
  createDefaultClassInput,
  generateClassYaml,
  generateMythicLibSkillYaml,
  generateMythicMobsSkillShell,
  defaultMythicLibSkillLore,
  runClassPreflight,
  classFilePath,
  ensureExpCurveFile,
  suggestMythicLibSkillPath,
  suggestMythicMobsSkillPath,
} from '../../core/mmocore/generators'
import {
  upsertElementRow,
  generateAttackSkillRegistrations,
} from '../../core/mmocore/elements'
import { mergeLoreForMode } from '../../core/mmocore/loreBuilder'
import { CASTING_KEYBINDS, DAMAGE_TYPE_CHIPS, DEFAULT_ELEMENT_IDS } from '../../data/mmocore/triggers'
import { BUILTIN_SKILL_IDS } from '../../data/mmocore/builtinSkills'
import { parseClassYaml } from '../../core/mmocore/parseClass'
import {
  loadClassWizardDraft,
  saveClassWizardDraft,
  clearClassWizardDraft,
} from '../../core/mmocore/wizardDraft'
import { parseMinecraftText } from '../../core/minecraft/colorText'
import { extractTopLevelIds, parseYaml } from '../../core/yaml/parseYaml'
import type { MMOCorePackIndex } from '../../core/mmocore/indexPack'
import type {
  ClassAttributeEntry,
  ClassGeneratorInput,
  ClassSkillBinding,
  ClassSkillSlot,
  FileRecord,
  SkillModifierValues,
} from '../../types'
import { ColorTextField } from '../ColorTextField'

export interface ClassWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' | 'delete' }[]
}

interface ClassWizardDialogProps {
  files: FileRecord[]
  index: MMOCorePackIndex
  packName: string
  onClose: () => void
  onApply: (output: ClassWizardOutput) => void
}

const STEPS = [
  'Identity',
  'Progression',
  'Resource',
  'Player stats',
  'Skills',
  'Slots',
  'Lore',
  'Output',
] as const

const STEP_HINTS = [
  'Name your class and how it appears in the class menu.',
  'Set how players level up and what they receive on level-up.',
  'Configure the resource bar name and regeneration rates.',
  'Grant MythicLib player stats that scale with class level.',
  'Link existing skills or create stubs for this class.',
  'Configure skill bar slots, restrictions, and slot buffs.',
  'Class menu tooltip. Built automatically from stats and skills.',
  'Review checks, then write the files.',
] as const

const COMMON_MOBS = [
  'ZOMBIE',
  'SKELETON',
  'CREEPER',
  'SPIDER',
  'ENDERMAN',
  'BLAZE',
  'WITCH',
  'WITHER_SKELETON',
  'HUSK',
  'DROWNED',
  'PILLAGER',
  'VINDICATOR',
  'RAVAGER',
  'WARDEN',
  'WITHER',
  'ENDER_DRAGON',
]

function emptyMod(base = 10, perLevel = 0.5): SkillModifierValues {
  return { base, perLevel, max: base * 2 }
}

function pathClassId(path: string): string {
  const name = path.split(/[/\\]/).pop() ?? ''
  return name.replace(/\.ya?ml$/i, '')
}

/** Rough Adventure → legacy & codes so parseMinecraftText can colorize. */
function stripAdventureTags(line: string): string {
  let s = line
  s = s.replace(/<gradient:[^>]+>/gi, (tag) => {
    const hex = tag.match(/#[0-9a-fA-F]{6}/)
    return hex ? `&#${hex[0].slice(1)}` : ''
  })
  s = s.replace(/<\/gradient>/gi, '&r')
  s = s.replace(/<color:(#[0-9a-fA-F]{6})>/gi, (_, hex: string) => `&#${hex.slice(1)}`)
  s = s.replace(/<\/color>/gi, '&r')
  s = s.replace(/<#([0-9a-fA-F]{6})>/gi, '&#$1')
  s = s.replace(/<underlined>/gi, '&n')
  s = s.replace(/<\/underlined>/gi, '')
  s = s.replace(/<bold>/gi, '&l')
  s = s.replace(/<\/bold>/gi, '')
  s = s.replace(/<italic>/gi, '&o')
  s = s.replace(/<\/italic>/gi, '')
  s = s.replace(/<strikethrough>/gi, '&m')
  s = s.replace(/<\/strikethrough>/gi, '')
  s = s.replace(/<\/?[^>]+>/g, '')
  return s
}

function LoreLivePreview({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return (
      <div className="wz-lore-live">
        <span className="preview-empty">(empty)</span>
      </div>
    )
  }
  return (
    <div className="wz-lore-live" aria-label="Colored lore preview">
      {lines.map((line, i) => {
        const spans = parseMinecraftText(stripAdventureTags(line))
        return (
          <div key={i} className="wz-lore-live-line">
            {spans.length === 0 ? (
              <span>{'\u00A0'}</span>
            ) : (
              spans.map((span, j) => (
                <span
                  key={j}
                  style={{
                    color: span.color,
                    fontWeight: span.bold ? 700 : 400,
                    fontStyle: span.italic ? 'italic' : 'normal',
                    textDecoration:
                      [span.underline ? 'underline' : '', span.strike ? 'line-through' : '']
                        .filter(Boolean)
                        .join(' ') || undefined,
                  }}
                >
                  {span.text}
                </span>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

function ToggleRow({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  title: string
  hint?: string
}) {
  return (
    <div className="wz-toggle">
      <span className="wz-toggle-copy">
        <span className="wz-toggle-title">{title}</span>
        {hint ? <span className="wz-toggle-hint">{hint}</span> : null}
      </span>
      <Switch checked={checked} onChange={onChange} aria-label={title} />
    </div>
  )
}

function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={wide ? 'wz-field wz-field-wide' : 'wz-field'}>
      <span className="wz-field-label">
        {label}
        {hint ? <span className="wz-field-hint">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

function ModTriple({
  label,
  value,
  onChange,
  fields,
}: {
  label: string
  value: SkillModifierValues
  onChange: (next: SkillModifierValues) => void
  fields: Array<'base' | 'perLevel' | 'min' | 'max'>
}) {
  const labels: Record<string, string> = {
    base: 'Base',
    perLevel: 'Per level',
    min: 'Min',
    max: 'Max',
  }
  return (
    <div className="wz-mod-row">
      <strong className="wz-mod-label">{label}</strong>
      {fields.map((f) => (
        <label key={f} className="wz-mod-cell">
          <span>{labels[f]}</span>
          <input
            type="number"
            step="any"
            value={value[f] ?? ''}
            placeholder="none"
            onChange={(e) => {
              const raw = e.target.value
              onChange({
                ...value,
                [f]: raw === '' ? undefined : Number(raw),
              })
            }}
          />
        </label>
      ))}
    </div>
  )
}

interface KillmobRow {
  type: string
  min: number
  max: number
  raw?: string
}

function parseKillmob(line: string): KillmobRow {
  const match = line.match(/killmob\{type=([^;]+);amount=(\d+)-(\d+)\}/i)
  if (!match) return { type: '', min: 1, max: 10, raw: line }
  return {
    type: match[1],
    min: Number(match[2]),
    max: Number(match[3]),
  }
}

function formatKillmob(row: KillmobRow): string {
  if (row.raw) return row.raw
  return `killmob{type=${row.type};amount=${row.min}-${row.max}}`
}

function buildOutputFileList(
  input: ClassGeneratorInput,
  index: MMOCorePackIndex,
  packName: string,
  files: FileRecord[],
  editingPath: string | null,
  previewLore: string[],
): ClassWizardOutput['files'] {
  const out: ClassWizardOutput['files'] = []
  const classYaml = generateClassYaml({ ...input, attributeLore: previewLore })
  const sameEdit =
    editingPath != null && pathClassId(editingPath) === input.id
  out.push({
    path: sameEdit ? editingPath! : classFilePath(input.id),
    content: classYaml,
    mode: 'create',
  })

  if (editingPath && !sameEdit) {
    out.push({ path: editingPath, content: '', mode: 'delete' })
  }

  if (input.createExpCurveIfMissing && !index.expCurves.includes(input.expCurve)) {
    const curve = ensureExpCurveFile(input.expCurve)
    out.push({ path: curve.path, content: curve.content, mode: 'create' })
  }

  const newSkills = input.skills.filter((s) => s.isNew)
  if (newSkills.length > 0) {
    const mlPath = suggestMythicLibSkillPath(input.id)
    const existingMl = files.find((f) => f.path === mlPath)
    const existingMlIds = new Set(
      existingMl ? extractTopLevelIds(parseYaml(existingMl.content).data) : [],
    )
    const mlChunks = newSkills
      .filter((s) => !existingMlIds.has(s.id))
      .map((s) =>
        generateMythicLibSkillYaml({
          id: s.id,
          name: s.displayName,
          icon: s.icon ?? 'BOOK',
          iconCustomModelData: s.iconCustomModelData,
          categories: s.categories ?? [input.id.toUpperCase()],
          lore: s.lore ?? defaultMythicLibSkillLore(s.id, input.mana.name, Object.keys(s.modifiers)),
          modifiers: s.modifiers,
          manaName: input.mana.name,
          trigger: s.mythicLibTrigger,
          itemScaling: s.itemScaling,
        }),
      )
    if (mlChunks.length > 0) {
      out.push({
        path: mlPath,
        content: existingMl
          ? `${existingMl.content.trimEnd()}\n\n${mlChunks.join('\n')}`
          : mlChunks.join('\n'),
        mode: existingMl ? 'append' : 'create',
      })
    }

    const mmPath = suggestMythicMobsSkillPath(packName, input.id)
    const existingMm = files.find((f) => f.path === mmPath)
    const existingMmIds = new Set(
      existingMm ? extractTopLevelIds(parseYaml(existingMm.content).data) : [],
    )
    const mmChunks = newSkills
      .filter((s) => !existingMmIds.has(s.id))
      .map((s) =>
        generateMythicMobsSkillShell(s.id, s.modifiers, {
          damageTypes: s.damageTypes,
          damageElement: s.damageElement ?? s.categories?.[0],
        }),
      )
    if (mmChunks.length > 0) {
      out.push({
        path: mmPath,
        content: existingMm
          ? `${existingMm.content.trimEnd()}\n\n${mmChunks.join('\n')}`
          : mmChunks.join('\n'),
        mode: existingMm ? 'append' : 'create',
      })
    }
  }

  if (input.includeAttackSkills && input.syncElementRow) {
    const prefix = (input.attackSkillPrefix || input.id).trim().toLowerCase()
    const elementId = input.id.toUpperCase()
    const elementsPath = 'MythicLib/elements.yml'
    const existingElements = files.find((f) => f.path === elementsPath)
    const nextElements = upsertElementRow(existingElements?.content ?? '', {
      id: elementId,
      name: input.displayName,
      icon: input.item || 'BOOK',
      loreIcon: '⚡',
      color: '&b',
      regularAttackId: `${prefix}_regular_attack`,
      critStrikeId: `${prefix}_critical_strike`,
    })
    out.push({
      path: elementsPath,
      content: nextElements,
      mode: existingElements ? 'create' : 'create',
    })

    const attackPath = 'MythicLib/skill/attack_skills.yml'
    const existingAtk = files.find((f) => f.path === attackPath)
    const atkYaml = generateAttackSkillRegistrations(prefix, elementId)
    const atkIds = [`${prefix}_regular_attack`, `${prefix}_critical_strike`]
    const existingAtkIds = new Set(
      existingAtk ? extractTopLevelIds(parseYaml(existingAtk.content).data) : [],
    )
    if (!atkIds.every((id) => existingAtkIds.has(id))) {
      out.push({
        path: attackPath,
        content: existingAtk
          ? `${existingAtk.content.trimEnd()}\n\n${atkYaml}`
          : atkYaml,
        mode: existingAtk ? 'append' : 'create',
      })
    }
  }

  return out
}

export function ClassWizardDialog({
  files,
  index,
  packName,
  onClose,
  onApply,
}: ClassWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<ClassGeneratorInput>(() => createDefaultClassInput())
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [slotsAdvanced, setSlotsAdvanced] = useState(false)
  const [showAdvancedProgression, setShowAdvancedProgression] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [attrSearch, setAttrSearch] = useState('')
  const [customAttrId, setCustomAttrId] = useState('')
  const [showRawExp, setShowRawExp] = useState(false)
  const [newMobType, setNewMobType] = useState('ZOMBIE')
  const [newSkillOpen, setNewSkillOpen] = useState(false)
  const [modNameDraft, setModNameDraft] = useState<Record<string, string>>({})
  const [draftSkill, setDraftSkill] = useState({
    id: '',
    name: '',
    categories: '',
    icon: 'BOOK',
    damage: 10,
    damagePer: 0.5,
    duration: 0,
    durationPer: 0,
    damageTypes: 'SKILL,MAGIC',
    damageElement: '',
  })

  useEffect(() => {
    const draft = loadClassWizardDraft()
    if (draft && window.confirm('Restore unsaved class wizard draft?')) {
      setStep(draft.step)
      setInput(draft.input)
      setEditingPath(draft.editingPath)
      setSlotsAdvanced(draft.slotsAdvanced)
      setShowAdvancedProgression(draft.showAdvancedProgression)
    }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady) return
    const timer = window.setTimeout(() => {
      saveClassWizardDraft({
        savedAt: Date.now(),
        step,
        input,
        editingPath,
        slotsAdvanced,
        showAdvancedProgression,
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [draftReady, step, input, editingPath, slotsAdvanced, showAdvancedProgression])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function patch(p: Partial<ClassGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...p }))
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 0) {
      const id = input.id.trim()
      if (!id) return 'Class id is required.'
      if (!/^[a-zA-Z0-9_]+$/.test(id)) {
        return 'Class id must use only letters, numbers, and underscores.'
      }
      const editingSameId = editingPath != null && pathClassId(editingPath) === id
      if (
        !editingSameId &&
        index.classIds.some((c) => c.toLowerCase() === id.toLowerCase())
      ) {
        return `Class id "${id}" already exists.`
      }
    }
    return null
  }

  const stepError = validateStep(step)

  const previewLore = useMemo(() => mergeLoreForMode(input), [input])
  const previewYaml = useMemo(
    () => generateClassYaml({ ...input, attributeLore: previewLore }),
    [input, previewLore],
  )

  const creatingSkillIds = useMemo(
    () => new Set(input.skills.filter((s) => s.isNew).map((s) => s.id)),
    [input.skills],
  )
  const preflight = useMemo(
    () =>
      runClassPreflight(input, index, {
        creatingSkillIds,
        creatingMythicMobsIds: creatingSkillIds,
        allowExistingClassId:
          editingPath && pathClassId(editingPath) === input.id.trim()
            ? input.id.trim()
            : undefined,
      }),
    [input, index, creatingSkillIds, editingPath],
  )
  const hasErrors = preflight.some((p) => p.level === 'error')

  const plannedFiles = useMemo(
    () => buildOutputFileList(input, index, packName, files, editingPath, previewLore),
    [input, index, packName, files, editingPath, previewLore],
  )

  const killmobRows = useMemo(
    () => input.mainExpSources.map(parseKillmob),
    [input.mainExpSources],
  )

  const filteredAttrs = ATTRIBUTE_CATALOG.filter((a) => {
    if (!attrSearch.trim()) return true
    const q = attrSearch.toLowerCase()
    return a.id.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)
  })

  const loreLinesForPreview =
    input.attributeLoreMode === 'custom' ? input.attributeLore : previewLore

  function applyPreset(preset: ClassPreset): void {
    setInput((prev) => ({
      ...prev,
      themeColor: preset.themeColor,
      item: preset.item,
      attributes: preset.attributes.map((a) => ({ ...a })),
      mana: {
        ...prev.mana,
        name: preset.manaName,
        char: preset.manaChar,
        icon: preset.manaIcon,
      },
    }))
  }

  function loadExistingClass(path: string): void {
    const file = files.find((f) => f.path === path)
    if (!file) return
    const idx = index.classPaths.indexOf(path)
    const id = idx >= 0 ? index.classIds[idx] : pathClassId(path)
    const parsed = parseClassYaml(file.content, id)
    setInput(parsed)
    setEditingPath(path)
  }

  function addAttribute(id: string): void {
    const norm = normalizeAttributeId(id)
    if (!norm || input.attributes.some((a) => a.id === norm)) return
    const next: ClassAttributeEntry = {
      id: norm,
      base: 1,
      perLevel: 0,
      showInLore: true,
    }
    patch({ attributes: [...input.attributes, next] })
  }

  function updateAttr(idx: number, patchAttr: Partial<ClassAttributeEntry>): void {
    const attributes = input.attributes.map((a, i) => (i === idx ? { ...a, ...patchAttr } : a))
    patch({ attributes })
  }

  function setKillmobRows(rows: KillmobRow[]): void {
    patch({ mainExpSources: rows.map(formatKillmob) })
  }

  function attachExistingSkill(id: string): void {
    if (input.skills.some((s) => s.id === id)) return
    const ml = index.mythicLibSkills.find((s) => s.id === id)
    const builtin = BUILTIN_SKILL_IDS.find((s) => s.id === id)
    const modifiers: Record<string, SkillModifierValues> = {}
    if (ml) {
      for (const [k, v] of Object.entries(ml.parameters)) modifiers[k] = { ...v }
    }
    const binding: ClassSkillBinding = {
      id,
      displayName: ml?.name ?? builtin?.name ?? id,
      level: 1,
      maxLevel: 25,
      unlockedByDefault: true,
      needsBound: true,
      trigger: '',
      mana: emptyMod(18, -0.5),
      cooldown: emptyMod(28, -0.2),
      modifiers,
      categories: ml?.categories,
      icon: ml?.icon,
    }
    patch({ skills: [...input.skills, binding] })
  }

  function addNewSkill(): void {
    const id = draftSkill.id.trim().toUpperCase().replace(/\s+/g, '_')
    if (!id) return
    if (input.skills.some((s) => s.id === id)) return
    const cats = draftSkill.categories
      .split(/[,\s]+/)
      .map((c) => c.trim())
      .filter(Boolean)
    const categories = cats.length > 0 ? cats : [input.id.toUpperCase()]
    const modifiers: Record<string, SkillModifierValues> = {
      damage: emptyMod(draftSkill.damage, draftSkill.damagePer),
    }
    if (draftSkill.duration > 0) {
      modifiers.duration = emptyMod(draftSkill.duration, draftSkill.durationPer)
    }
    const damageTypes = draftSkill.damageTypes
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
    const binding: ClassSkillBinding = {
      id,
      displayName: draftSkill.name.trim() || id,
      level: 1,
      maxLevel: 25,
      unlockedByDefault: true,
      needsBound: true,
      trigger: '',
      mana: emptyMod(18, -0.5),
      cooldown: emptyMod(28, -0.2),
      modifiers,
      isNew: true,
      categories,
      icon: draftSkill.icon,
      lore: defaultMythicLibSkillLore(id, input.mana.name, Object.keys(modifiers)),
      damageTypes,
      damageElement: draftSkill.damageElement.trim() || categories[0],
      itemScaling: draftSkill.damage,
    }
    patch({ skills: [...input.skills, binding] })
    setNewSkillOpen(false)
    setDraftSkill({
      id: '',
      name: '',
      categories: '',
      icon: 'BOOK',
      damage: 10,
      damagePer: 0.5,
      duration: 0,
      durationPer: 0,
      damageTypes: 'SKILL,MAGIC',
      damageElement: '',
    })
  }

  function updateSkill(idx: number, patchSkill: Partial<ClassSkillBinding>): void {
    const skills = input.skills.map((s, i) => (i === idx ? { ...s, ...patchSkill } : s))
    patch({ skills })
  }

  function addSkillModifier(skillIdx: number): void {
    const skill = input.skills[skillIdx]
    if (!skill) return
    const name = (modNameDraft[skill.id] ?? '').trim().toLowerCase().replace(/\s+/g, '_')
    if (!name || skill.modifiers[name]) return
    updateSkill(skillIdx, {
      modifiers: { ...skill.modifiers, [name]: emptyMod(10, 0.5) },
    })
    setModNameDraft((prev) => ({ ...prev, [skill.id]: '' }))
  }

  function updateSlot(idx: number, patchSlot: Partial<ClassSkillSlot>): void {
    const slots = input.slots.map((s, i) => (i === idx ? { ...s, ...patchSlot } : s))
    patch({ slots })
  }

  function applyOutput(): void {
    if (hasErrors || validateStep(0)) return
    const out = buildOutputFileList(input, index, packName, files, editingPath, previewLore)
    clearClassWizardDraft()
    onApply({ files: out })
  }

  function goNext(): void {
    const err = validateStep(step)
    if (err) return
    setStep((s) => s + 1)
  }

  function goToStep(i: number): void {
    if (i === step) return
    if (i > step) {
      if (validateStep(0)) return
      if (validateStep(step)) return
    }
    setStep(i)
  }

  const bukkitColorOptions = (current: string) => {
    const known = BUKKIT_CHAT_COLORS as readonly string[]
    const extras = known.includes(current) ? [] : [current]
    return [...extras, ...known]
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg class-wizard"
        role="dialog"
        aria-labelledby="class-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <div>
            <h2 id="class-wizard-title">{editingPath ? 'Edit class' : 'New class'}</h2>
            <p className="wz-step-hint">{STEP_HINTS[step]}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <nav className="wizard-steps" aria-label="Steps">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={i === step ? 'wizard-step active' : i < step ? 'wizard-step done' : 'wizard-step'}
              onClick={() => goToStep(i)}
            >
              <span className="wizard-step-num">{i + 1}</span>
              <span className="wizard-step-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="wizard-body">
          {step === 0 && (
            <div className="wizard-pane">
              {index.classPaths.length > 0 ? (
                <Field label="Load existing class" hint="Fills the wizard from a class file in this workspace">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) loadExistingClass(e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Select a class…</option>
                    {index.classPaths.map((path, i) => (
                      <option key={path} value={path}>
                        {index.classIds[i] ?? pathClassId(path)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <div className="wz-preset-row">
                <span className="wz-field-label">Presets</span>
                {CLASS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip"
                    title={preset.description}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="wz-grid-2">
                <Field
                  label="Class id"
                  hint="Filename under classes/. Use lowercase letters, numbers, and underscores (for example fire)."
                >
                  <input
                    value={input.id}
                    onChange={(e) =>
                      patch({ id: e.target.value.trim().toLowerCase().replace(/\s+/g, '_') })
                    }
                    placeholder="fire"
                  />
                </Field>
                <Field label="Display name" hint="Shown in /class and GUIs">
                  <input
                    value={input.displayName}
                    onChange={(e) => patch({ displayName: e.target.value })}
                  />
                </Field>
                <Field label="Menu icon" hint="Minecraft material. Pick from the list or type any material name.">
                  <input
                    list="class-icon-materials"
                    value={input.item}
                    onChange={(e) => patch({ item: e.target.value })}
                  />
                  <datalist id="class-icon-materials">
                    {COMMON_MATERIALS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Custom model data" hint="Optional. Leave blank if unused.">
                  <input
                    type="number"
                    value={input.customModelData ?? ''}
                    onChange={(e) =>
                      patch({
                        customModelData: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Theme color" hint="Used for auto lore headers">
                  <div className="wz-color-row">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(input.themeColor) ? input.themeColor : '#7dd3fc'}
                      onChange={(e) => patch({ themeColor: e.target.value })}
                      aria-label="Pick theme color"
                    />
                    <input
                      value={input.themeColor}
                      onChange={(e) => patch({ themeColor: e.target.value })}
                      placeholder="#7dd3fc"
                    />
                  </div>
                </Field>
              </div>
              {editingPath ? (
                <p className="wz-card-lead">
                  Editing <code>{editingPath}</code>
                  {pathClassId(editingPath) !== input.id
                    ? `. The class id changed. Apply will write ${classFilePath(input.id)} and remove the old file.`
                    : null}
                </p>
              ) : null}
              <ColorTextField
                label="Flavor lore (class description)"
                value={input.lore.join('\n')}
                onChange={(v) => patch({ lore: v.split(/\r?\n/) })}
                multiline
                rows={3}
              />
            </div>
          )}

          {step === 1 && (
            <div className="wizard-pane">
              <div className="wz-grid-2">
                <Field label="Max level" hint="Highest class level players can reach">
                  <input
                    type="number"
                    value={input.maxLevel}
                    onChange={(e) => patch({ maxLevel: Number(e.target.value) || 1 })}
                  />
                </Field>
                <Field
                  label="Exp curve"
                  hint="How much XP each level needs. Usually “levels”."
                >
                  <input
                    list="exp-curve-list"
                    value={input.expCurve}
                    onChange={(e) => patch({ expCurve: e.target.value })}
                  />
                  <datalist id="exp-curve-list">
                    {index.expCurves.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <ToggleRow
                checked={input.createExpCurveIfMissing}
                onChange={(v) => patch({ createExpCurveIfMissing: v })}
                title="Create exp curve file if missing"
                hint="Writes MMOCore/exp-curves/{id}.txt so leveling works without extra setup"
              />

              <button
                type="button"
                className="wz-link-btn"
                onClick={() => setShowAdvancedProgression((v) => !v)}
              >
                {showAdvancedProgression ? 'Hide advanced…' : 'Show advanced…'}
              </button>
              {showAdvancedProgression ? (
                <>
                  <Field
                    label="Exp table (optional)"
                    hint="Advanced server reward table id. Leave empty if you use the level-up rewards below."
                    wide
                  >
                    <input
                      value={input.expTable}
                      onChange={(e) => patch({ expTable: e.target.value })}
                      placeholder="class_exp_table"
                    />
                  </Field>
                  <Field
                    label="Skill trees (optional)"
                    hint="Comma-separated tree ids if you use skill trees"
                    wide
                  >
                    <input
                      value={input.skillTrees.join(', ')}
                      onChange={(e) =>
                        patch({
                          skillTrees: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="general"
                    />
                  </Field>
                </>
              ) : null}

              <section className="wz-card">
                <h3>On every level-up, give…</h3>
                <p className="wz-card-lead">
                  These run as admin commands when the player levels this class.
                </p>
                <ToggleRow
                  checked={input.levelUpTriggers.skillPoints}
                  onChange={(v) =>
                    patch({ levelUpTriggers: { ...input.levelUpTriggers, skillPoints: v } })
                  }
                  title="1 skill point"
                  hint="Spend on upgrading skills"
                />
                <ToggleRow
                  checked={input.levelUpTriggers.classPoints}
                  onChange={(v) =>
                    patch({ levelUpTriggers: { ...input.levelUpTriggers, classPoints: v } })
                  }
                  title="1 class point"
                  hint="Used to unlock or switch classes when your server requires class points"
                />
                <ToggleRow
                  checked={input.levelUpTriggers.attributePoints}
                  onChange={(v) =>
                    patch({ levelUpTriggers: { ...input.levelUpTriggers, attributePoints: v } })
                  }
                  title="1 attribute point"
                  hint="Spent in /attributes (Strength, Dexterity, Intelligence). Separate from class player stats."
                />
              </section>

              <section className="wz-card">
                <h3>Class options</h3>
                <ToggleRow
                  checked={input.options.default}
                  onChange={(v) => patch({ options: { ...input.options, default: v } })}
                  title="Default class for new players"
                  hint="Like Human. Only one class should be default."
                />
                <ToggleRow
                  checked={input.options.display}
                  onChange={(v) => patch({ options: { ...input.options, display: v } })}
                  title="Show in /class menu"
                  hint="Turn off for hidden subclasses"
                />
                <ToggleRow
                  checked={input.options.needsPermission}
                  onChange={(v) => patch({ options: { ...input.options, needsPermission: v } })}
                  title="Requires permission"
                  hint={
                    input.options.needsPermission
                      ? `mmocore.class.${input.id || '…'}`
                      : 'Players need mmocore.class.<id> to pick it'
                  }
                />
                <ToggleRow
                  checked={input.options.offCombatManaRegen}
                  onChange={(v) =>
                    patch({ options: { ...input.options, offCombatManaRegen: v } })
                  }
                  title="Mana only regenerates out of combat"
                  hint="options.off-combat-mana-regen. Applies to flat MANA_REGENERATION from player stats."
                />
              </section>

              <section className="wz-card">
                <div className="wz-card-head">
                  <div>
                    <h3>XP from killing mobs</h3>
                    <p className="wz-card-lead">
                      How this class gains experience. Pick a mob and XP range. No syntax needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="wz-link-btn"
                    onClick={() => setShowRawExp((v) => !v)}
                  >
                    {showRawExp ? 'Simple editor' : 'Edit raw lines'}
                  </button>
                </div>

                {showRawExp ? (
                  <textarea
                    className="wz-raw-area"
                    rows={6}
                    value={input.mainExpSources.join('\n')}
                    onChange={(e) =>
                      patch({
                        mainExpSources: e.target.value
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                ) : (
                  <>
                    <div className="wz-killmob-list">
                      {killmobRows.map((row, idx) =>
                        row.raw ? (
                          <div key={idx} className="wz-killmob-row">
                            <code className="wz-killmob-raw">{row.raw}</code>
                            <button
                              type="button"
                              className="wz-icon-btn"
                              title="Remove"
                              onClick={() => setKillmobRows(killmobRows.filter((_, i) => i !== idx))}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div key={idx} className="wz-killmob-row">
                            <select
                              value={row.type}
                              onChange={(e) => {
                                const next = [...killmobRows]
                                next[idx] = { ...row, type: e.target.value }
                                setKillmobRows(next)
                              }}
                            >
                              {[row.type, ...COMMON_MOBS.filter((m) => m !== row.type)].map((m) => (
                                <option key={m} value={m}>
                                  {m.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                            <span className="wz-killmob-sep">XP</span>
                            <input
                              type="number"
                              value={row.min}
                              aria-label="Min XP"
                              onChange={(e) => {
                                const next = [...killmobRows]
                                next[idx] = { ...row, min: Number(e.target.value) || 0 }
                                setKillmobRows(next)
                              }}
                            />
                            <span className="wz-killmob-sep">to</span>
                            <input
                              type="number"
                              value={row.max}
                              aria-label="Max XP"
                              onChange={(e) => {
                                const next = [...killmobRows]
                                next[idx] = { ...row, max: Number(e.target.value) || 0 }
                                setKillmobRows(next)
                              }}
                            />
                            <button
                              type="button"
                              className="wz-icon-btn"
                              title="Remove"
                              onClick={() => setKillmobRows(killmobRows.filter((_, i) => i !== idx))}
                            >
                              ×
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="wz-killmob-add">
                      <select value={newMobType} onChange={(e) => setNewMobType(e.target.value)}>
                        {COMMON_MOBS.map((m) => (
                          <option key={m} value={m}>
                            {m.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="primary"
                        onClick={() =>
                          setKillmobRows([
                            ...killmobRows,
                            { type: newMobType, min: 8, max: 20 },
                          ])
                        }
                      >
                        Add mob
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-pane">
              <section className="wz-card">
                <h3>Resource bar branding</h3>
                <p className="wz-card-lead">
                  Rename “mana” for this class (for example Ember, Rage, or Focus). Shown on the action bar.
                </p>
                <div className="wz-grid-3">
                  <Field label="Name">
                    <input
                      value={input.mana.name}
                      onChange={(e) => patch({ mana: { ...input.mana, name: e.target.value } })}
                      placeholder="Mana"
                    />
                  </Field>
                  <Field label="Symbol">
                    <input
                      value={input.mana.char}
                      onChange={(e) => patch({ mana: { ...input.mana, char: e.target.value } })}
                    />
                  </Field>
                  <Field label="Action-bar icon" hint="Can use & color codes">
                    <input
                      value={input.mana.icon}
                      onChange={(e) => patch({ mana: { ...input.mana, icon: e.target.value } })}
                    />
                  </Field>
                  <Field label="Full color">
                    <select
                      value={input.mana.colorFull}
                      onChange={(e) => patch({ mana: { ...input.mana, colorFull: e.target.value } })}
                    >
                      {bukkitColorOptions(input.mana.colorFull).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Half color">
                    <select
                      value={input.mana.colorHalf}
                      onChange={(e) => patch({ mana: { ...input.mana, colorHalf: e.target.value } })}
                    >
                      {bukkitColorOptions(input.mana.colorHalf).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Empty color">
                    <select
                      value={input.mana.colorEmpty}
                      onChange={(e) =>
                        patch({ mana: { ...input.mana, colorEmpty: e.target.value } })
                      }
                    >
                      {bukkitColorOptions(input.mana.colorEmpty).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              <section className="wz-card">
                <h3>Resource bar refill</h3>
                <p className="wz-card-lead">
                  Percent of max health / {input.mana.name || 'mana'} restored per second (the{' '}
                  <code>resource:</code> block). Flat pts/sec regen is set under Player stats
                  (HEALTH_REGENERATION, MANA_REGENERATION).
                </p>
                <div className="wz-grid-2">
                  <Field label="Health refill % / sec (base)">
                    <input
                      type="number"
                      step="any"
                      value={input.resource.health.base}
                      onChange={(e) =>
                        patch({
                          resource: {
                            ...input.resource,
                            health: { ...input.resource.health, base: Number(e.target.value) },
                          },
                        })
                      }
                    />
                  </Field>
                  <Field label={`${input.mana.name || 'Mana'} refill % / sec (base)`}>
                    <input
                      type="number"
                      step="any"
                      value={input.resource.mana.base}
                      onChange={(e) =>
                        patch({
                          resource: {
                            ...input.resource,
                            mana: { ...input.resource.mana, base: Number(e.target.value) },
                          },
                        })
                      }
                    />
                  </Field>
                </div>
                <ToggleRow
                  checked={input.resource.health.offCombat}
                  onChange={(v) =>
                    patch({
                      resource: {
                        ...input.resource,
                        health: { ...input.resource.health, offCombat: v },
                      },
                    })
                  }
                  title="Health % refill only out of combat"
                  hint="resource.health.off-combat"
                />
                <ToggleRow
                  checked={input.resource.mana.offCombat}
                  onChange={(v) =>
                    patch({
                      resource: {
                        ...input.resource,
                        mana: { ...input.resource.mana, offCombat: v },
                      },
                    })
                  }
                  title={`${input.mana.name || 'Mana'} % refill only out of combat`}
                  hint="resource.mana.off-combat"
                />
              </section>

              <section className="wz-card">
                <ToggleRow
                  checked={input.castParticle.enabled}
                  onChange={(v) =>
                    patch({ castParticle: { ...input.castParticle, enabled: v } })
                  }
                  title="Show casting particles"
                  hint="Helix around the player while in skill casting mode"
                />
                {input.castParticle.enabled ? (
                  <div className="wz-grid-3" style={{ marginTop: '0.5rem' }}>
                    <Field label="Particle">
                      <input
                        value={input.castParticle.particle}
                        onChange={(e) =>
                          patch({
                            castParticle: { ...input.castParticle, particle: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="RGB">
                      <div className="wz-color-row">
                        <input
                          type="number"
                          min={0}
                          max={255}
                          value={input.castParticle.red}
                          onChange={(e) =>
                            patch({
                              castParticle: {
                                ...input.castParticle,
                                red: Number(e.target.value),
                              },
                            })
                          }
                          aria-label="Red"
                        />
                        <input
                          type="number"
                          min={0}
                          max={255}
                          value={input.castParticle.green}
                          onChange={(e) =>
                            patch({
                              castParticle: {
                                ...input.castParticle,
                                green: Number(e.target.value),
                              },
                            })
                          }
                          aria-label="Green"
                        />
                        <input
                          type="number"
                          min={0}
                          max={255}
                          value={input.castParticle.blue}
                          onChange={(e) =>
                            patch({
                              castParticle: {
                                ...input.castParticle,
                                blue: Number(e.target.value),
                              },
                            })
                          }
                          aria-label="Blue"
                        />
                      </div>
                    </Field>
                    {/REDSTONE|DUST/i.test(input.castParticle.particle) ? (
                      <Field label="Size" hint="Dust particle size">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={input.castParticle.size ?? 1}
                          onChange={(e) =>
                            patch({
                              castParticle: {
                                ...input.castParticle,
                                size: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </Field>
                    ) : null}
                    {/BLOCK|FALLING_DUST|DUST_PILLAR|BLOCK_CRUMBLE|BLOCK_MARKER/i.test(
                      input.castParticle.particle,
                    ) ? (
                      <Field label="Material" hint="Required for block-style particles">
                        <input
                          list="cast-particle-materials"
                          value={input.castParticle.material ?? ''}
                          onChange={(e) =>
                            patch({
                              castParticle: {
                                ...input.castParticle,
                                material: e.target.value,
                              },
                            })
                          }
                          placeholder="REDSTONE_BLOCK"
                        />
                        <datalist id="cast-particle-materials">
                          {COMMON_MATERIALS.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </Field>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="wz-card">
                <ToggleRow
                  checked={Object.keys(input.keyCombos ?? {}).length > 0}
                  onChange={(v) => {
                    if (!v) {
                      patch({ keyCombos: {} })
                      return
                    }
                    patch({
                      keyCombos: {
                        '1': ['LEFT_CLICK', 'RIGHT_CLICK'],
                        '2': ['LEFT_CLICK', 'LEFT_CLICK'],
                      },
                    })
                  }}
                  title="Class-specific key combos"
                  hint="Optional. Most servers use global casting in MMOCore/config.yml instead."
                />
                {Object.keys(input.keyCombos ?? {}).length > 0 ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p className="wz-card-lead">
                      Map slot numbers to click sequences. Leave empty to omit key-combos from the
                      class file.
                    </p>
                    {Object.entries(input.keyCombos).map(([slot, keys]) => (
                      <div key={slot} className="wz-mod-row" style={{ alignItems: 'center' }}>
                        <strong className="wz-mod-label">Slot {slot}</strong>
                        <input
                          style={{ flex: 1 }}
                          value={keys.join(', ')}
                          onChange={(e) => {
                            const next = e.target.value
                              .split(/[,\s]+/)
                              .map((k) => k.trim().toUpperCase())
                              .filter(Boolean)
                            patch({
                              keyCombos: { ...input.keyCombos, [slot]: next },
                            })
                          }}
                          placeholder="LEFT_CLICK, RIGHT_CLICK"
                        />
                        <button
                          type="button"
                          className="wz-icon-btn"
                          onClick={() => {
                            const next = { ...input.keyCombos }
                            delete next[slot]
                            patch({ keyCombos: next })
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div className="attr-picker">
                      {CASTING_KEYBINDS.map((k) => (
                        <span key={k} className="chip" title="Keybind id">
                          {k}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        const nextSlot = String(
                          Math.max(0, ...Object.keys(input.keyCombos).map(Number)) + 1,
                        )
                        patch({
                          keyCombos: {
                            ...input.keyCombos,
                            [nextSlot]: ['LEFT_CLICK', 'RIGHT_CLICK'],
                          },
                        })
                      }}
                    >
                      Add combo slot
                    </button>
                  </div>
                ) : null}
              </section>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-pane">
              <p className="wz-card-lead">
                These are MythicLib player stats granted by the class (health, damage, crit, and so
                on). They are not the Strength / Dexterity / Intelligence points from{' '}
                <code>/attributes</code>. Stats scale as <code>base + level × per-level</code>. Toggle
                “In lore” to show them on the class menu.
              </p>
              <div className="wz-preset-row">
                <span className="wz-field-label">Presets</span>
                {CLASS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip"
                    title={preset.description}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="wz-attr-toolbar">
                <input
                  placeholder="Search stats to add…"
                  value={attrSearch}
                  onChange={(e) => setAttrSearch(e.target.value)}
                />
              </div>
              {attrSearch.trim() ? (
                <div className="attr-picker">
                  {filteredAttrs.slice(0, 24).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="chip"
                      title={a.description ?? a.id}
                      disabled={input.attributes.some((x) => x.id === a.id)}
                      onClick={() => {
                        addAttribute(a.id)
                        setAttrSearch('')
                      }}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="attr-picker">
                  {ATTRIBUTE_CATALOG.filter((a) =>
                    ['ATTACK_DAMAGE', 'MAX_HEALTH', 'ARMOR', 'MAX_MANA', 'MANA_REGENERATION', 'CRITICAL_STRIKE_CHANCE', 'SKILL_DAMAGE'].includes(
                      a.id,
                    ),
                  ).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="chip"
                      disabled={input.attributes.some((x) => x.id === a.id)}
                      onClick={() => addAttribute(a.id)}
                    >
                      + {a.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="wz-custom-attr">
                <input
                  value={customAttrId}
                  onChange={(e) => setCustomAttrId(e.target.value)}
                  placeholder="CUSTOM_STAT"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addAttribute(customAttrId)
                      setCustomAttrId('')
                    }
                  }}
                />
                <button
                  type="button"
                  className="primary"
                  disabled={!customAttrId.trim()}
                  onClick={() => {
                    addAttribute(customAttrId)
                    setCustomAttrId('')
                  }}
                >
                  Add custom
                </button>
              </div>

              <div className="wz-attr-table">
                <div className="wz-attr-head" aria-hidden="true">
                  <span>Stat</span>
                  <span>Base</span>
                  <span>Per level</span>
                  <span>Max</span>
                  <span>Lore</span>
                  <span />
                </div>
                {input.attributes.map((attr, idx) => {
                  const meta = resolveAttributeMeta(attr.id)
                  return (
                    <div key={attr.id} className="wz-attr-row">
                      <div className="wz-attr-name" title={attr.id}>
                        <span className="wz-attr-icon">{meta.icon}</span>
                        <span>
                          <strong>{meta.label}</strong>
                          <code>{attr.id}</code>
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={attr.base}
                        aria-label={`${attr.id} base`}
                        onChange={(e) => updateAttr(idx, { base: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        step="any"
                        value={attr.perLevel}
                        aria-label={`${attr.id} per level`}
                        onChange={(e) => updateAttr(idx, { perLevel: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        step="any"
                        value={attr.max ?? ''}
                        placeholder="none"
                        aria-label={`${attr.id} max`}
                        onChange={(e) =>
                          updateAttr(idx, {
                            max: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                      <div className="wz-toggle wz-toggle-compact" title="Show in class lore">
                        <Switch
                          size="sm"
                          checked={attr.showInLore}
                          onChange={(v) => updateAttr(idx, { showInLore: v })}
                          aria-label={`Show ${attr.id} in class lore`}
                        />
                      </div>
                      <button
                        type="button"
                        className="wz-icon-btn"
                        title="Remove"
                        onClick={() =>
                          patch({ attributes: input.attributes.filter((_, i) => i !== idx) })
                        }
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-pane">
              <p className="wz-card-lead">
                Class skills must be registered in MythicLib. Active skills need a skill slot to
                cast. Passive skills use a trigger (for example ATTACK or TIMER). Set “Must be bound”
                off when a passive should always apply without binding.
              </p>
              <div className="wz-actions-row">
                <button type="button" className="primary" onClick={() => setNewSkillOpen(true)}>
                  Create new skill…
                </button>
                <Field label="Or attach existing">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) attachExistingSkill(e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Select MythicLib skill…</option>
                    {index.mythicLibSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <ToggleRow
                checked={input.includeAttackSkills}
                onChange={(v) => patch({ includeAttackSkills: v })}
                title="Include regular + critical attack skills"
                hint="Binds prefix_regular_attack and prefix_critical_strike on the class"
              />
              {input.includeAttackSkills ? (
                <>
                  <Field label="Attack id prefix" hint="Becomes prefix_regular_attack">
                    <input
                      value={input.attackSkillPrefix}
                      onChange={(e) => patch({ attackSkillPrefix: e.target.value })}
                    />
                  </Field>
                  <ToggleRow
                    checked={input.syncElementRow}
                    onChange={(v) => patch({ syncElementRow: v })}
                    title="Update MythicLib/elements.yml"
                    hint="Writes the element row and optional attack_skills.yml stubs. Script bodies stay manual."
                  />
                  <p className="wz-card-lead">
                    After creating the class, polish MythicMobs mechanics and point any MythicLib
                    scripts at these attack skill ids.
                  </p>
                </>
              ) : null}

              <Field label="Attach built-in Phoenix skill" hint="Read-only list of common stock skill ids">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) attachExistingSkill(e.target.value)
                    e.target.value = ''
                  }}
                >
                  <option value="">Select built-in skill…</option>
                  {BUILTIN_SKILL_IDS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </Field>

              {input.skills.length === 0 ? (
                <p className="wz-empty">No skills yet. Create or attach one above.</p>
              ) : null}

              {input.skills.map((skill, idx) => (
                <div key={skill.id} className="skill-card">
                  <div className="wz-card-head">
                    <div>
                      <strong>{skill.displayName}</strong>{' '}
                      <code>{skill.id}</code>
                      {skill.isNew ? <span className="wz-badge">new</span> : null}
                    </div>
                    <button
                      type="button"
                      className="wz-icon-btn"
                      onClick={() => patch({ skills: input.skills.filter((_, i) => i !== idx) })}
                    >
                      ×
                    </button>
                  </div>
                  <div className="wz-grid-3">
                    <Field label="Unlock at class level" hint="Natural unlock level for this class">
                      <input
                        type="number"
                        value={skill.level}
                        onChange={(e) => updateSkill(idx, { level: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Max skill level" hint="Players stop upgrading at this skill level">
                      <input
                        type="number"
                        value={skill.maxLevel}
                        onChange={(e) => updateSkill(idx, { maxLevel: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <ToggleRow
                    checked={skill.unlockedByDefault}
                    onChange={(v) => updateSkill(idx, { unlockedByDefault: v })}
                    title="Unlocked by default"
                    hint="If off, grant later with a quest, command, skill book, or skill tree"
                  />
                  <Field
                    label="Skill type"
                    hint="Passive skills need a trigger. Active skills are cast from a skill slot."
                  >
                    <select
                      value={skill.trigger || ''}
                      onChange={(e) => {
                        const trigger = e.target.value
                        updateSkill(idx, {
                          trigger,
                          needsBound: trigger ? false : true,
                          timer:
                            trigger === 'TIMER'
                              ? skill.timer && skill.timer > 0
                                ? skill.timer
                                : 5
                              : undefined,
                        })
                      }}
                    >
                      {CLASS_SKILL_TRIGGERS.map((t) => (
                        <option key={t.id || 'active'} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {skill.trigger === 'TIMER' ? (
                    <Field label="Timer (seconds)" hint="How often the passive runs">
                      <input
                        type="number"
                        min={1}
                        value={skill.timer ?? 5}
                        onChange={(e) => updateSkill(idx, { timer: Number(e.target.value) })}
                      />
                    </Field>
                  ) : null}
                  <ToggleRow
                    checked={skill.needsBound}
                    onChange={(v) => updateSkill(idx, { needsBound: v })}
                    title="Must be bound to a skill slot"
                    hint={
                      skill.trigger
                        ? 'Turn off so this passive always applies once unlocked'
                        : 'Active skills must stay bound to be cast'
                    }
                  />
                  <ModTriple
                    label="Mana"
                    value={skill.mana}
                    fields={['base', 'perLevel', 'min']}
                    onChange={(mana) => updateSkill(idx, { mana })}
                  />
                  <ModTriple
                    label="Cooldown"
                    value={skill.cooldown}
                    fields={['base', 'perLevel', 'min']}
                    onChange={(cooldown) => updateSkill(idx, { cooldown })}
                  />
                  <p className="wz-card-lead">
                    Skill modifiers scale with skill level (upgrades), not class level.
                  </p>
                  {Object.entries(skill.modifiers).map(([key, mod]) => (
                    <div key={key} className="wz-mod-row">
                      <strong className="wz-mod-label">{key}</strong>
                      {(['base', 'perLevel', 'max'] as const).map((f) => (
                        <label key={f} className="wz-mod-cell">
                          <span>{f === 'perLevel' ? 'Per level' : f === 'base' ? 'Base' : 'Max'}</span>
                          <input
                            type="number"
                            step="any"
                            value={mod[f] ?? ''}
                            placeholder="none"
                            onChange={(e) => {
                              const raw = e.target.value
                              updateSkill(idx, {
                                modifiers: {
                                  ...skill.modifiers,
                                  [key]: {
                                    ...mod,
                                    [f]: raw === '' ? undefined : Number(raw),
                                  },
                                },
                              })
                            }}
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        className="wz-icon-btn"
                        title="Remove modifier"
                        onClick={() => {
                          const next = { ...skill.modifiers }
                          delete next[key]
                          updateSkill(idx, { modifiers: next })
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="wz-mod-add">
                    <input
                      value={modNameDraft[skill.id] ?? ''}
                      onChange={(e) =>
                        setModNameDraft((prev) => ({ ...prev, [skill.id]: e.target.value }))
                      }
                      placeholder="damage, duration…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkillModifier(idx)
                        }
                      }}
                    />
                    <button type="button" className="primary" onClick={() => addSkillModifier(idx)}>
                      Add modifier
                    </button>
                  </div>
                  {skill.isNew ? (
                    <div className="wz-grid-2" style={{ marginTop: '0.5rem' }}>
                      <Field label="mmodamage types" hint="Comma-separated MythicLib damage types">
                        <input
                          value={(skill.damageTypes ?? ['SKILL', 'MAGIC']).join(',')}
                          onChange={(e) =>
                            updateSkill(idx, {
                              damageTypes: e.target.value
                                .split(/[,\s]+/)
                                .map((t) => t.trim().toUpperCase())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                      <Field label="Damage element" hint="Usually matches the skill category">
                        <input
                          list={`dmg-el-${idx}`}
                          value={skill.damageElement ?? ''}
                          onChange={(e) => updateSkill(idx, { damageElement: e.target.value })}
                          placeholder={skill.categories?.[0] ?? input.id.toUpperCase()}
                        />
                        <datalist id={`dmg-el-${idx}`}>
                          {DEFAULT_ELEMENT_IDS.map((el) => (
                            <option key={el} value={el} />
                          ))}
                        </datalist>
                      </Field>
                      <Field
                        label="MythicLib item scaling"
                        hint="Flat MMOItems item: value. Defaults to the damage base."
                      >
                        <input
                          type="number"
                          step="any"
                          value={
                            skill.itemScaling ??
                            skill.modifiers.damage?.base ??
                            ''
                          }
                          onChange={(e) =>
                            updateSkill(idx, {
                              itemScaling:
                                e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <div className="attr-picker">
                        {DAMAGE_TYPE_CHIPS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="chip"
                            onClick={() => {
                              const cur = new Set(skill.damageTypes ?? ['SKILL', 'MAGIC'])
                              if (cur.has(t)) cur.delete(t)
                              else cur.add(t)
                              updateSkill(idx, { damageTypes: [...cur] })
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}

              {newSkillOpen ? (
                <div className="nested-dialog">
                  <h3>New skill stub</h3>
                  <p className="wz-card-lead">
                    Creates MythicLib registration plus a MythicMobs stub with typed elemental
                    mmodamage. Example ids: STORM_BOLT, category STORM.
                  </p>
                  <div className="wz-grid-2">
                    <Field label="Skill id" hint="e.g. STORM_BOLT">
                      <input
                        value={draftSkill.id}
                        onChange={(e) => setDraftSkill({ ...draftSkill, id: e.target.value })}
                        placeholder={`${input.id.toUpperCase()}_BOLT`}
                      />
                    </Field>
                    <Field label="Display name">
                      <input
                        value={draftSkill.name}
                        onChange={(e) => setDraftSkill({ ...draftSkill, name: e.target.value })}
                      />
                    </Field>
                    <Field label="Category" hint="Used by slot formulas, e.g. STORM">
                      <input
                        value={draftSkill.categories}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, categories: e.target.value })
                        }
                        placeholder={input.id.toUpperCase()}
                      />
                    </Field>
                    <Field label="Icon">
                      <input
                        list="skill-icon-materials"
                        value={draftSkill.icon}
                        onChange={(e) => setDraftSkill({ ...draftSkill, icon: e.target.value })}
                      />
                      <datalist id="skill-icon-materials">
                        {COMMON_MATERIALS.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label="Damage base">
                      <input
                        type="number"
                        value={draftSkill.damage}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, damage: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Damage per level">
                      <input
                        type="number"
                        step="any"
                        value={draftSkill.damagePer}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, damagePer: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Duration base (optional)">
                      <input
                        type="number"
                        value={draftSkill.duration}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, duration: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Duration per level">
                      <input
                        type="number"
                        step="any"
                        value={draftSkill.durationPer}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, durationPer: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Damage types" hint="SKILL,MAGIC">
                      <input
                        value={draftSkill.damageTypes}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, damageTypes: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Damage element" hint="Defaults to category">
                      <input
                        list="draft-dmg-el"
                        value={draftSkill.damageElement}
                        onChange={(e) =>
                          setDraftSkill({ ...draftSkill, damageElement: e.target.value })
                        }
                        placeholder={input.id.toUpperCase()}
                      />
                      <datalist id="draft-dmg-el">
                        {DEFAULT_ELEMENT_IDS.map((el) => (
                          <option key={el} value={el} />
                        ))}
                      </datalist>
                    </Field>
                  </div>
                  <div className="wz-actions-row">
                    <button type="button" onClick={() => setNewSkillOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" className="primary" onClick={addNewSkill}>
                      Add skill
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 5 && (
            <div className="wizard-pane">
              <ToggleRow
                checked={slotsAdvanced}
                onChange={setSlotsAdvanced}
                title="Advanced slot options"
                hint="Formulas, hardset, buffs, auto lore, and manual bind"
              />
              <p className="wz-card-lead">
                {slotsAdvanced
                  ? 'Each slot is a skill keybind. Formulas limit which skills fit (for example only <ACTIVE> or a category like <FIRE>). Buffs apply to the skill bound to that slot. Use hardset to force one skill for everyone.'
                  : 'Name each skill slot and choose whether it starts available. Switch to Advanced for formulas and buffs.'}
              </p>
              {input.slots.map((slot, idx) => (
                <div key={slot.index} className="skill-card">
                  <strong>
                    Slot {slot.index}
                    {slot.name ? `: ${slot.name}` : ''}
                  </strong>
                  <Field label="Display name">
                    <input
                      value={slot.name}
                      onChange={(e) => updateSlot(idx, { name: e.target.value })}
                    />
                  </Field>
                  <ToggleRow
                    checked={slot.unlockedByDefault}
                    onChange={(v) => updateSlot(idx, { unlockedByDefault: v })}
                    title="Unlocked from the start"
                    hint="If off, grant later with /mmocore admin slot unlock"
                  />
                  {slotsAdvanced ? (
                    <>
                      <ToggleRow
                        checked={slot.canManuallyBind}
                        onChange={(v) => updateSlot(idx, { canManuallyBind: v })}
                        title="Players can change the bound skill"
                      />
                      <Field
                        label="Allowed skills (formula)"
                        hint="Leave empty for any skill. Use categories from MythicLib (for example &lt;FIRE&gt;)."
                      >
                        <input
                          value={slot.formula}
                          onChange={(e) => updateSlot(idx, { formula: e.target.value })}
                          placeholder="Any skill"
                        />
                      </Field>
                      <div className="attr-picker">
                        {FORMULA_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            className="chip"
                            title={chip.value || 'No formula restriction'}
                            onClick={() => updateSlot(idx, { formula: chip.value })}
                          >
                            {chip.label}
                          </button>
                        ))}
                        {(
                          input.id.trim()
                            ? [input.id.toUpperCase()]
                            : []
                        )
                          .concat(
                            [...new Set(input.skills.flatMap((s) => s.categories ?? []))].filter(
                              (c) => c.toUpperCase() !== input.id.toUpperCase(),
                            ),
                          )
                          .map((cat) => (
                            <button
                              key={`cat-only-${cat}`}
                              type="button"
                              className="chip"
                              onClick={() => updateSlot(idx, { formula: `<${cat}>` })}
                            >
                              &lt;{cat}&gt; only
                            </button>
                          ))}
                        {[...new Set(input.skills.flatMap((s) => s.categories ?? []))].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className="chip"
                            onClick={() =>
                              updateSlot(idx, { formula: `<ACTIVE> && <${cat}>` })
                            }
                          >
                            Active + &lt;{cat}&gt;
                          </button>
                        ))}
                      </div>
                      <Field
                        label="Force-bound skill (optional)"
                        hint="Hardsets this slot to one skill id for all players (no binding choice)"
                      >
                        <input
                          list={`hardset-${idx}`}
                          value={slot.hardset}
                          onChange={(e) => updateSlot(idx, { hardset: e.target.value })}
                          placeholder="None"
                        />
                        <datalist id={`hardset-${idx}`}>
                          {input.skills.map((s) => (
                            <option key={s.id} value={s.id} />
                          ))}
                        </datalist>
                      </Field>
                      <ToggleRow
                        checked={slot.autoLoreFromBuffs}
                        onChange={(v) => updateSlot(idx, { autoLoreFromBuffs: v })}
                        title="Auto-write slot lore from buffs"
                      />
                      <div className="attr-picker">
                        {SLOT_BUFF_PRESETS.map((preset) => (
                          <button
                            key={preset.modifier}
                            type="button"
                            className="chip"
                            onClick={() =>
                              updateSlot(idx, {
                                buffs: [
                                  ...slot.buffs,
                                  {
                                    modifier: preset.modifier,
                                    amount: preset.defaultAmount,
                                    type: preset.defaultType,
                                  },
                                ],
                              })
                            }
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                      {slot.buffs.map((b, bi) => (
                        <div key={`${b.modifier}-${bi}`} className="wz-buff-row">
                          <code>{b.modifier}</code>
                          <input
                            type="number"
                            value={b.amount}
                            onChange={(e) => {
                              const buffs = slot.buffs.map((x, i) =>
                                i === bi ? { ...x, amount: Number(e.target.value) } : x,
                              )
                              updateSlot(idx, { buffs })
                            }}
                          />
                          <select
                            value={b.type}
                            onChange={(e) => {
                              const buffs = slot.buffs.map((x, i) =>
                                i === bi
                                  ? { ...x, type: e.target.value as 'FLAT' | 'RELATIVE' }
                                  : x,
                              )
                              updateSlot(idx, { buffs })
                            }}
                          >
                            <option value="RELATIVE">% relative</option>
                            <option value="FLAT">flat</option>
                          </select>
                          <button
                            type="button"
                            className="wz-icon-btn"
                            onClick={() =>
                              updateSlot(idx, { buffs: slot.buffs.filter((_, i) => i !== bi) })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="wizard-pane">
              <p className="wz-card-lead">
                This is only visual text in the class select menu. It does not change real stats.
                Auto mode keeps it in sync with Player stats and Skills.
              </p>
              <section className="wz-card">
                <h3>How to build lore</h3>
                {(
                  [
                    ['auto', 'Automatic', 'Rebuilds when you change stats or skills'],
                    ['custom', 'Manual', 'You write every line yourself'],
                    ['auto-pinned', 'Auto + extras', 'Auto lore, plus your pinned lines at the end'],
                  ] as const
                ).map(([mode, title, hint]) => (
                  <label key={mode} className="wz-toggle">
                    <input
                      type="radio"
                      name="lore-mode"
                      checked={input.attributeLoreMode === mode}
                      onChange={() => patch({ attributeLoreMode: mode })}
                    />
                    <span className="wz-toggle-copy">
                      <span className="wz-toggle-title">{title}</span>
                      <span className="wz-toggle-hint">{hint}</span>
                    </span>
                  </label>
                ))}
              </section>
              <ToggleRow
                checked={input.includeAttackSkillsInLore}
                onChange={(v) => patch({ includeAttackSkillsInLore: v })}
                title="List attack skills in the Skills section"
              />
              {input.attributeLoreMode === 'custom' ? (
                <ColorTextField
                  label="Attribute lore"
                  value={input.attributeLore.join('\n')}
                  onChange={(v) => patch({ attributeLore: v.split(/\r?\n/) })}
                  multiline
                  rows={10}
                />
              ) : (
                <pre className="dialog-preview wz-lore-preview">{previewLore.join('\n') || '(empty)'}</pre>
              )}
              <LoreLivePreview lines={loreLinesForPreview} />
              {input.attributeLoreMode === 'auto-pinned' ? (
                <Field label="Pinned extra lines" wide>
                  <textarea
                    rows={3}
                    value={input.pinnedLoreLines.join('\n')}
                    onChange={(e) => patch({ pinnedLoreLines: e.target.value.split(/\r?\n/) })}
                  />
                </Field>
              ) : null}
            </div>
          )}

          {step === 7 && (
            <div className="wizard-pane">
              <section className="wz-card">
                <h3>Checks</h3>
                {preflight.length === 0 ? (
                  <p className="wz-ok">Ready to create. No issues found.</p>
                ) : (
                  <ul className="preflight-list">
                    {preflight.map((item, i) => (
                      <li key={i} className={item.level}>
                        <strong>{item.level === 'error' ? 'Must fix' : 'Note'}:</strong>{' '}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="wz-card">
                <h3>Files to write</h3>
                <ul className="wz-file-list">
                  {plannedFiles.map((f) => (
                    <li key={`${f.mode}:${f.path}`}>
                      <code>{f.path}</code>
                      <span className="wz-badge">
                        {f.mode === 'delete' ? 'remove' : f.mode}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <h3>YAML preview</h3>
              <pre className="dialog-preview wz-yaml-preview">{previewYaml}</pre>
            </div>
          )}
        </div>

        <div className="dialog-actions wizard-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <div className="wizard-nav">
            {stepError ? <p className="wz-step-error">{stepError}</p> : null}
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="primary"
                disabled={!!stepError}
                onClick={goNext}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={hasErrors || !!validateStep(0) || !input.id.trim()}
                onClick={applyOutput}
              >
                {editingPath ? 'Save class files' : 'Create class files'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
