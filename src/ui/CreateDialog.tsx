import { useMemo, useRef, useState } from 'react'
import {
  generateDroptableYaml,
  generateItemYaml,
  generateMobYaml,
  generateRandomSpawnYaml,
  generateSkillYaml,
} from '../core/mythicmobs/generators'
import { mobSkillReference, presetCastLines, type SkillPreset } from '../data/mythicmobs/projectilePresets'
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
import { SkillLineBuilder } from './SkillLineBuilder'

const EQUIPMENT_SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND'] as const

const EQUIPMENT_SLOT_META: { slot: typeof EQUIPMENT_SLOTS[number]; icon: string; label: string }[] = [
  { slot: 'HEAD',    icon: '🪖', label: 'Head' },
  { slot: 'CHEST',  icon: '🧥', label: 'Chest' },
  { slot: 'LEGS',   icon: '👖', label: 'Legs' },
  { slot: 'FEET',   icon: '👟', label: 'Feet' },
  { slot: 'HAND',   icon: '⚔️', label: 'Main Hand' },
  { slot: 'OFFHAND',icon: '🛡️', label: 'Off Hand' },
]

type MythicCreateKind = Exclude<CreateKind, 'class' | 'mmocore-skill'>

interface CreateDialogProps {
  kind: MythicCreateKind
  files: FileRecord[]
  packIndex: PackIndex
  suggestedPath: string
  onClose: () => void
  onInsert: (targetPath: string, yaml: string) => void
}

const CATEGORY_FOR_KIND: Record<MythicCreateKind, string> = {
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
  const matched = files.filter((file) => file.category === category)
  return matched.length > 0 ? matched : files
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

function IdList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <datalist id="id-list">
      {ids.map((id) => (
        <option key={id} value={id} />
      ))}
    </datalist>
  )
}

export function CreateDialog({
  kind,
  files,
  packIndex,
  suggestedPath,
  onClose,
  onInsert,
}: CreateDialogProps) {
  const choices = preferredFiles(kind, files)
  const [targetPath, setTargetPath] = useState(suggestedPath || choices[0]?.path || '')
  const [mob, setMob] = useState(emptyMob)
  const [item, setItem] = useState(emptyItem)
  const [skill, setSkill] = useState(emptySkill)
  const [droptable, setDroptable] = useState(emptyDroptable)
  const [spawn, setSpawn] = useState(emptySpawn)
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
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg dialog-create"
        role="dialog"
        aria-labelledby="create-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="create-header">
          <h2 id="create-title">{TITLE_FOR_KIND[kind]}</h2>
          <p>Fill in the fields below, choose a target file, then add it. Save afterwards to write the file.</p>
        </header>

        {kind === 'mob' && (
          <div className="dialog-fields create-sections">
            <IdList ids={[]} />
            <section className="create-section">
              <h3 className="create-section-title">Identity</h3>
              <div className="create-section-body">
                <label>
                  ID
                  <input value={mob.id} onChange={(e) => setMob({ ...mob, id: e.target.value })} />
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
              </div>
            </section>

            <section className="create-section create-section-skills">
              <div className="create-section-head">
                <h3 className="create-section-title">Skills</h3>
                <button
                  type="button"
                  className={`slb-open-btn${builderOpen && builderContext?.source === 'mob' ? ' active' : ''}`}
                  onClick={() => (builderOpen && builderContext?.source === 'mob' ? setBuilderOpen(false) : openBuilder('mob'))}
                  title="Open skill line builder"
                >
                  {builderOpen && builderContext?.source === 'mob' ? 'Hide builder' : 'Build line'}
                </button>
              </div>
              <p className="create-section-hint">One skill line per row. Use Build line for a step-by-step mechanic, targeter, and trigger.</p>
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
                  onApplyPresetPack={applyPresetPack}
                />
              )}
            </section>

            <section className="create-section">
              <h3 className="create-section-title">Drops</h3>
              <p className="create-section-hint">Drop table IDs or inline drops, one per row.</p>
              <datalist id="droptable-ids">
                {packIndex.droptableIds.map((id) => <option key={id} value={id} />)}
              </datalist>
              <textarea
                rows={2}
                value={mob.drops}
                onChange={(e) => setMob({ ...mob, drops: e.target.value })}
                placeholder="MY_DROP_TABLE"
              />
            </section>

            <section className="create-section">
              <h3 className="create-section-title">Equipment</h3>
              <p className="create-section-hint">MythicMobs item IDs or vanilla material names.</p>
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
            </section>
          </div>
        )}

        {kind === 'item' && (
          <div className="dialog-fields create-sections">
            <section className="create-section">
              <h3 className="create-section-title">Identity</h3>
              <div className="create-section-body">
                <label>
                  ID
                  <input value={item.id} onChange={(e) => setItem({ ...item, id: e.target.value })} />
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
            </section>
          </div>
        )}

        {kind === 'skill' && (
          <div className="dialog-fields create-sections">
            <section className="create-section">
              <h3 className="create-section-title">Identity</h3>
              <div className="create-section-body">
                <label>
                  ID
                  <input value={skill.id} onChange={(e) => setSkill({ ...skill, id: e.target.value })} />
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
            </section>

            <section className="create-section create-section-skills">
              <div className="create-section-head">
                <h3 className="create-section-title">Skill lines</h3>
                <button
                  type="button"
                  className={`slb-open-btn${builderOpen && builderContext?.source === 'skill' ? ' active' : ''}`}
                  onClick={() => (builderOpen && builderContext?.source === 'skill' ? setBuilderOpen(false) : openBuilder('skill'))}
                  title="Open skill line builder"
                >
                  {builderOpen && builderContext?.source === 'skill' ? 'Hide builder' : 'Build line'}
                </button>
              </div>
              <p className="create-section-hint">One skill line per row. Use Build line for mechanic and targeter step by step.</p>
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
                  onApplyPresetPack={applyPresetPack}
                />
              )}
            </section>
          </div>
        )}

        {kind === 'droptable' && (
          <div className="dialog-fields create-sections">
            <section className="create-section">
              <h3 className="create-section-title">Drop table</h3>
              <div className="create-section-body">
                <label className="wide">
                  ID
                  <input value={droptable.id} onChange={(e) => setDroptable({ ...droptable, id: e.target.value })} />
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
                    <button type="button" className="drop-remove" onClick={() => removeDrop(i)} aria-label="Remove drop">
                      ×
                    </button>
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
            </section>
          </div>
        )}

        {kind === 'randomspawn' && (
          <div className="dialog-fields create-sections">
            <section className="create-section">
              <h3 className="create-section-title">Spawn rule</h3>
              <div className="create-section-body">
                <label>
                  ID
                  <input value={spawn.id} onChange={(e) => setSpawn({ ...spawn, id: e.target.value })} />
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
            </section>
          </div>
        )}

        <footer className="create-footer">
          <label className="create-target">
            Add to file
            <select value={targetPath} onChange={(e) => setTargetPath(e.target.value)}>
              {choices.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.path}
                </option>
              ))}
            </select>
          </label>

          <details className="create-preview-details">
            <summary>YAML preview</summary>
            <pre className="dialog-preview">{yaml}</pre>
          </details>

          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => onInsert(targetPath, yaml)}
              disabled={!targetPath}
            >
              Add to file
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
