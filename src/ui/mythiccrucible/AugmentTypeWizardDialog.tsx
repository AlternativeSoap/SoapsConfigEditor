import { useEffect, useMemo, useState } from 'react'
import {
  generateAugmentTypeYaml,
  resolvePackRoot,
  suggestAugmentsPath,
} from '../../core/mythiccrucible/generators'
import { mergeWizardYaml } from '../../core/yaml/mergeWizardYaml'
import { AUGMENT_TYPE_PRESETS } from '../../data/mythiccrucible/presets'
import type { AugmentTypeGeneratorInput, FileRecord } from '../../types'
import { ColorTextField } from '../ColorTextField'
import { Switch } from '../Switch'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'

const STEPS = ['Identity', 'Formatting'] as const

const STEP_HINTS = [
  'Name the augment type used by gem slots on items.',
  'Set empty and filled lore lines and slot icons.',
]

function emptyType(): AugmentTypeGeneratorInput {
  return {
    id: 'GEM',
    display: 'Gem',
    enabled: true,
    emptyFormat: '<augment.icon> Empty <augment.type> Slot',
    filledFormat: '<augment.icon> <augment.type>: <augment.tooltip>',
    showEmptySlot: true,
    iconEmpty: '☆',
    iconFilled: '★',
    iconInvalid: '',
  }
}

export interface AugmentTypeWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface AugmentTypeWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingTypeIds: string[]
  onClose: () => void
  onApply: (output: AugmentTypeWizardOutput) => void
}

export function AugmentTypeWizardDialog({
  files,
  packName,
  existingTypeIds,
  onClose,
  onApply,
}: AugmentTypeWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<AugmentTypeGeneratorInput>(emptyType)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const augmentFiles = useMemo(
    () => files.filter((f) => f.category === 'augments'),
    [files],
  )

  useEffect(() => {
    setTargetPath(augmentFiles[0]?.path ?? suggestAugmentsPath(packRoot))
  }, [augmentFiles, packRoot])

  const yaml = useMemo(() => generateAugmentTypeYaml(input), [input])

  function patch(partial: Partial<AugmentTypeGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function validate(): boolean {
    const id = input.id.trim()
    if (!id) {
      setError('Enter an augment type ID.')
      return false
    }
    if (existingTypeIds.some((s) => s.toLowerCase() === id.toLowerCase())) {
      setError(`An augment type named ${id} already exists in this pack.`)
      return false
    }
    return true
  }

  function handleCreate(): void {
    if (!validate()) return
    const entry = mergeWizardYaml(
      files,
      targetPath,
      yaml,
      `# Augment types for ${packName}.\n# Use New → New augment type to add one.\n`,
    )
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  return (
    <DialogShell size="lg" className="wizard-dialog" labelledBy="augment-type-wizard-title" onClose={onClose}>
      <DialogHeader
        title="New augment type"
        titleId="augment-type-wizard-title"
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
                      const preset = AUGMENT_TYPE_PRESETS.find((p) => p.id === e.target.value)
                      if (preset) setInput(preset.apply())
                    }}
                  >
                    <option value="">Choose a starting point…</option>
                    {AUGMENT_TYPE_PRESETS.map((p) => (
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
                <div className="wz-toggle">
                  <span className="wz-toggle-copy">
                    <span className="wz-toggle-title">Enabled</span>
                    <span className="wz-toggle-hint">This augment type can be used on items</span>
                  </span>
                  <Switch
                    checked={input.enabled}
                    onChange={(enabled) => patch({ enabled })}
                    aria-label="Enabled"
                  />
                </div>
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
            <DialogPanel title="Formatting">
              <div className="dialog-fields">
                <ColorTextField
                  label="Empty slot line"
                  value={input.emptyFormat}
                  onChange={(emptyFormat) => patch({ emptyFormat })}
                />
                <ColorTextField
                  label="Filled slot line"
                  value={input.filledFormat}
                  onChange={(filledFormat) => patch({ filledFormat })}
                />
                <div className="wz-toggle">
                  <span className="wz-toggle-copy">
                    <span className="wz-toggle-title">Show empty slots</span>
                    <span className="wz-toggle-hint">List empty sockets in lore placeholders</span>
                  </span>
                  <Switch
                    checked={input.showEmptySlot}
                    onChange={(showEmptySlot) => patch({ showEmptySlot })}
                    aria-label="Show empty slots"
                  />
                </div>
                <label>
                  Empty icon
                  <input value={input.iconEmpty} onChange={(e) => patch({ iconEmpty: e.target.value })} />
                </label>
                <label>
                  Filled icon
                  <input value={input.iconFilled} onChange={(e) => patch({ iconFilled: e.target.value })} />
                </label>
                <label>
                  Invalid icon
                  <input value={input.iconInvalid} onChange={(e) => patch({ iconInvalid: e.target.value })} />
                </label>
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
            <button type="button" className="primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="primary" onClick={handleCreate}>
              Create augment type
            </button>
          )}
        </DialogFooter>
    </DialogShell>
  )
}
