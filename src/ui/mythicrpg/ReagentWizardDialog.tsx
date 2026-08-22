import { useEffect, useMemo, useState } from 'react'
import {
  generateMaxManaStatYaml,
  generateReagentYaml,
  resolvePackRoot,
  suggestReagentPath,
  suggestStatsPath,
} from '../../core/mythicrpg/generators'
import { REAGENT_PRESETS } from '../../data/mythicrpg/presets'
import type { FileRecord, ReagentGeneratorInput } from '../../types'
import { ColorTextField } from '../ColorTextField'
import { Switch } from '../Switch'

const STEPS = ['Identity', 'Range', 'Bar'] as const

const STEP_HINTS = [
  'Name the reagent players spend when casting spells.',
  'Set the min and max, or scale the max from a MAX_MANA stat.',
  'Optionally add a simple action-bar display for this reagent.',
]

const emptyReagent = (): ReagentGeneratorInput => ({
  id: 'Mana',
  display: 'Mana',
  global: true,
  minValue: '0',
  maxValue: '100',
  scaleWithMaxMana: false,
  includeResourceBar: true,
  writeMaxManaStat: false,
  maxManaBase: 1000,
})

export interface ReagentWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface ReagentWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingReagentIds: string[]
  onClose: () => void
  onApply: (output: ReagentWizardOutput) => void
}

function mergeYaml(files: FileRecord[], path: string, yaml: string, header: string): {
  path: string
  content: string
  mode: 'create' | 'append'
} {
  const existing = files.find((f) => f.path.replace(/\\/g, '/') === path)
  if (!existing) {
    return { path, content: `${header}\n${yaml}`, mode: 'create' }
  }
  const base = existing.content.trimEnd()
  // Avoid duplicating a top-level key if the file already defines it
  const key = yaml.split('\n')[0]?.replace(/:$/, '') ?? ''
  if (key && new RegExp(`^${key}:`, 'm').test(existing.content)) {
    return { path, content: existing.content, mode: 'create' }
  }
  return { path, content: base ? `${base}\n\n${yaml}` : yaml, mode: 'create' }
}

export function ReagentWizardDialog({
  files,
  packName,
  existingReagentIds,
  onClose,
  onApply,
}: ReagentWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<ReagentGeneratorInput>(emptyReagent)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const reagentFiles = useMemo(
    () => files.filter((f) => f.category === 'reagents'),
    [files],
  )

  useEffect(() => {
    setTargetPath(reagentFiles[0]?.path ?? suggestReagentPath(packRoot))
  }, [reagentFiles, packRoot])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const yaml = useMemo(() => generateReagentYaml(input), [input])

  function patch(partial: Partial<ReagentGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      const id = input.id.trim()
      if (!id) return 'Reagent id is required.'
      if (existingReagentIds.some((r) => r.toLowerCase() === id.toLowerCase())) {
        return `Reagent ${id} already exists in this pack.`
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
    const path = (targetPath.trim() || suggestReagentPath(packRoot)).replace(/\\/g, '/')
    const writes = [
      mergeYaml(files, path, yaml, `# MythicRPG reagents\n`),
    ]
    if (input.scaleWithMaxMana || input.writeMaxManaStat) {
      const statsPath = suggestStatsPath(packRoot)
      writes.push(
        mergeYaml(
          files,
          statsPath,
          generateMaxManaStatYaml(input.maxManaBase || 1000),
          `# Mythic stats\n`,
        ),
      )
    }
    onApply({ files: writes })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg class-wizard"
        role="dialog"
        aria-labelledby="reagent-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <div>
            <h2 id="reagent-wizard-title">New reagent</h2>
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
                {REAGENT_PRESETS.map((preset) => (
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
                  Reagent id
                  <input
                    value={input.id}
                    onChange={(e) =>
                      patch({ id: e.target.value.trim().replace(/\s+/g, '') })
                    }
                    placeholder="Mana"
                  />
                </label>
                <div className="wz-toggle">
                  <span className="wz-toggle-copy">
                    <span className="wz-toggle-title">Global</span>
                    <span className="wz-toggle-hint">Every player has this reagent</span>
                  </span>
                  <Switch
                    checked={input.global}
                    onChange={(next) => patch({ global: next })}
                    aria-label="Global reagent"
                  />
                </div>
              </div>
              <ColorTextField
                label="Display name"
                value={input.display}
                onChange={(display) => patch({ display })}
              />
            </div>
          )}

          {step === 1 && (
            <div className="wizard-pane">
              <div className="wz-toggle">
                <span className="wz-toggle-copy">
                  <span className="wz-toggle-title">Scale max with MAX_MANA stat</span>
                  <span className="wz-toggle-hint">Also writes a starter MAX_MANA entry to stats.yml when needed</span>
                </span>
                <Switch
                  checked={input.scaleWithMaxMana}
                  onChange={(next) =>
                    patch({
                      scaleWithMaxMana: next,
                      writeMaxManaStat: next,
                      maxValue: next ? 'stat.MAX_MANA' : '100',
                    })
                  }
                  aria-label="Scale max with MAX_MANA stat"
                />
              </div>
              <div className="wz-grid-2">
                <label className="wz-field">
                  Min value
                  <input
                    value={input.minValue}
                    onChange={(e) => patch({ minValue: e.target.value })}
                  />
                </label>
                <label className="wz-field">
                  Max value
                  <input
                    value={input.scaleWithMaxMana ? 'stat.MAX_MANA' : input.maxValue}
                    disabled={input.scaleWithMaxMana}
                    onChange={(e) => patch({ maxValue: e.target.value })}
                  />
                </label>
              </div>
              {input.scaleWithMaxMana ? (
                <label className="wz-field">
                  MAX_MANA base value
                  <input
                    type="number"
                    min={1}
                    value={input.maxManaBase}
                    onChange={(e) =>
                      patch({ maxManaBase: Math.max(1, Number(e.target.value) || 1000) })
                    }
                  />
                </label>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="wizard-pane">
              <div className="wz-toggle">
                <span className="wz-toggle-copy">
                  <span className="wz-toggle-title">Resource bar</span>
                  <span className="wz-toggle-hint">Show a simple bar on the action bar</span>
                </span>
                <Switch
                  checked={input.includeResourceBar}
                  onChange={(next) => patch({ includeResourceBar: next })}
                  aria-label="Include resource bar"
                />
              </div>
              <label className="wz-field">
                Target file
                <select value={targetPath} onChange={(e) => setTargetPath(e.target.value)}>
                  {reagentFiles.length === 0 ? (
                    <option value={suggestReagentPath(packRoot)}>
                      {suggestReagentPath(packRoot)}
                    </option>
                  ) : (
                    reagentFiles.map((f) => (
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
              Create reagent
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
