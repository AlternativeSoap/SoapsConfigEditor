import { useEffect, useMemo, useState } from 'react'
import {
  generateEquipmentSetYaml,
  resolvePackRoot,
  suggestEquipmentSetPath,
} from '../../core/mythiccrucible/generators'
import { mergeWizardYaml } from '../../core/yaml/mergeWizardYaml'
import { EQUIPMENT_SET_PRESETS } from '../../data/mythiccrucible/presets'
import type { EquipmentSetBonusInput, EquipmentSetGeneratorInput, FileRecord } from '../../types'
import { ColorTextField } from '../ColorTextField'
import { SkillLineBuilder } from '../SkillLineBuilder'
import { Switch } from '../Switch'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'
import { CrucibleStatsEditor } from './CrucibleStatsEditor'

const STEPS = ['Identity', 'Bonuses'] as const

const STEP_HINTS = [
  'Name the set and write the lore players see when wearing matching pieces.',
  'Add piece thresholds with stats and optional skill lines.',
]

function emptySet(): EquipmentSetGeneratorInput {
  return {
    id: 'MY_SET',
    display: 'My Set',
    enabled: true,
    lore: '<yellow>[2]: <gray>Bonus description',
    bonuses: [{ pieces: 2, stats: 'DEFENSE 5 ADDITIVE', skills: '' }],
  }
}

export interface EquipmentSetWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface EquipmentSetWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingSetIds: string[]
  crucibleEnabled: boolean
  packStatIds?: string[]
  onClose: () => void
  onApply: (output: EquipmentSetWizardOutput) => void
}

export function EquipmentSetWizardDialog({
  files,
  packName,
  existingSetIds,
  crucibleEnabled,
  packStatIds = [],
  onClose,
  onApply,
}: EquipmentSetWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<EquipmentSetGeneratorInput>(emptySet)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')
  const [builderBonusIndex, setBuilderBonusIndex] = useState<number | null>(null)

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const setFiles = useMemo(
    () => files.filter((f) => f.category === 'equipment-sets'),
    [files],
  )

  useEffect(() => {
    setTargetPath(setFiles[0]?.path ?? suggestEquipmentSetPath(packRoot))
  }, [setFiles, packRoot])

  const yaml = useMemo(() => generateEquipmentSetYaml(input), [input])

  function patch(partial: Partial<EquipmentSetGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function patchBonus(index: number, partial: Partial<EquipmentSetBonusInput>): void {
    setInput((prev) => ({
      ...prev,
      bonuses: prev.bonuses.map((b, i) => (i === index ? { ...b, ...partial } : b)),
    }))
    setError('')
  }

  function validate(): boolean {
    const id = input.id.trim()
    if (!id) {
      setError('Enter a set ID.')
      return false
    }
    if (existingSetIds.some((s) => s.toLowerCase() === id.toLowerCase())) {
      setError(`A set named ${id} already exists in this pack.`)
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
      `# Equipment sets for ${packName}.\n# Use New → New equipment set to add one.\n`,
    )
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  return (
    <DialogShell size="lg" className="wizard-dialog" labelledBy="equip-set-wizard-title" onClose={onClose}>
      <DialogHeader
        title="New equipment set"
        titleId="equip-set-wizard-title"
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
                      const preset = EQUIPMENT_SET_PRESETS.find((p) => p.id === e.target.value)
                      if (preset) setInput(preset.apply())
                    }}
                  >
                    <option value="">Choose a starting point…</option>
                    {EQUIPMENT_SET_PRESETS.map((p) => (
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
                    <span className="wz-toggle-hint">Players can receive set bonuses</span>
                  </span>
                  <Switch
                    checked={input.enabled}
                    onChange={(enabled) => patch({ enabled })}
                    aria-label="Enabled"
                  />
                </div>
                <ColorTextField
                  label="Set lore"
                  value={input.lore}
                  onChange={(lore) => patch({ lore })}
                  multiline
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
            {input.bonuses.map((bonus, index) => (
              <DialogPanel key={index} title={`Bonus ${index + 1}`}>
                <div className="dialog-fields">
                  <label>
                    Pieces required
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={bonus.pieces}
                      onChange={(e) => patchBonus(index, { pieces: Number(e.target.value) || 1 })}
                    />
                  </label>
                  <div className="wide">
                    <span className="wz-field-label">Stats</span>
                    <p className="dialog-note">Search for a stat, click to add it, then set the value.</p>
                    <CrucibleStatsEditor
                      value={bonus.stats}
                      onChange={(stats) => patchBonus(index, { stats })}
                      packStatIds={packStatIds}
                    />
                  </div>
                  <label className="wide">
                    Skills <span className="field-hint">One skill line per row</span>
                    <textarea
                      rows={2}
                      value={bonus.skills}
                      onChange={(e) => patchBonus(index, { skills: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className={`slb-open-btn${builderBonusIndex === index ? ' active' : ''}`}
                    onClick={() => setBuilderBonusIndex(builderBonusIndex === index ? null : index)}
                  >
                    {builderBonusIndex === index ? 'Hide builder' : 'Build skill line'}
                  </button>
                  {builderBonusIndex === index && (
                    <SkillLineBuilder
                      value={bonus.skills.split('\n')[0] ?? ''}
                      crucibleEnabled={crucibleEnabled}
                      onConfirm={(line) => {
                        const rest = bonus.skills.split('\n').slice(1).filter(Boolean)
                        patchBonus(index, { skills: [line, ...rest].join('\n') })
                        setBuilderBonusIndex(null)
                      }}
                      onClose={() => setBuilderBonusIndex(null)}
                    />
                  )}
                </div>
              </DialogPanel>
            ))}
            <button
              type="button"
              onClick={() =>
                patch({
                  bonuses: [
                    ...input.bonuses,
                    { pieces: input.bonuses.length * 2 || 2, stats: '', skills: '' },
                  ],
                })
              }
            >
              Add bonus tier
            </button>
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
              Create set
            </button>
          )}
        </DialogFooter>
    </DialogShell>
  )
}
