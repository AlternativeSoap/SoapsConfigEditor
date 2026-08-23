import { useMemo, useRef, useState } from 'react'
import {
  defaultYamlFileNameFromId,
  joinPath,
  resolveCreateFolder,
  sanitizeYamlFileName,
} from '../core/mythicmobs/createTarget'
import {
  generateDroptableYaml,
  generateItemYaml,
  generateMobYaml,
  generateRandomSpawnYaml,
  generateSkillYaml,
} from '../core/mythicmobs/generators'
import { mobSkillReference, type SkillPreset } from '../data/mythicmobs/projectilePresets'
import type {
  CreateKind,
  DropEntry,
  DroptableGeneratorInput,
  FileRecord,
  ItemGeneratorInput,
  MobGeneratorInput,
  PackIndex,
  RandomSpawnGeneratorInput,
  SkillGeneratorInput,
} from '../types'
import { ColorTextField } from './ColorTextField'
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPreviewBlock,
  DialogShell,
} from './DialogShell'
import { RemoveButton } from './RemoveButton'
import { SkillLineBuilder } from './SkillLineBuilder'
import { Switch } from './Switch'
import {
  MOB_OPTIONS,
  mobOptionByName,
} from '../data/mythicmobs/mobOptions'

const EQUIPMENT_SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND'] as const

const EQUIPMENT_SLOT_META: { slot: typeof EQUIPMENT_SLOTS[number]; icon: string; label: string }[] = [
  { slot: 'HEAD',    icon: '🪖', label: 'Head' },
  { slot: 'CHEST',  icon: '🧥', label: 'Chest' },
  { slot: 'LEGS',   icon: '👖', label: 'Legs' },
  { slot: 'FEET',   icon: '👟', label: 'Feet' },
  { slot: 'HAND',   icon: '⚔️', label: 'Main Hand' },
  { slot: 'OFFHAND',icon: '🛡️', label: 'Off Hand' },
]

type MythicCreateKind = Exclude<
  CreateKind,
  | 'class'
  | 'mmocore-skill'
  | 'elements'
  | 'skill-casting'
  | 'spell'
  | 'archetype'
  | 'reagent'
  | 'quest'
  | 'edit-quest'
  | 'equipment-set'
  | 'augment-type'
  | 'crucible-item'
  | 'bag'
>

interface CreateDialogProps {
  kind: MythicCreateKind
  files: FileRecord[]
  packIndex: PackIndex
  suggestedPath: string
  crucibleEnabled?: boolean
  onClose: () => void
  onInsert: (targetPath: string, yaml: string) => void
}

const CATEGORY_FOR_KIND: Record<
  MythicCreateKind,
  'mobs' | 'items' | 'skills' | 'droptables' | 'randomspawns'
> = {
  mob: 'mobs',
  item: 'items',
  skill: 'skills',
  droptable: 'droptables',
  randomspawn: 'randomspawns',
}

const TITLE_FOR_KIND: Record<MythicCreateKind, string> = {
  mob: 'New mob',
  item: 'New item',
  skill: 'New skill',
  droptable: 'New drop table',
  randomspawn: 'New random spawn',
}

function preferredFiles(kind: MythicCreateKind, files: FileRecord[]): FileRecord[] {
  const category = CATEGORY_FOR_KIND[kind]
  return files.filter((file) => file.category === category)
}

const emptyMob: MobGeneratorInput = {
  id: 'MY_NEW_MOB',
  type: 'ZOMBIE',
  display: 'My New Mob',
  health: 50,
  damage: 6,
  skills: '',
  drops: '',
  equipment: {},
  options: {},
  faction: '',
  armor: '',
  aiGoalSelectors: '',
  aiTargetSelectors: '',
}

const emptyItem: ItemGeneratorInput = {
  id: 'MY_NEW_ITEM',
  material: 'DIAMOND_SWORD',
  display: 'My New Item',
  lore: '',
  rarity: 'COMMON',
}

const emptySkill: SkillGeneratorInput = {
  id: 'MY_NEW_SKILL',
  cooldown: 0,
  conditions: '',
  skills: '',
}

const emptyDroptable: DroptableGeneratorInput = {
  id: 'MY_DROP_TABLE',
  drops: [],
}

const emptySpawn: RandomSpawnGeneratorInput = {
  id: 'MY_RANDOM_SPAWN',
  action: 'ADD',
  mobType: '',
  level: '',
  chance: 0.1,
  worlds: 'world',
  biomes: '',
  conditions: '',
}

function emptyDrop(): DropEntry {
  return { type: 'item', value: '', chance: 1, minAmount: 1, maxAmount: 1 }
}

export function CreateDialog({
  kind,
  files,
  packIndex,
  suggestedPath,
  crucibleEnabled = false,
  onClose,
  onInsert,
}: CreateDialogProps) {
  const category = CATEGORY_FOR_KIND[kind]
  const choices = preferredFiles(kind, files)
  const suggestedInCategory = choices.some((f) => f.path === suggestedPath)
  const initialExisting =
    (suggestedInCategory ? suggestedPath : '') || choices[0]?.path || ''
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>(
    initialExisting ? 'existing' : 'new',
  )
  const [targetPath, setTargetPath] = useState(initialExisting)
  const [mob, setMob] = useState(emptyMob)
  const [optionSearch, setOptionSearch] = useState('')
  const [showAllOptions, setShowAllOptions] = useState(false)
  const [item, setItem] = useState(emptyItem)
  const [skill, setSkill] = useState(emptySkill)
  const [droptable, setDroptable] = useState(emptyDroptable)
  const [spawn, setSpawn] = useState(emptySpawn)
  const [newFileName, setNewFileName] = useState(() =>
    defaultYamlFileNameFromId(emptyMob.id, kind),
  )
  const [newFileNameTouched, setNewFileNameTouched] = useState(false)
  // Skill line builder state — tracks which textarea + line index is being built
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderContext, setBuilderContext] = useState<{ source: 'mob' | 'skill'; lineIndex: number; value: string } | null>(null)
  const skillsTextareaRef = useRef<HTMLTextAreaElement>(null)

  const yaml = useMemo(() => {
    if (kind === 'mob') return generateMobYaml(mob)
    if (kind === 'item') return generateItemYaml(item)
    if (kind === 'skill') return generateSkillYaml(skill)
    if (kind === 'droptable') return generateDroptableYaml(droptable)
    return generateRandomSpawnYaml(spawn)
  }, [kind, mob, item, skill, droptable, spawn])

  const availableMobOptions = useMemo(() => {
    const q = optionSearch.trim().toLowerCase()
    return MOB_OPTIONS.filter((opt) => {
      if (Object.prototype.hasOwnProperty.call(mob.options, opt.name)) return false
      if (!q) return true
      return (
        opt.name.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q)
      )
    })
  }, [mob.options, optionSearch])

  const showOptionResults = showAllOptions || optionSearch.trim().length > 0
  const displayedMobOptions =
    showAllOptions && !optionSearch.trim()
      ? availableMobOptions
      : availableMobOptions.slice(0, 12)

  const createFolder = useMemo(
    () => resolveCreateFolder(category, files, suggestedPath || initialExisting),
    [category, files, suggestedPath, initialExisting],
  )

  const resolvedNewPath = useMemo(
    () => joinPath(createFolder, sanitizeYamlFileName(newFileName)),
    [createFolder, newFileName],
  )

  const effectiveTargetPath = targetMode === 'new' ? resolvedNewPath : targetPath

  const newPathAlreadyExists = useMemo(
    () =>
      files.some(
        (f) => f.path.replace(/\\/g, '/') === resolvedNewPath.replace(/\\/g, '/'),
      ),
    [files, resolvedNewPath],
  )

  function syncNewFileNameFromId(nextId: string) {
    if (newFileNameTouched) return
    setNewFileName(defaultYamlFileNameFromId(nextId, kind))
  }

  function updateDrop(index: number, patch: Partial<DropEntry>) {
    setDroptable((prev) => {
      const next = [...prev.drops]
      next[index] = { ...next[index]!, ...patch }
      return { ...prev, drops: next }
    })
  }

  function removeDrop(index: number) {
    setDroptable((prev) => ({
      ...prev,
      drops: prev.drops.filter((_, i) => i !== index),
    }))
  }

  function openBuilder(source: 'mob' | 'skill') {
    syncBuilderLine(source, true)
    setBuilderOpen(true)
  }

  function syncBuilderLine(source: 'mob' | 'skill', forceOpen = false) {
    if (!forceOpen && (!builderOpen || builderContext?.source !== source)) return
    const ta = skillsTextareaRef.current
    const text = source === 'mob' ? mob.skills : skill.skills
    let lineIndex = builderContext?.lineIndex ?? 0
    if (ta) {
      const before = text.slice(0, ta.selectionStart)
      lineIndex = before.split('\n').length - 1
    }
    const lines = text.split('\n')
    setBuilderContext({ source, lineIndex, value: lines[lineIndex] ?? '' })
  }

  function confirmBuilder(newLine: string) {
    if (!builderContext) return
    const { source, lineIndex } = builderContext
    const current = source === 'mob' ? mob.skills : skill.skills
    const lines = current.split('\n')
    lines[lineIndex] = newLine
    const next = lines.join('\n')
    if (source === 'mob') setMob({ ...mob, skills: next })
    else setSkill({ ...skill, skills: next })
    setBuilderOpen(false)
    setBuilderContext(null)
  }

  function applyPresetPack(preset: SkillPreset) {
    if (builderContext?.source === 'skill') {
      setSkill((s) => {
        const lines = s.skills.split('\n')
        const idx = builderContext.lineIndex
        lines[idx] = preset.mainLine
        return {
          ...s,
          id: s.id.trim() ? s.id : preset.castSkillId,
          skills: lines.join('\n'),
        }
      })
    } else if (builderContext?.source === 'mob') {
      const ref = mobSkillReference(preset)
      setMob((m) => {
        const current = m.skills.trim()
        return { ...m, skills: current ? `${current}\n${ref}` : ref }
      })
    }
  }

  return (
    <DialogShell size="lg" className="dialog-create" labelledBy="create-title" onClose={onClose}>
      <DialogHeader
        title={TITLE_FOR_KIND[kind]}
        titleId="create-title"
        onClose={onClose}
        lead="Fill in the fields, then add to an existing YAML file or create a new one in this folder. Save afterwards to write the file."
      />

        {kind === 'mob' && (
          <DialogBody className="dialog-create-body">
            <DialogPanel title="Identity">
              <div className="dialog-fields">
                <label>
                  ID
                  <input
                    value={mob.id}
                    onChange={(e) => {
                      const id = e.target.value
                      setMob({ ...mob, id })
                      syncNewFileNameFromId(id)
                    }}
                  />
                </label>
                <label>
                  Type
                  <input value={mob.type} onChange={(e) => setMob({ ...mob, type: e.target.value })} placeholder="ZOMBIE" />
                </label>
                <ColorTextField
                  label="Display name"
                  value={mob.display}
                  onChange={(display) => setMob({ ...mob, display })}
                />
                <label>
                  Health
                  <input
                    type="number"
                    value={mob.health}
                    onChange={(e) => setMob({ ...mob, health: Number(e.target.value) || 1 })}
                  />
                </label>
                <label>
                  Damage
                  <input
                    type="number"
                    value={mob.damage}
                    onChange={(e) => setMob({ ...mob, damage: Number(e.target.value) || 1 })}
                  />
                </label>
              
                <label>
                  Faction
                  <input
                    value={mob.faction}
                    onChange={(e) => setMob({ ...mob, faction: e.target.value })}
                    placeholder="optional"
                  />
                </label>
                <label>
                  Armor
                  <input
                    type="number"
                    value={mob.armor}
                    onChange={(e) => {
                      const raw = e.target.value
                      setMob({ ...mob, armor: raw === '' ? '' : Number(raw) })
                    }}
                    placeholder="optional"
                  />
                </label>
              </div>
            </DialogPanel>

            <DialogPanel title="Skills" className="dialog-panel-skills">
              <div className="dialog-panel-toolbar">
                <button
                  type="button"
                  className={`slb-open-btn${builderOpen && builderContext?.source === 'mob' ? ' active' : ''}`}
                  onClick={() => (builderOpen && builderContext?.source === 'mob' ? setBuilderOpen(false) : openBuilder('mob'))}
                  title="Open skill line builder"
                >
                  {builderOpen && builderContext?.source === 'mob' ? 'Hide builder' : 'Build line'}
                </button>
              </div>
              <p className="dialog-note">One skill line per row. Use Build line for a step-by-step mechanic, targeter, and trigger.</p>
              <textarea
                ref={skillsTextareaRef}
                rows={4}
                value={mob.skills}
                onChange={(e) => setMob({ ...mob, skills: e.target.value })}
                onSelect={() => syncBuilderLine('mob')}
                onKeyUp={() => syncBuilderLine('mob')}
                onClick={() => syncBuilderLine('mob')}
                placeholder="skill{s=MY_SKILL} @target ~onAttack"
              />
              {builderOpen && builderContext?.source === 'mob' && (
                <SkillLineBuilder
                  key={builderContext.lineIndex}
                  value={builderContext.value}
                  onConfirm={confirmBuilder}
                  onClose={() => setBuilderOpen(false)}
                  crucibleEnabled={crucibleEnabled}
                  onApplyPresetPack={applyPresetPack}
                />
              )}
            </DialogPanel>

            <DialogPanel title="Drops">
              <p className="dialog-note">Drop table IDs or inline drops, one per row.</p>
              <datalist id="droptable-ids">
                {packIndex.droptableIds.map((id) => <option key={id} value={id} />)}
              </datalist>
              <textarea
                rows={2}
                value={mob.drops}
                onChange={(e) => setMob({ ...mob, drops: e.target.value })}
                placeholder="MY_DROP_TABLE"
              />
            </DialogPanel>

            
            <DialogPanel title="Options">
              <p className="dialog-note">
                Search or show all available options. Only options you set are written.
              </p>
              <div className="mob-option-picker">
                <div className="mob-option-search-row">
                  <input
                    type="search"
                    value={optionSearch}
                    onChange={(e) => setOptionSearch(e.target.value)}
                    placeholder="Search options…"
                    aria-label="Search mob options"
                  />
                  <button
                    type="button"
                    className={`mob-option-show-all${showAllOptions ? ' active' : ''}`}
                    onClick={() => setShowAllOptions((open) => !open)}
                    aria-pressed={showAllOptions}
                  >
                    {showAllOptions ? 'Hide list' : 'Show all'}
                  </button>
                </div>
                {showOptionResults && (
                  <ul className="mob-option-results">
                    {displayedMobOptions.length === 0 ? (
                      <li className="mob-option-empty">
                        {optionSearch.trim()
                          ? 'No matching options.'
                          : 'All listed options are already added.'}
                      </li>
                    ) : (
                      displayedMobOptions.map((opt) => (
                        <li key={opt.name}>
                          <button
                            type="button"
                            onClick={() => {
                              const def =
                                opt.type === 'boolean'
                                  ? opt.default === 'true'
                                  : opt.type === 'number'
                                    ? Number(opt.default ?? 0)
                                    : (opt.default ?? '')
                              setMob({ ...mob, options: { ...mob.options, [opt.name]: def } })
                              setOptionSearch('')
                            }}
                          >
                            <span className="mob-option-name">{opt.name}</span>
                            <span className="mob-option-desc">{opt.description}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <div className="mob-option-rows">
                {Object.keys(mob.options).map((name) => {
                  const entry = mobOptionByName(name)
                  const value = mob.options[name]
                  return (
                    <div key={name} className="mob-option-row">
                      <span className="mob-option-row-name" title={entry?.description}>
                        {name}
                      </span>
                      {entry?.type === 'boolean' ? (
                        <Switch
                          checked={value === true || value === 'true'}
                          onChange={(next) =>
                            setMob({ ...mob, options: { ...mob.options, [name]: next } })
                          }
                          aria-label={name}
                          size="sm"
                        />
                      ) : entry?.type === 'enum' && entry.values ? (
                        <select
                          value={String(value)}
                          onChange={(e) =>
                            setMob({ ...mob, options: { ...mob.options, [name]: e.target.value } })
                          }
                          aria-label={name}
                        >
                          {entry.values.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={entry?.type === 'number' ? 'number' : 'text'}
                          value={String(value ?? '')}
                          onChange={(e) => {
                            const raw = e.target.value
                            const next =
                              entry?.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw
                            setMob({ ...mob, options: { ...mob.options, [name]: next } })
                          }}
                          aria-label={name}
                        />
                      )}
                      <RemoveButton
                        aria-label={`Remove ${name}`}
                        onClick={() => {
                          const next = { ...mob.options }
                          delete next[name]
                          setMob({ ...mob, options: next })
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </DialogPanel>

            <DialogPanel title="AI selectors">
              <p className="dialog-note">
                One selector per line. Start with clear when replacing vanilla AI.
              </p>
              <label className="wide">
                AIGoalSelectors
                <textarea
                  rows={3}
                  value={mob.aiGoalSelectors}
                  onChange={(e) => setMob({ ...mob, aiGoalSelectors: e.target.value })}
                  placeholder={'clear\nmeleeattack\nrandomstroll'}
                />
              </label>
              <label className="wide">
                AITargetSelectors
                <textarea
                  rows={3}
                  value={mob.aiTargetSelectors}
                  onChange={(e) => setMob({ ...mob, aiTargetSelectors: e.target.value })}
                  placeholder={'clear\nplayers'}
                />
              </label>
            </DialogPanel>


            <DialogPanel title="Equipment">
              <p className="dialog-note">MythicMobs item IDs or vanilla material names.</p>
              <datalist id="item-ids">
                {packIndex.itemIds.map((id) => <option key={id} value={id} />)}
              </datalist>
              <div className="equip-body">
                <div className="equip-grid">
                  {EQUIPMENT_SLOT_META.map(({ slot, icon, label }) => (
                    <label key={slot} className="equip-slot">
                      <span className="equip-slot-label">
                        <span className="equip-slot-icon">{icon}</span>
                        {label}
                      </span>
                      <input
                        list="item-ids"
                        value={mob.equipment[slot] ?? ''}
                        onChange={(e) =>
                          setMob({ ...mob, equipment: { ...mob.equipment, [slot]: e.target.value } })
                        }
                        placeholder="leave blank"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        {kind === 'item' && (
          <DialogBody className="dialog-create-body">
            <DialogPanel title="Identity">
              <div className="dialog-fields">
                <label>
                  ID
                  <input
                    value={item.id}
                    onChange={(e) => {
                      const id = e.target.value
                      setItem({ ...item, id })
                      syncNewFileNameFromId(id)
                    }}
                  />
                </label>
                <label>
                  Material
                  <input value={item.material} onChange={(e) => setItem({ ...item, material: e.target.value })} />
                </label>
                <ColorTextField
                  label="Display name"
                  value={item.display}
                  onChange={(display) => setItem({ ...item, display })}
                />
                <ColorTextField
                  label="Lore"
                  value={item.lore}
                  onChange={(lore) => setItem({ ...item, lore })}
                  multiline
                />
                <label>
                  Rarity
                  <input value={item.rarity} onChange={(e) => setItem({ ...item, rarity: e.target.value })} placeholder="COMMON" />
                </label>
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        {kind === 'skill' && (
          <DialogBody className="dialog-create-body">
            <DialogPanel title="Identity">
              <div className="dialog-fields">
                <label>
                  ID
                  <input
                    value={skill.id}
                    onChange={(e) => {
                      const id = e.target.value
                      setSkill({ ...skill, id })
                      syncNewFileNameFromId(id)
                    }}
                  />
                </label>
                <label>
                  Cooldown (seconds)
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={skill.cooldown}
                    onChange={(e) => setSkill({ ...skill, cooldown: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="wide">
                  Conditions <span className="field-hint">One condition per row, e.g. health&#123;h=&gt;50&#125; true</span>
                  <textarea
                    rows={3}
                    value={skill.conditions}
                    onChange={(e) => setSkill({ ...skill, conditions: e.target.value })}
                    placeholder="health{h=>50} true"
                  />
                </label>
              </div>
            </DialogPanel>

            <DialogPanel title="Skill lines" className="dialog-panel-skills">
              <div className="dialog-panel-toolbar">
                <button
                  type="button"
                  className={`slb-open-btn${builderOpen && builderContext?.source === 'skill' ? ' active' : ''}`}
                  onClick={() => (builderOpen && builderContext?.source === 'skill' ? setBuilderOpen(false) : openBuilder('skill'))}
                  title="Open skill line builder"
                >
                  {builderOpen && builderContext?.source === 'skill' ? 'Hide builder' : 'Build line'}
                </button>
              </div>
              <p className="dialog-note">One skill line per row. Use Build line for mechanic and targeter step by step.</p>
              <textarea
                ref={skillsTextareaRef}
                rows={5}
                value={skill.skills}
                onChange={(e) => setSkill({ ...skill, skills: e.target.value })}
                onSelect={() => syncBuilderLine('skill')}
                onKeyUp={() => syncBuilderLine('skill')}
                onClick={() => syncBuilderLine('skill')}
                placeholder="damage{amount=10} @NearestPlayer{r=10}"
              />
              {builderOpen && builderContext?.source === 'skill' && (
                <SkillLineBuilder
                  key={builderContext.lineIndex}
                  value={builderContext.value}
                  onConfirm={confirmBuilder}
                  onClose={() => setBuilderOpen(false)}
                  hideTriggers
                  crucibleEnabled={crucibleEnabled}
                  onApplyPresetPack={applyPresetPack}
                />
              )}
            </DialogPanel>
          </DialogBody>
        )}

        {kind === 'droptable' && (
          <DialogBody className="dialog-create-body">
            <DialogPanel title="Drop table">
              <div className="dialog-fields">
                <label className="wide">
                  ID
                  <input
                    value={droptable.id}
                    onChange={(e) => {
                      const id = e.target.value
                      setDroptable({ ...droptable, id })
                      syncNewFileNameFromId(id)
                    }}
                  />
                </label>
              </div>
              <datalist id="dt-item-ids">
                {packIndex.itemIds.map((id) => <option key={id} value={id} />)}
              </datalist>
              <div className="wide drop-entries">
                <span className="field-label">Drop entries</span>
                {droptable.drops.map((drop, i) => (
                  <div key={i} className="drop-row">
                    <select
                      value={drop.type}
                      onChange={(e) => updateDrop(i, { type: e.target.value as DropEntry['type'] })}
                      aria-label="Drop type"
                    >
                      <option value="item">Item (MythicMobs)</option>
                      <option value="mythicitem">MythicMobs item</option>
                      <option value="exp">Experience</option>
                      <option value="money">Money (Vault)</option>
                      <option value="command">Command</option>
                      <option value="droptable">Drop table</option>
                    </select>
                    <input
                      list={drop.type === 'item' || drop.type === 'mythicitem' ? 'dt-item-ids' : undefined}
                      value={drop.value}
                      onChange={(e) => updateDrop(i, { value: e.target.value })}
                      placeholder={drop.type === 'command' ? 'say hi' : drop.type === 'exp' ? '50' : 'ITEM_ID'}
                      aria-label="Drop value"
                    />
                    {drop.type !== 'command' && (
                      <>
                        <input
                          type="number"
                          min={1}
                          value={drop.minAmount}
                          onChange={(e) => updateDrop(i, { minAmount: Number(e.target.value) || 1 })}
                          aria-label="Min amount"
                          title="Min"
                        />
                        <span className="drop-sep">–</span>
                        <input
                          type="number"
                          min={1}
                          value={drop.maxAmount}
                          onChange={(e) => updateDrop(i, { maxAmount: Number(e.target.value) || 1 })}
                          aria-label="Max amount"
                          title="Max"
                        />
                      </>
                    )}
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={drop.chance}
                      onChange={(e) => updateDrop(i, { chance: Number(e.target.value) || 1 })}
                      aria-label="Chance"
                      title="Chance (0–1)"
                    />
                    <RemoveButton aria-label="Remove drop" onClick={() => removeDrop(i)} />
                  </div>
                ))}
                <button
                  type="button"
                  className="drop-add"
                  onClick={() => setDroptable((prev) => ({ ...prev, drops: [...prev.drops, emptyDrop()] }))}
                >
                  Add drop
                </button>
                <div className="attr-picker" style={{ marginTop: '0.5rem' }}>
                  <span className="field-label">MMO helpers</span>
                  {(
                    [
                      { id: 'gold_pouch', label: 'gold_pouch' },
                      { id: 'gold_coin', label: 'gold_coin' },
                      { id: 'note', label: 'note' },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className="chip"
                      onClick={() =>
                        setDroptable((prev) => ({
                          ...prev,
                          drops: [
                            ...prev.drops,
                            {
                              type: 'mythicitem',
                              value: chip.id,
                              chance: 1,
                              minAmount: 1,
                              maxAmount: 1,
                            },
                          ],
                        }))
                      }
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        {kind === 'randomspawn' && (
          <DialogBody className="dialog-create-body">
            <DialogPanel title="Spawn rule">
              <div className="dialog-fields">
                <label>
                  ID
                  <input
                    value={spawn.id}
                    onChange={(e) => {
                      const id = e.target.value
                      setSpawn({ ...spawn, id })
                      syncNewFileNameFromId(id)
                    }}
                  />
                </label>
                <label>
                  Action
                  <select value={spawn.action} onChange={(e) => setSpawn({ ...spawn, action: e.target.value as RandomSpawnGeneratorInput['action'] })}>
                    <option value="ADD">ADD (alongside vanilla spawns)</option>
                    <option value="REPLACE">REPLACE (replace vanilla spawns)</option>
                    <option value="DENY">DENY (prevent vanilla spawns)</option>
                  </select>
                </label>
                <label className="wide">
                  Mob type
                  <datalist id="spawn-mob-ids">
                    {packIndex.mobIds.map((id) => <option key={id} value={id} />)}
                  </datalist>
                  <input
                    list="spawn-mob-ids"
                    value={spawn.mobType}
                    onChange={(e) => setSpawn({ ...spawn, mobType: e.target.value })}
                    placeholder="MY_MOB"
                  />
                </label>
                <label>
                  Level <span className="field-hint">e.g. 1-5</span>
                  <input value={spawn.level} onChange={(e) => setSpawn({ ...spawn, level: e.target.value })} placeholder="1-5" />
                </label>
                <label>
                  Chance
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={spawn.chance}
                    onChange={(e) => setSpawn({ ...spawn, chance: Number(e.target.value) || 0.1 })}
                  />
                </label>
                <label className="wide">
                  Worlds <span className="field-hint">Comma-separated</span>
                  <input value={spawn.worlds} onChange={(e) => setSpawn({ ...spawn, worlds: e.target.value })} placeholder="world" />
                </label>
                <label className="wide">
                  Biomes <span className="field-hint">Comma-separated, leave empty for all</span>
                  <input value={spawn.biomes} onChange={(e) => setSpawn({ ...spawn, biomes: e.target.value })} placeholder="FOREST, PLAINS" />
                </label>
                <label className="wide">
                  Conditions <span className="field-hint">One per row</span>
                  <textarea rows={3} value={spawn.conditions} onChange={(e) => setSpawn({ ...spawn, conditions: e.target.value })} />
                </label>
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        <DialogPanel title="Destination">
          <div className="dialog-destination">
            <div className="segmented-control" role="group" aria-label="Destination">
              <button
                type="button"
                className={targetMode === 'existing' ? 'seg-btn active' : 'seg-btn'}
                disabled={choices.length === 0}
                onClick={() => {
                  setTargetMode('existing')
                  if (!targetPath && choices[0]) setTargetPath(choices[0].path)
                }}
              >
                Existing file
              </button>
              <button
                type="button"
                className={targetMode === 'new' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setTargetMode('new')}
              >
                New file
              </button>
            </div>

            {targetMode === 'existing' ? (
              <label className="dialog-field">
                Add to file
                <select
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  disabled={choices.length === 0}
                >
                  {choices.length === 0 ? (
                    <option value="">No files in this folder yet</option>
                  ) : (
                    choices.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.path}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : (
              <label className="dialog-field">
                File name
                <input
                  value={newFileName}
                  onChange={(e) => {
                    setNewFileNameTouched(true)
                    setNewFileName(e.target.value)
                  }}
                  placeholder="skeletons.yml"
                  aria-label="New YAML file name"
                />
                <span className="dialog-note">
                  Creates {resolvedNewPath}
                  {newPathAlreadyExists
                    ? '. That path already exists. Pick another name, or use Existing file.'
                    : '.'}
                </span>
              </label>
            )}
          </div>
        </DialogPanel>

        <DialogPreviewBlock code={yaml} />

        <DialogFooter>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onInsert(effectiveTargetPath, yaml)}
            disabled={
              !effectiveTargetPath ||
              (targetMode === 'new' && newPathAlreadyExists) ||
              (targetMode === 'existing' && !targetPath)
            }
          >
            {targetMode === 'new' ? 'Create file' : 'Add to file'}
          </button>
        </DialogFooter>
    </DialogShell>
  )
}
