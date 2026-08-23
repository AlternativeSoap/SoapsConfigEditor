import { useCallback, useEffect, useMemo, useState } from 'react'
import { RemoveButton } from '../RemoveButton'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'
import {
  findQuestsYmlPath,
} from '../../core/soapsquest/classify'
import {
  generateQuestYaml,
  mergeIntoQuestsYml,
  replaceQuestInQuestsYml,
  type QuestGeneratorInput,
  type QuestItemRewardInput,
  type QuestObjectiveInput,
} from '../../core/soapsquest/generators'
import { parseQuestFromFile } from '../../core/soapsquest/parseQuest'
import {
  extractDifficultyIds,
  extractQuestIds,
  extractTierIds,
} from '../../core/soapsquest/questIds'
import { BIOMES, ENTITY_TYPES } from '../../core/mythicmobs/attrValueCompletions'
import { searchMaterials } from '../../data/minecraft/materials'
import {
  DEFAULT_DIFFICULTY_IDS,
  DEFAULT_TIER_IDS,
} from '../../data/soapsquest/defaults'
import {
  defaultObjectiveForType,
  OBJECTIVE_GROUPS,
  objectiveTypeInfo,
  type ObjectiveFieldMode,
} from '../../data/soapsquest/objectiveTypes'
import type { FileRecord } from '../../types'
import { AutocompleteField } from '../AutocompleteField'
import { Switch } from '../Switch'

const STEPS = ['Identity', 'Objectives', 'Rewards'] as const

const STEP_HINTS = [
  'Name the quest and choose its paper, tier, and difficulty.',
  'Add one or more objectives. Fields change based on the objective type.',
  'Set XP, money, and sigil rewards. At least one reward must be greater than zero.',
]

const EQUIP_SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND'] as const

function emptyObjective(): QuestObjectiveInput {
  return defaultObjectiveForType('kill')
}

function emptyQuest(): QuestGeneratorInput {
  return {
    id: 'new_quest',
    display: '<#55FF55>New Quest',
    material: 'PAPER',
    tier: 'common',
    difficulty: 'easy',
    sequential: false,
    lockToPlayer: false,
    objectives: [emptyObjective()],
    xp: 100,
    money: 50,
    sigils: 0,
    itemRewards: [],
  }
}

function emptyItemReward(): QuestItemRewardInput {
  return { material: 'DIAMOND', amount: 1, chance: 100 }
}

function searchEntities(query: string, limit = 12): string[] {
  const q = query.trim().toUpperCase().replace(/\s+/g, '_')
  if (!q) return ENTITY_TYPES.slice(0, limit)
  const starts: string[] = []
  const contains: string[] = []
  for (const entity of ENTITY_TYPES) {
    if (entity.startsWith(q)) starts.push(entity)
    else if (entity.includes(q)) contains.push(entity)
  }
  return [...starts, ...contains].slice(0, limit)
}

function searchBiomes(query: string, limit = 12): string[] {
  const q = query.trim().toUpperCase().replace(/\s+/g, '_')
  if (!q) return BIOMES.slice(0, limit)
  const starts: string[] = []
  const contains: string[] = []
  for (const biome of BIOMES) {
    if (biome.startsWith(q)) starts.push(biome)
    else if (biome.includes(q)) contains.push(biome)
  }
  return [...starts, ...contains].slice(0, limit)
}

function validateObjective(obj: QuestObjectiveInput, index: number): string | null {
  const info = objectiveTypeInfo(obj.type)
  const mode: ObjectiveFieldMode = info?.mode ?? 'target_amount'
  const n = index + 1

  if (mode === 'amount_only') {
    if (!Number.isFinite(obj.amount) || obj.amount < 1) {
      return `Objective ${n} amount must be at least 1.`
    }
    return null
  }
  if (mode === 'command') {
    if (!(obj.command ?? '').trim()) return `Objective ${n} needs a command.`
    if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
    return null
  }
  if (mode === 'placeholder') {
    if (!(obj.placeholder ?? '').trim()) return `Objective ${n} needs a placeholder name.`
    if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
    return null
  }
  if (mode === 'level_only') {
    if (!Number.isFinite(obj.level) || (obj.level ?? 0) < 1) {
      return `Objective ${n} level must be at least 1.`
    }
    return null
  }
  if (mode === 'vehicle_amount') {
    if (!(obj.vehicle ?? '').trim()) return `Objective ${n} needs a vehicle type.`
    if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
    return null
  }
  if (mode === 'text_amount') {
    if (!(obj.text ?? '').trim()) return `Objective ${n} needs chat text.`
    if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
    return null
  }
  if (mode === 'equip') {
    if (!obj.target.trim()) return `Objective ${n} needs an item material.`
    if (!(obj.slot ?? '').trim()) return `Objective ${n} needs an equipment slot.`
    if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
    return null
  }
  if (mode === 'deliver_npc') {
    if (!obj.target.trim()) return `Objective ${n} needs an NPC id.`
    if (!(obj.item ?? '').trim()) return `Objective ${n} needs a delivery item (MATERIAL:amount).`
    if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
    return null
  }
  if (mode === 'land_level') {
    if (!obj.target.trim()) return `Objective ${n} needs a land name.`
    if (!Number.isFinite(obj.level) || (obj.level ?? 0) < 1) {
      return `Objective ${n} level must be at least 1.`
    }
    return null
  }
  if (!obj.target.trim()) return `Objective ${n} needs a target.`
  if (obj.amount < 1) return `Objective ${n} amount must be at least 1.`
  return null
}

export interface QuestWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface QuestWizardDialogProps {
  files: FileRecord[]
  /** When set, wizard loads and replaces this quest id. */
  editingQuestId?: string | null
  onClose: () => void
  onApply: (output: QuestWizardOutput) => void
}

const QUEST_ID_RE = /^[a-z][a-z0-9_]*$/

export function QuestWizardDialog({
  files,
  editingQuestId = null,
  onClose,
  onApply,
}: QuestWizardDialogProps) {
  const isEdit = Boolean(editingQuestId)
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<QuestGeneratorInput>(emptyQuest)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(!isEdit)

  const materialSearch = useCallback((q: string, limit?: number) => searchMaterials(q, limit), [])

  const questsPath = useMemo(() => findQuestsYmlPath(files), [files])
  const existingQuestsFile = useMemo(
    () => files.find((f) => f.path.replace(/\\/g, '/') === questsPath),
    [files, questsPath],
  )

  const existingQuestIds = useMemo(() => {
    if (!existingQuestsFile) return []
    return extractQuestIds(existingQuestsFile.content)
  }, [existingQuestsFile])

  const tierIds = useMemo(() => {
    const tiersFile = files.find((f) => {
      const n = f.path.replace(/\\/g, '/').toLowerCase()
      return n === 'tiers.yml' || n.endsWith('/tiers.yml')
    })
    if (tiersFile) {
      const ids = extractTierIds(tiersFile.content)
      if (ids.length > 0) return ids
    }
    return [...DEFAULT_TIER_IDS]
  }, [files])

  const difficultyIds = useMemo(() => {
    const diffFile = files.find((f) => {
      const n = f.path.replace(/\\/g, '/').toLowerCase()
      return n === 'difficulties.yml' || n.endsWith('/difficulties.yml')
    })
    if (diffFile) {
      const ids = extractDifficultyIds(diffFile.content)
      if (ids.length > 0) return ids
    }
    return [...DEFAULT_DIFFICULTY_IDS]
  }, [files])

  useEffect(() => {
    if (!editingQuestId || !existingQuestsFile) {
      if (!isEdit) setLoaded(true)
      return
    }
    const parsed = parseQuestFromFile(existingQuestsFile.content, editingQuestId)
    if (!parsed) {
      setError(`Could not load quest ${editingQuestId} from quests.yml.`)
      setLoaded(true)
      return
    }
    setInput(parsed)
    setError('')
    setLoaded(true)
  }, [editingQuestId, existingQuestsFile, isEdit])

  const yaml = useMemo(() => generateQuestYaml(input), [input])

  function patch(partial: Partial<QuestGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function updateObjective(index: number, partial: Partial<QuestObjectiveInput>): void {
    setInput((prev) => {
      const objectives = prev.objectives.map((obj, i) =>
        i === index ? { ...obj, ...partial } : obj,
      )
      return { ...prev, objectives }
    })
    setError('')
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      const id = input.id.trim()
      if (!id) return 'Quest id is required.'
      if (!QUEST_ID_RE.test(id)) {
        return 'Quest id must be lowercase letters, numbers, and underscores, and start with a letter.'
      }
      if (
        existingQuestIds.some(
          (q) =>
            q.toLowerCase() === id.toLowerCase() &&
            (!editingQuestId || q.toLowerCase() !== editingQuestId.toLowerCase()),
        )
      ) {
        return `Quest ${id} already exists in quests.yml. Choose a different id.`
      }
      if (!input.display.trim()) return 'Display name is required.'
      if (!input.material.trim()) return 'Material is required.'
    }
    if (current === 1) {
      if (input.objectives.length === 0) {
        return 'Add at least one objective.'
      }
      for (let i = 0; i < input.objectives.length; i += 1) {
        const err = validateObjective(input.objectives[i], i)
        if (err) return err
      }
    }
    if (current === 2) {
      const hasCurrency = input.xp > 0 || input.money > 0 || input.sigils > 0
      const hasItems = input.itemRewards.some((item) => item.material.trim())
      if (!hasCurrency && !hasItems) {
        return 'Set at least one reward: XP, money, sigils, or an item.'
      }
      for (let i = 0; i < input.itemRewards.length; i += 1) {
        const item = input.itemRewards[i]
        if (!item.material.trim()) continue
        if (!Number.isFinite(item.amount) || item.amount < 1) {
          return `Item reward ${i + 1} amount must be at least 1.`
        }
      }
    }
    return null
  }

  function goNext(): void {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function submit(): void {
    for (let i = 0; i < STEPS.length; i += 1) {
      const err = validateStep(i)
      if (err) {
        setStep(i)
        setError(err)
        return
      }
    }
    const questYaml = generateQuestYaml(input)
    const content = existingQuestsFile?.content ?? ''
    const result = isEdit && editingQuestId
      ? replaceQuestInQuestsYml(content, editingQuestId, questYaml, input.id.trim())
      : mergeIntoQuestsYml(existingQuestsFile?.content ?? null, questYaml, input.id.trim())

    if (!result.ok) {
      setError(result.error)
      return
    }
    onApply({
      files: [
        {
          path: questsPath,
          content: result.content,
          mode: 'create',
        },
      ],
    })
  }

  if (!loaded) {
    return null
  }

  function renderObjectiveFields(obj: QuestObjectiveInput, index: number) {
    const info = objectiveTypeInfo(obj.type)
    const mode = info?.mode ?? 'target_amount'
    const targetKind = info?.targetKind

    if (mode === 'command') {
      return (
        <>
          <label className="wz-field">
            Command
            <input
              value={obj.command ?? ''}
              onChange={(e) => updateObjective(index, { command: e.target.value.trim() })}
              placeholder="help"
            />
          </label>
          <label className="wz-field">
            Amount
            <input
              type="number"
              min={1}
              value={obj.amount}
              onChange={(e) =>
                updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'placeholder') {
      return (
        <>
          <label className="wz-field">
            Placeholder
            <input
              value={obj.placeholder ?? ''}
              onChange={(e) => updateObjective(index, { placeholder: e.target.value.trim() })}
              placeholder="player_level"
            />
          </label>
          <label className="wz-field">
            Target value
            <input
              type="number"
              min={1}
              value={obj.amount}
              onChange={(e) =>
                updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'level_only') {
      return (
        <label className="wz-field">
          Level
          <input
            type="number"
            min={1}
            value={obj.level ?? 1}
            onChange={(e) =>
              updateObjective(index, { level: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
      )
    }

    if (mode === 'vehicle_amount') {
      return (
        <>
          <label className="wz-field">
            Vehicle
            <input
              value={obj.vehicle ?? 'ANY'}
              onChange={(e) => updateObjective(index, { vehicle: e.target.value.trim().toUpperCase() })}
              placeholder="ANY"
            />
          </label>
          <label className="wz-field">
            Blocks
            <input
              type="number"
              min={1}
              value={obj.amount}
              onChange={(e) =>
                updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'text_amount') {
      return (
        <>
          <label className="wz-field">
            Chat text
            <input
              value={obj.text ?? ''}
              onChange={(e) => updateObjective(index, { text: e.target.value })}
              placeholder="hello"
            />
          </label>
          <label className="wz-field">
            Amount
            <input
              type="number"
              min={1}
              value={obj.amount}
              onChange={(e) =>
                updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'equip') {
      return (
        <>
          <AutocompleteField
            label="Item material"
            value={obj.target}
            onChange={(target) => updateObjective(index, { target })}
            search={materialSearch}
            placeholder="DIAMOND_CHESTPLATE"
          />
          <label className="wz-field">
            Slot
            <select
              value={obj.slot ?? 'CHEST'}
              onChange={(e) => updateObjective(index, { slot: e.target.value })}
            >
              {EQUIP_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <label className="wz-field">
            Amount
            <input
              type="number"
              min={1}
              value={obj.amount}
              onChange={(e) =>
                updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'deliver_npc') {
      return (
        <>
          <label className="wz-field">
            NPC id
            <input
              value={obj.target}
              onChange={(e) => updateObjective(index, { target: e.target.value.trim() })}
              placeholder="1"
            />
          </label>
          <AutocompleteField
            label="Delivery item"
            value={(obj.item ?? '').split(':')[0] ?? ''}
            onChange={(mat) => {
              const amountPart = (obj.item ?? '').includes(':')
                ? (obj.item ?? '').split(':')[1]
                : '16'
              updateObjective(index, { item: `${mat}:${amountPart}` })
            }}
            search={materialSearch}
            placeholder="WHEAT"
          />
          <label className="wz-field">
            Item amount
            <input
              type="number"
              min={1}
              value={(obj.item ?? '').includes(':') ? Number((obj.item ?? '').split(':')[1]) || 1 : 16}
              onChange={(e) => {
                const mat = (obj.item ?? 'WHEAT:16').split(':')[0] || 'WHEAT'
                updateObjective(index, {
                  item: `${mat}:${Math.max(1, Number(e.target.value) || 1)}`,
                })
              }}
            />
          </label>
          <label className="wz-field">
            Deliveries
            <input
              type="number"
              min={1}
              value={obj.amount}
              onChange={(e) =>
                updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'land_level') {
      return (
        <>
          <label className="wz-field">
            Land name
            <input
              value={obj.target}
              onChange={(e) => updateObjective(index, { target: e.target.value.trim() })}
              placeholder="MyLand"
            />
          </label>
          <label className="wz-field">
            Target level
            <input
              type="number"
              min={1}
              value={obj.level ?? 1}
              onChange={(e) =>
                updateObjective(index, { level: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
        </>
      )
    }

    if (mode === 'amount_only') {
      return (
        <label className="wz-field">
          {info?.amountHint ?? 'Amount'}
          <input
            type="number"
            min={1}
            value={obj.amount}
            onChange={(e) =>
              updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
      )
    }

    const targetLabel =
      targetKind === 'entity'
        ? 'Entity'
        : targetKind === 'biome'
          ? 'Biome'
          : targetKind === 'region'
            ? 'Region'
            : targetKind === 'npc'
              ? 'NPC id'
              : targetKind === 'skill'
                ? 'Skill'
                : targetKind === 'world'
                  ? 'World'
                  : 'Target'

    const targetField =
      targetKind === 'material' ? (
        <AutocompleteField
          label={targetLabel}
          value={obj.target}
          onChange={(target) => updateObjective(index, { target })}
          search={materialSearch}
          placeholder={info?.targetHint ?? 'TARGET'}
        />
      ) : targetKind === 'entity' ? (
        <AutocompleteField
          label={targetLabel}
          value={obj.target}
          onChange={(target) => updateObjective(index, { target })}
          search={searchEntities}
          placeholder={info?.targetHint ?? 'ZOMBIE'}
        />
      ) : targetKind === 'biome' ? (
        <AutocompleteField
          label={targetLabel}
          value={obj.target}
          onChange={(target) => updateObjective(index, { target })}
          search={searchBiomes}
          placeholder={info?.targetHint ?? 'PLAINS'}
        />
      ) : (
        <label className="wz-field">
          {targetLabel}
          <input
            value={obj.target}
            onChange={(e) => updateObjective(index, { target: e.target.value })}
            placeholder={info?.targetHint ?? 'TARGET'}
          />
        </label>
      )

    return (
      <>
        {targetField}
        <label className="wz-field">
          {info?.amountHint ?? 'Amount'}
          <input
            type="number"
            min={1}
            value={obj.amount}
            onChange={(e) =>
              updateObjective(index, { amount: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
      </>
    )
  }

  return (
    <DialogShell size="xl" className="class-wizard" labelledBy="quest-wizard-title" onClose={onClose}>
      <DialogHeader
        title={isEdit ? 'Edit quest' : 'New quest'}
        titleId="quest-wizard-title"
        onClose={onClose}
        lead={STEP_HINTS[step]}
      />

        <nav className="wizard-steps" aria-label="Steps">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={
                i === step ? 'wizard-step active' : i < step ? 'wizard-step done' : 'wizard-step'
              }
              onClick={() => {
                if (i > step) {
                  const err = validateStep(step)
                  if (err) {
                    setError(err)
                    return
                  }
                }
                setError('')
                setStep(i)
              }}
            >
              <span className="wizard-step-num">{i + 1}</span>
              <span className="wizard-step-label">{label}</span>
            </button>
          ))}
        </nav>

        <DialogBody className="wizard-body">
          {step === 0 ? (
            <DialogPanel title="Identity">
              <div className="wz-grid-2">
                <label className="wz-field">
                  Quest id
                  <input
                    value={input.id}
                    onChange={(e) =>
                      patch({
                        id: e.target.value
                          .trim()
                          .toLowerCase()
                          .replace(/\s+/g, '_')
                          .replace(/[^a-z0-9_]/g, ''),
                      })
                    }
                    placeholder="zombie_slayer"
                  />
                </label>
                <AutocompleteField
                  label="Paper material"
                  value={input.material}
                  onChange={(material) => patch({ material })}
                  search={materialSearch}
                  placeholder="PAPER"
                />
              </div>
              <label className="wz-field">
                Display name
                <input
                  value={input.display}
                  onChange={(e) => patch({ display: e.target.value })}
                  placeholder="<#55FF55>Quest Name"
                />
              </label>
              <div className="wz-grid-2">
                <label className="wz-field">
                  Tier
                  <select
                    value={input.tier}
                    onChange={(e) => patch({ tier: e.target.value })}
                  >
                    {tierIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wz-field">
                  Difficulty
                  <select
                    value={input.difficulty}
                    onChange={(e) => patch({ difficulty: e.target.value })}
                  >
                    {difficultyIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="wz-toggle">
                <span className="wz-toggle-copy">
                  <span className="wz-toggle-title">Sequential</span>
                  <span className="wz-toggle-hint">
                    Objectives must be completed in order
                  </span>
                </span>
                <Switch
                  checked={input.sequential}
                  onChange={(next) => patch({ sequential: next })}
                  aria-label="Sequential"
                />
              </div>
              <div className="wz-toggle">
                <span className="wz-toggle-copy">
                  <span className="wz-toggle-title">Lock to player</span>
                  <span className="wz-toggle-hint">
                    Bind the paper to the first player who picks it up
                  </span>
                </span>
                <Switch
                  checked={input.lockToPlayer}
                  onChange={(next) => patch({ lockToPlayer: next })}
                  aria-label="Lock to player"
                />
              </div>
              <DialogPreviewBlock code={yaml} />
            </DialogPanel>
          ) : null}

          {step === 1 ? (
            <DialogPanel title="Objectives">
              {input.objectives.map((obj, index) => (
                <div key={index} className="objective-row" style={{ marginBottom: '1rem' }}>
                  <div className="wz-grid-2">
                    <label className="wz-field">
                      Type
                      <select
                        value={obj.type}
                        onChange={(e) => {
                          const type = e.target.value
                          setInput((prev) => ({
                            ...prev,
                            objectives: prev.objectives.map((o, i) =>
                              i === index ? defaultObjectiveForType(type) : o,
                            ),
                          }))
                          setError('')
                        }}
                      >
                        {OBJECTIVE_GROUPS.map((group) => (
                          <optgroup key={group.id} label={group.label}>
                            {group.types.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <div className="wz-field" style={{ justifyContent: 'flex-end' }}>
                      <RemoveButton
                        aria-label={`Remove objective ${index + 1}`}
                        disabled={input.objectives.length <= 1}
                        onClick={() =>
                          patch({
                            objectives: input.objectives.filter((_, i) => i !== index),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="wz-grid-2">{renderObjectiveFields(obj, index)}</div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patch({ objectives: [...input.objectives, emptyObjective()] })}
              >
                Add objective
              </button>
            </DialogPanel>
          ) : null}

          {step === 2 ? (
            <DialogPanel title="Rewards">
              <div className="wz-grid-2">
                <label className="wz-field">
                  XP
                  <input
                    type="number"
                    min={0}
                    value={input.xp}
                    onChange={(e) =>
                      patch({ xp: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </label>
                <label className="wz-field">
                  Money
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.money}
                    onChange={(e) =>
                      patch({ money: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </label>
                <label className="wz-field">
                  Sigils
                  <input
                    type="number"
                    min={0}
                    value={input.sigils}
                    onChange={(e) =>
                      patch({ sigils: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </label>
              </div>
              {input.itemRewards.length > 0 ? (
                <div style={{ marginTop: '1rem' }}>
                  {input.itemRewards.map((item, index) => (
                    <div key={index} className="objective-row" style={{ marginBottom: '0.75rem' }}>
                      <div className="wz-grid-2">
                        <AutocompleteField
                          label="Material"
                          value={item.material}
                          onChange={(material) => {
                            const itemRewards = input.itemRewards.map((row, i) =>
                              i === index ? { ...row, material } : row,
                            )
                            patch({ itemRewards })
                          }}
                          search={materialSearch}
                          placeholder="DIAMOND"
                        />
                        <div className="wz-field" style={{ justifyContent: 'flex-end' }}>
                          <RemoveButton
                            aria-label={`Remove item reward ${index + 1}`}
                            onClick={() =>
                              patch({
                                itemRewards: input.itemRewards.filter((_, i) => i !== index),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="wz-grid-2">
                        <label className="wz-field">
                          Amount
                          <input
                            type="number"
                            min={1}
                            value={item.amount}
                            onChange={(e) => {
                              const itemRewards = input.itemRewards.map((row, i) =>
                                i === index
                                  ? { ...row, amount: Math.max(1, Number(e.target.value) || 1) }
                                  : row,
                              )
                              patch({ itemRewards })
                            }}
                          />
                        </label>
                        <label className="wz-field">
                          Drop chance (%)
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.chance}
                            onChange={(e) => {
                              const itemRewards = input.itemRewards.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      chance: Math.max(
                                        0,
                                        Math.min(100, Number(e.target.value) || 100),
                                      ),
                                    }
                                  : row,
                              )
                              patch({ itemRewards })
                            }}
                          />
                        </label>
                        <label className="wz-field">
                          Display name
                          <input
                            value={item.name ?? ''}
                            onChange={(e) => {
                              const itemRewards = input.itemRewards.map((row, i) =>
                                i === index
                                  ? { ...row, name: e.target.value.trim() || undefined }
                                  : row,
                              )
                              patch({ itemRewards })
                            }}
                            placeholder="Optional MiniMessage name"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => patch({ itemRewards: [...input.itemRewards, emptyItemReward()] })}
              >
                Add item reward
              </button>
              <p className="dialog-note">
                Writes to {questsPath}. Run /sq reload on the server after you save.
              </p>
            </DialogPanel>
          ) : null}
        </DialogBody>

        {error ? <p className="wz-step-error">{error}</p> : null}

        <DialogPreviewBlock code={yaml} />

        <DialogFooter className="wizard-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" className="primary" onClick={goNext}>
              Next
            </button>
          ) : (
            <button type="button" className="primary" onClick={submit}>
              {isEdit ? 'Save quest' : 'Create quest'}
            </button>
          )}
        </DialogFooter>
    </DialogShell>
  )
}
