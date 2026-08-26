import { useEffect, useMemo, useState } from 'react'
import {
  generateCrucibleStatYaml,
  resolvePackRoot,
  suggestCrucibleStatsPath,
} from '../../core/mythiccrucible/generators'
import { mergeWizardYaml } from '../../core/yaml/mergeWizardYaml'
import { CRUCIBLE_STAT_PRESETS } from '../../data/mythiccrucible/presets'
import type { CrucibleStatGeneratorInput, FileRecord } from '../../types'
import { ColorTextField } from '../ColorTextField'
import { Switch } from '../Switch'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'

const STEPS = ['Identity', 'Values', 'Look'] as const

const STEP_HINTS = [
  'Name the custom stat and how it appears to players.',
  'Set the base value used when nothing else overrides it.',
  'Optionally enable lore formatting for this stat.',
]

const emptyStat = (): CrucibleStatGeneratorInput => ({
  id: 'FOCUS',
  display: 'Focus',
  baseValue: 0,
  formattingEnabled: false,
  nameFormat: '<stat.icon> <stat.name>',
  valueFormat: '<stat.value>',
})

export interface CrucibleStatWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface CrucibleStatWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingStatIds: string[]
  onClose: () => void
  onApply: (output: CrucibleStatWizardOutput) => void
}

export function CrucibleStatWizardDialog({
  files,
  packName,
  existingStatIds,
  onClose,
  onApply,
}: CrucibleStatWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<CrucibleStatGeneratorInput>(emptyStat)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const statFiles = useMemo(() => files.filter((f) => f.category === 'stats'), [files])

  useEffect(() => {
    setTargetPath(statFiles[0]?.path ?? suggestCrucibleStatsPath(packRoot))
  }, [statFiles, packRoot])

  const yaml = useMemo(() => generateCrucibleStatYaml(input), [input])

  function patch(partial: Partial<CrucibleStatGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      const id = input.id.trim()
      if (!id) return 'Stat id is required.'
      if (existingStatIds.some((s) => s.toLowerCase() === id.toLowerCase())) {
        return `Stat ${id} already exists in this pack.`
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
    const entry = mergeWizardYaml(files, targetPath, yaml, `# Custom stats\n`)
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  return (
    <DialogShell size="md" className="wizard-dialog" labelledBy="crucible-stat-wizard-title" onClose={onClose}>
      <DialogHeader
        title="New stat"
        titleId="crucible-stat-wizard-title"
        onClose={onClose}
        lead={STEP_HINTS[step]}
      />

      <div className="wizard-steps" role="tablist">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            className={i === step ? 'wizard-step active' : 'wizard-step'}
            aria-selected={i === step}
            onClick={() => setStep(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <DialogBody>
          <DialogPanel title="Identity">
            <div className="dialog-fields">
              <label>
                Preset
                <select
                  value=""
                  onChange={(e) => {
                    const preset = CRUCIBLE_STAT_PRESETS.find((p) => p.id === e.target.value)
                    if (preset) setInput(preset.apply())
                  }}
                >
                  <option value="">Choose a starting point…</option>
                  {CRUCIBLE_STAT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label>
                ID
                <input value={input.id} onChange={(e) => patch({ id: e.target.value })} />
              </label>
              <ColorTextField
                label="Display name"
                value={input.display}
                onChange={(display) => patch({ display })}
              />
              <label className="wide">
                File path
                <input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} />
              </label>
            </div>
          </DialogPanel>
        </DialogBody>
      )}

      {step === 1 && (
        <DialogBody>
          <DialogPanel title="Values">
            <div className="dialog-fields">
              <label>
                Base value
                <input
                  type="number"
                  value={input.baseValue}
                  onChange={(e) => patch({ baseValue: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
          </DialogPanel>
        </DialogBody>
      )}

      {step === 2 && (
        <DialogBody>
          <DialogPanel title="Look">
            <div className="dialog-fields">
              <div className="wz-toggle">
                <span className="wz-toggle-copy">
                  <span className="wz-toggle-title">Custom lore formatting</span>
                  <span className="wz-toggle-hint">Override how this stat prints in item lore</span>
                </span>
                <Switch
                  checked={input.formattingEnabled}
                  onChange={(formattingEnabled) => patch({ formattingEnabled })}
                  aria-label="Custom lore formatting"
                />
              </div>
              {input.formattingEnabled && (
                <>
                  <label>
                    Name format
                    <input
                      value={input.nameFormat}
                      onChange={(e) => patch({ nameFormat: e.target.value })}
                    />
                  </label>
                  <label>
                    Value format
                    <input
                      value={input.valueFormat}
                      onChange={(e) => patch({ valueFormat: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
          </DialogPanel>
        </DialogBody>
      )}

      <DialogPreviewBlock code={yaml} />
      {error ? <p className="error-copy">{error}</p> : null}

      <DialogFooter className="wizard-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)}>Back</button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="primary" onClick={goNext}>Next</button>
        ) : (
          <button type="button" className="primary" onClick={submit}>Create stat</button>
        )}
      </DialogFooter>
    </DialogShell>
  )
}
