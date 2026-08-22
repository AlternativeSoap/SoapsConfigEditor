import { useEffect, useMemo, useState } from 'react'
import {
  generateSpellYaml,
  resolvePackRoot,
  suggestSpellPath,
} from '../../core/mythicrpg/generators'
import { SPELL_PRESETS } from '../../data/mythicrpg/presets'
import type { FileRecord, SpellCastingMode, SpellGeneratorInput } from '../../types'
import { ColorTextField } from '../ColorTextField'
import { SkillLineBuilder } from '../SkillLineBuilder'

const STEPS = ['Identity', 'Casting', 'Cost and power'] as const

const STEP_HINTS = [
  'Name the spell and choose an icon. Presets fill the form with a working starting point.',
  'Choose how players cast this spell: bound hotbar, click combo, or a global passive.',
  'Set cooldown, optional reagent cost, power scaling, and skill lines.',
]

const emptySpell = (): SpellGeneratorInput => ({
  id: 'MY_SPELL',
  display: 'My Spell',
  description: 'Describe what this spell does',
  iconMaterial: 'BLAZE_POWDER',
  castingMode: 'bound',
  clickCombo: 'LRR',
  cooldown: 2,
  upgrades: 1,
  costReagent: '',
  costAmount: 0,
  modifierKey: 'DAMAGE',
  modifierBase: 5,
  modifierPerLevel: 1,
  skills: 'damage{a=<spell.modifier.DAMAGE>} @target',
  targeter: '@target',
  bindable: true,
  global: false,
})

export interface SpellWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface SpellWizardDialogProps {
  files: FileRecord[]
  packName: string
  reagentIds: string[]
  existingSkillIds: string[]
  onClose: () => void
  onApply: (output: SpellWizardOutput) => void
}

function appendOrCreate(
  files: FileRecord[],
  path: string,
  yaml: string,
): { path: string; content: string; mode: 'create' | 'append' } {
  const existing = files.find((f) => f.path.replace(/\\/g, '/') === path)
  if (!existing) {
    return { path, content: `# Spells\n${yaml}`, mode: 'create' }
  }
  const base = existing.content.trimEnd()
  const content = base ? `${base}\n\n${yaml}` : yaml
  return { path, content, mode: 'create' }
}

export function SpellWizardDialog({
  files,
  packName,
  reagentIds,
  existingSkillIds,
  onClose,
  onApply,
}: SpellWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<SpellGeneratorInput>(emptySpell)
  const [targetPath, setTargetPath] = useState('')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const skillFiles = useMemo(
    () => files.filter((f) => f.category === 'skills'),
    [files],
  )

  useEffect(() => {
    const preferred = skillFiles[0]?.path ?? suggestSpellPath(packRoot)
    setTargetPath(preferred)
  }, [skillFiles, packRoot])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const yaml = useMemo(() => generateSpellYaml(input), [input])

  function patch(partial: Partial<SpellGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function setCastingMode(mode: SpellCastingMode): void {
    if (mode === 'bound') {
      patch({ castingMode: mode, bindable: true, global: false, targeter: input.targeter || '@target' })
    } else if (mode === 'click_combo') {
      patch({
        castingMode: mode,
        bindable: false,
        global: false,
        clickCombo: input.clickCombo || 'LRR',
      })
    } else {
      patch({ castingMode: mode, bindable: false, global: true, targeter: '@self', costAmount: 0 })
    }
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      const id = input.id.trim()
      if (!id) return 'Spell id is required.'
      if (existingSkillIds.includes(id)) return `Skill ${id} already exists in this pack.`
    }
    if (current === 1 && input.castingMode === 'click_combo' && !input.clickCombo.trim()) {
      return 'Enter a click combo such as LRR.'
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
    const path = targetPath.trim() || suggestSpellPath(packRoot)
    onApply({ files: [appendOrCreate(files, path.replace(/\\/g, '/'), yaml)] })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg class-wizard"
        role="dialog"
        aria-labelledby="spell-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <div>
            <h2 id="spell-wizard-title">New spell</h2>
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
              onClick={() => {
                if (i > step && validateStep(step)) return
                setStep(i)
              }}
            >
              <span className="wizard-step-num">{i + 1}</span>
              <span className="wizard-step-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="wizard-body">
          {step === 0 && (
            <div className="wizard-pane">
              <div className="wz-preset-row">
                <span className="wz-field-label">Presets</span>
                {SPELL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip"
                    title={preset.description}
                    onClick={() => {
                      setInput(preset.apply())
                      setError('')
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="wz-grid-2">
                <label className="wz-field">
                  Spell id
                  <input
                    value={input.id}
                    onChange={(e) =>
                      patch({ id: e.target.value.trim().toUpperCase().replace(/\s+/g, '_') })
                    }
                    placeholder="MAGIC_MISSILE"
                  />
                </label>
                <label className="wz-field">
                  Icon material
                  <input
                    value={input.iconMaterial}
                    onChange={(e) => patch({ iconMaterial: e.target.value })}
                    placeholder="NETHER_STAR"
                  />
                </label>
              </div>
              <ColorTextField
                label="Display name"
                value={input.display}
                onChange={(display) => patch({ display })}
              />
              <label className="wz-field">
                Description
                <textarea
                  rows={2}
                  value={input.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="One or two lines for menus and /spell info"
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="wizard-pane">
              <div className="wz-preset-row">
                <span className="wz-field-label">Casting</span>
                {(
                  [
                    ['bound', 'Bound hotbar'],
                    ['click_combo', 'Click combo'],
                    ['passive', 'Passive global'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`chip${input.castingMode === mode ? ' active' : ''}`}
                    onClick={() => setCastingMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {input.castingMode === 'click_combo' ? (
                <label className="wz-field">
                  Click combo
                  <input
                    value={input.clickCombo}
                    onChange={(e) => patch({ clickCombo: e.target.value.toUpperCase() })}
                    placeholder="LRR"
                  />
                </label>
              ) : null}
              <label className="wz-field">
                Targeter
                <input
                  value={input.targeter}
                  onChange={(e) => patch({ targeter: e.target.value })}
                  placeholder="@target"
                />
              </label>
              <p className="create-section-hint">
                Bound spells use ~onUse after the player binds them. Click combos fire on combat clicks. Passive
                global spells are granted to every player.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-pane">
              <div className="wz-grid-2">
                <label className="wz-field">
                  Cooldown (seconds)
                  <input
                    type="number"
                    min={0}
                    value={input.cooldown}
                    onChange={(e) => patch({ cooldown: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="wz-field">
                  Max upgrades
                  <input
                    type="number"
                    min={1}
                    value={input.upgrades}
                    onChange={(e) => patch({ upgrades: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
              </div>
              <div className="wz-grid-2">
                <label className="wz-field">
                  Cost reagent
                  <input
                    list="spell-reagent-ids"
                    value={input.costReagent}
                    onChange={(e) => patch({ costReagent: e.target.value })}
                    placeholder="mana"
                  />
                  <datalist id="spell-reagent-ids">
                    {reagentIds.map((id) => (
                      <option key={id} value={id} />
                    ))}
                  </datalist>
                </label>
                <label className="wz-field">
                  Cost amount
                  <input
                    type="number"
                    min={0}
                    value={input.costAmount}
                    onChange={(e) => patch({ costAmount: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
              {input.castingMode !== 'passive' ? (
                <div className="wz-grid-2">
                  <label className="wz-field">
                    Modifier key
                    <input
                      value={input.modifierKey}
                      onChange={(e) => patch({ modifierKey: e.target.value.toUpperCase() })}
                      placeholder="DAMAGE"
                    />
                  </label>
                  <label className="wz-field">
                    Base / per level
                    <div className="wz-grid-2">
                      <input
                        type="number"
                        value={input.modifierBase}
                        onChange={(e) => patch({ modifierBase: Number(e.target.value) || 0 })}
                      />
                      <input
                        type="number"
                        value={input.modifierPerLevel}
                        onChange={(e) => patch({ modifierPerLevel: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </label>
                </div>
              ) : (
                <div className="wz-grid-2">
                  <label className="wz-field">
                    Passive stat
                    <input
                      value={input.passiveStatKey ?? 'HEALTH'}
                      onChange={(e) => patch({ passiveStatKey: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label className="wz-field">
                    Base / per level / max
                    <div className="wz-grid-2">
                      <input
                        type="number"
                        value={input.passiveStatBase ?? 1}
                        onChange={(e) => patch({ passiveStatBase: Number(e.target.value) || 0 })}
                      />
                      <input
                        type="number"
                        value={input.passiveStatPerLevel ?? 1}
                        onChange={(e) => patch({ passiveStatPerLevel: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </label>
                </div>
              )}
              <div className="create-section-head">
                <h3 className="create-section-title">Skills</h3>
                <button
                  type="button"
                  className={`slb-open-btn${builderOpen ? ' active' : ''}`}
                  onClick={() => setBuilderOpen((v) => !v)}
                >
                  {builderOpen ? 'Hide builder' : 'Build line'}
                </button>
              </div>
              <textarea
                rows={3}
                value={input.skills}
                onChange={(e) => patch({ skills: e.target.value })}
                placeholder="damage{a=<spell.modifier.DAMAGE>} @target"
              />
              {builderOpen ? (
                <SkillLineBuilder
                  value={input.skills.split('\n')[0] ?? ''}
                  hideTriggers
                  onConfirm={(line) => {
                    const rest = input.skills.split('\n').slice(1).join('\n')
                    patch({ skills: rest ? `${line}\n${rest}` : line })
                    setBuilderOpen(false)
                  }}
                  onClose={() => setBuilderOpen(false)}
                />
              ) : null}
              <label className="wz-field">
                Target file
                <select value={targetPath} onChange={(e) => setTargetPath(e.target.value)}>
                  {skillFiles.length === 0 ? (
                    <option value={suggestSpellPath(packRoot)}>{suggestSpellPath(packRoot)}</option>
                  ) : (
                    skillFiles.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.path}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
          )}
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
              Create spell
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
