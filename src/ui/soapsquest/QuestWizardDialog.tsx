import { useEffect, useMemo, useState } from 'react'
import {
  findQuestsYmlPath,
} from '../../core/soapsquest/classify'
import {
  generateQuestYaml,
  mergeIntoQuestsYml,
  type QuestGeneratorInput,
  type QuestObjectiveInput,
} from '../../core/soapsquest/generators'
import {
  extractDifficultyIds,
  extractQuestIds,
  extractTierIds,
} from '../../core/soapsquest/questIds'
import {
  DEFAULT_DIFFICULTY_IDS,
  DEFAULT_TIER_IDS,
} from '../../data/soapsquest/defaults'
import {
  MVP_OBJECTIVE_TYPES,
  objectiveTypeInfo,
} from '../../data/soapsquest/objectiveTypes'
import type { FileRecord } from '../../types'
import { Switch } from '../Switch'

const STEPS = ['Identity', 'Objectives', 'Rewards'] as const

const STEP_HINTS = [
  'Name the quest and choose its paper, tier, and difficulty.',
  'Add one or more objectives. Each needs a type, target, and amount.',
  'Set XP, money, and sigil rewards. At least one reward must be greater than zero.',
]

function emptyObjective(): QuestObjectiveInput {
  return { type: 'kill', target: 'ZOMBIE', amount: 10 }
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
  }
}

export interface QuestWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface QuestWizardDialogProps {
  files: FileRecord[]
  onClose: () => void
  onApply: (output: QuestWizardOutput) => void
}

const QUEST_ID_RE = /^[a-z][a-z0-9_]*$/

export function QuestWizardDialog({ files, onClose, onApply }: QuestWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<QuestGeneratorInput>(emptyQuest)
  const [error, setError] = useState('')

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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
      if (existingQuestIds.some((q) => q.toLowerCase() === id.toLowerCase())) {
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
        const obj = input.objectives[i]
        if (!obj.type) return `Objective ${i + 1} needs a type.`
        if (!obj.target.trim()) return `Objective ${i + 1} needs a target.`
        if (!Number.isFinite(obj.amount) || obj.amount < 1) {
          return `Objective ${i + 1} amount must be at least 1.`
        }
      }
    }
    if (current === 2) {
      if (input.xp <= 0 && input.money <= 0 && input.sigils <= 0) {
        return 'Set at least one reward (XP, money, or sigils) greater than zero.'
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
    const merged = mergeIntoQuestsYml(
      existingQuestsFile?.content ?? null,
      questYaml,
      input.id.trim(),
    )
    if (!merged.ok) {
      setError(merged.error)
      return
    }
    onApply({
      files: [
        {
          path: questsPath,
          content: merged.content,
          mode: 'create',
        },
      ],
    })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg class-wizard"
        role="dialog"
        aria-labelledby="quest-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <div>
            <h2 id="quest-wizard-title">New quest</h2>
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

        <div className="wizard-body">
          {step === 0 ? (
            <div className="wizard-pane">
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
                <label className="wz-field">
                  Paper material
                  <input
                    value={input.material}
                    onChange={(e) => patch({ material: e.target.value.trim().toUpperCase() })}
                    placeholder="PAPER"
                  />
                </label>
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
            </div>
          ) : null}

          {step === 1 ? (
            <div className="wizard-pane">
              {input.objectives.map((obj, index) => {
                const hint = objectiveTypeInfo(obj.type)?.targetHint ?? 'TARGET'
                return (
                  <div key={index} className="wz-grid-2" style={{ marginBottom: '0.75rem' }}>
                    <label className="wz-field">
                      Type
                      <select
                        value={obj.type}
                        onChange={(e) => {
                          const type = e.target.value
                          const info = objectiveTypeInfo(type)
                          updateObjective(index, {
                            type,
                            target: info?.targetHint ?? obj.target,
                          })
                        }}
                      >
                        {MVP_OBJECTIVE_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="wz-field">
                      Target
                      <input
                        value={obj.target}
                        onChange={(e) => updateObjective(index, { target: e.target.value })}
                        placeholder={hint}
                      />
                    </label>
                    <label className="wz-field">
                      Amount
                      <input
                        type="number"
                        min={1}
                        value={obj.amount}
                        onChange={(e) =>
                          updateObjective(index, {
                            amount: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </label>
                    <div className="wz-field" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        disabled={input.objectives.length <= 1}
                        onClick={() =>
                          patch({
                            objectives: input.objectives.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => patch({ objectives: [...input.objectives, emptyObjective()] })}
              >
                Add objective
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="wizard-pane">
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
              <p className="wz-step-hint">
                Writes to {questsPath}. Run /sq reload on the server after you save.
              </p>
            </div>
          ) : null}
        </div>

        {error ? <p className="wz-step-error">{error}</p> : null}

        <details className="create-preview-details">
          <summary>YAML preview</summary>
          <pre className="dialog-preview">{yaml}</pre>
        </details>

        <footer className="dialog-actions">
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
              Create quest
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
