import { useEffect, useMemo, useState } from 'react'
import {
  generateArchetypeYaml,
  resolvePackRoot,
  suggestArchetypePath,
  yamlHasTopLevelKey,
} from '../../core/mythicrpg/generators'
import { ARCHETYPE_PRESETS } from '../../data/mythicrpg/presets'
import type { ArchetypeGeneratorInput, FileRecord } from '../../types'
import { ColorTextField } from '../ColorTextField'

const STEPS = ['Identity', 'Progression', 'Unlocks'] as const

const STEP_HINTS = [
  'Pick class or profession, then set the display name and icon.',
  'Set level range and which experience curve and source this archetype uses.',
  'Optionally unlock spells at certain levels and add one base or modifier stat line.',
]

const emptyArchetype = (): ArchetypeGeneratorInput => ({
  id: 'Adventurer',
  display: 'Adventurer',
  group: 'CLASS',
  description: 'A starter class.',
  iconMaterial: 'IRON_SWORD',
  minLevel: 1,
  maxLevel: 50,
  experienceCurve: 'STANDARD',
  experienceSource: 'COMBAT',
  spellUnlocks: '',
  baseStatLine: '',
  statModifierLine: '',
})

export interface ArchetypeWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface ArchetypeWizardDialogProps {
  files: FileRecord[]
  packName: string
  skillIds: string[]
  existingArchetypeIds: string[]
  onClose: () => void
  onApply: (output: ArchetypeWizardOutput) => void
}

function mergeYaml(files: FileRecord[], path: string, yaml: string): { path: string; content: string; mode: 'create' | 'append' } {
  const existing = files.find((f) => f.path.replace(/\\/g, '/') === path)
  if (!existing) {
    return { path, content: `# Archetypes\n${yaml}`, mode: 'create' }
  }
  const base = existing.content.trimEnd()
  return { path, content: base ? `${base}\n\n${yaml}` : yaml, mode: 'create' }
}

export function ArchetypeWizardDialog({
  files,
  packName,
  skillIds,
  existingArchetypeIds,
  onClose,
  onApply,
}: ArchetypeWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<ArchetypeGeneratorInput>(emptyArchetype)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const archetypeFiles = useMemo(
    () => files.filter((f) => f.category === 'archetypes'),
    [files],
  )

  useEffect(() => {
    setTargetPath(archetypeFiles[0]?.path ?? suggestArchetypePath(packRoot))
  }, [archetypeFiles, packRoot])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const yaml = useMemo(() => generateArchetypeYaml(input), [input])

  function patch(partial: Partial<ArchetypeGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      const id = input.id.trim()
      if (!id) return 'Archetype id is required.'
      if (existingArchetypeIds.some((a) => a.toLowerCase() === id.toLowerCase())) {
        return `Archetype ${id} already exists in this pack.`
      }
    }
    if (current === 1) {
      if (input.minLevel < 1) return 'Min level must be at least 1.'
      if (input.maxLevel < input.minLevel) return 'Max level must be greater than or equal to min level.'
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
    const path = (targetPath.trim() || suggestArchetypePath(packRoot)).replace(/\\/g, '/')
    const existing = files.find((f) => f.path.replace(/\\/g, '/') === path)
    if (existing && yamlHasTopLevelKey(existing.content, input.id.trim())) {
      setStep(0)
      setError(
        `Archetype ${input.id.trim()} already exists in ${path}. Pick another id or edit the existing entry.`,
      )
      return
    }
    onApply({ files: [mergeYaml(files, path, yaml)] })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg class-wizard"
        role="dialog"
        aria-labelledby="archetype-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <div>
            <h2 id="archetype-wizard-title">New archetype</h2>
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
                {ARCHETYPE_PRESETS.map((preset) => (
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
              <div className="wz-preset-row">
                <span className="wz-field-label">Group</span>
                <button
                  type="button"
                  className={`chip${input.group === 'CLASS' ? ' active' : ''}`}
                  onClick={() =>
                    patch({
                      group: 'CLASS',
                      experienceSource: input.experienceSource || 'COMBAT',
                    })
                  }
                >
                  CLASS
                </button>
                <button
                  type="button"
                  className={`chip${input.group === 'PROFESSION' ? ' active' : ''}`}
                  onClick={() =>
                    patch({
                      group: 'PROFESSION',
                      experienceSource: input.experienceSource === 'COMBAT' ? 'MINING' : input.experienceSource,
                    })
                  }
                >
                  PROFESSION
                </button>
              </div>
              <div className="wz-grid-2">
                <label className="wz-field">
                  Archetype id
                  <input
                    value={input.id}
                    onChange={(e) =>
                      patch({ id: e.target.value.trim().replace(/\s+/g, '') })
                    }
                    placeholder="Wizard"
                  />
                </label>
                <label className="wz-field">
                  Icon material
                  <input
                    value={input.iconMaterial}
                    onChange={(e) => patch({ iconMaterial: e.target.value })}
                    placeholder="ENCHANTED_BOOK"
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
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="wizard-pane">
              <div className="wz-grid-2">
                <label className="wz-field">
                  Min level
                  <input
                    type="number"
                    min={1}
                    value={input.minLevel}
                    onChange={(e) => patch({ minLevel: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
                <label className="wz-field">
                  Max level
                  <input
                    type="number"
                    min={1}
                    value={input.maxLevel}
                    onChange={(e) => patch({ maxLevel: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
              </div>
              <div className="wz-grid-2">
                <label className="wz-field">
                  Experience curve
                  <input
                    value={input.experienceCurve}
                    onChange={(e) => patch({ experienceCurve: e.target.value })}
                    placeholder="STANDARD"
                  />
                </label>
                <label className="wz-field">
                  Experience source
                  <input
                    value={input.experienceSource}
                    onChange={(e) => patch({ experienceSource: e.target.value })}
                    placeholder="COMBAT"
                  />
                </label>
              </div>
              <p className="create-section-hint">
                Curve and source ids must exist in your pack experience-curves.yml and experience-sources.yml files.
                Defaults match common MythicRPG examples.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-pane">
              <label className="wz-field">
                Spell unlocks
                <textarea
                  rows={3}
                  value={input.spellUnlocks}
                  onChange={(e) => patch({ spellUnlocks: e.target.value })}
                  placeholder={'MagicMissile\nFireball 5'}
                />
              </label>
              {skillIds.length > 0 ? (
                <p className="create-section-hint">
                Spell / skill ids in this pack: {skillIds.slice(0, 12).join(', ')}
                  {skillIds.length > 12 ? '…' : ''}
                </p>
              ) : null}
              <p className="create-section-hint">
                One unlock per line. Use SPELL, SPELL level, or SPELL:spellLevel archetypeLevel.
              </p>
              <label className="wz-field">
                Base stats line (optional)
                <input
                  value={input.baseStatLine}
                  onChange={(e) => patch({ baseStatLine: e.target.value })}
                  placeholder="MAX_HEALTH 18"
                />
              </label>
              <label className="wz-field">
                Stat modifier line (optional)
                <input
                  value={input.statModifierLine}
                  onChange={(e) => patch({ statModifierLine: e.target.value })}
                  placeholder="MAX_HEALTH 1"
                />
              </label>
              <label className="wz-field">
                Target file
                <select value={targetPath} onChange={(e) => setTargetPath(e.target.value)}>
                  {archetypeFiles.length === 0 ? (
                    <option value={suggestArchetypePath(packRoot)}>
                      {suggestArchetypePath(packRoot)}
                    </option>
                  ) : (
                    archetypeFiles.map((f) => (
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
              Create archetype
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
