import { useEffect, useMemo, useState } from 'react'
import {
  generatePlaceholderYaml,
  resolvePackRoot,
  suggestPlaceholdersPath,
} from '../../core/mythiccrucible/generators'
import { mergeWizardYaml } from '../../core/yaml/mergeWizardYaml'
import { PLACEHOLDER_PRESETS } from '../../data/mythiccrucible/presets'
import type {
  CruciblePlaceholderGeneratorInput,
  CruciblePlaceholderKind,
  FileRecord,
} from '../../types'
import { ColorTextField } from '../ColorTextField'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'

const emptyPlaceholder = (): CruciblePlaceholderGeneratorInput => ({
  id: 'BrandColor',
  kind: 'simple',
  value: '<gold>',
  randomValues: 'red\ngreen\nblue',
  dayValue: '<yellow>Day',
  nightValue: '<dark_blue>Night',
  defaultValue: '<gray>Default',
})

export interface PlaceholderWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface PlaceholderWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingIds: string[]
  onClose: () => void
  onApply: (output: PlaceholderWizardOutput) => void
}

export function PlaceholderWizardDialog({
  files,
  packName,
  existingIds,
  onClose,
  onApply,
}: PlaceholderWizardDialogProps) {
  const [input, setInput] = useState<CruciblePlaceholderGeneratorInput>(emptyPlaceholder)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const placeholderFiles = useMemo(
    () => files.filter((f) => f.category === 'placeholders'),
    [files],
  )

  useEffect(() => {
    setTargetPath(placeholderFiles[0]?.path ?? suggestPlaceholdersPath(packRoot))
  }, [placeholderFiles, packRoot])

  const yaml = useMemo(() => generatePlaceholderYaml(input), [input])

  function patch(partial: Partial<CruciblePlaceholderGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function submit(): void {
    const id = input.id.trim()
    if (!id) {
      setError('Placeholder id is required.')
      return
    }
    if (existingIds.some((s) => s.toLowerCase() === id.toLowerCase())) {
      setError(`Placeholder ${id} already exists in this pack.`)
      return
    }
    if (input.kind === 'simple' && !input.value.trim()) {
      setError('Enter a value for this placeholder.')
      return
    }
    if (input.kind === 'random' && !input.randomValues.trim()) {
      setError('Add at least one random value.')
      return
    }
    if (input.kind === 'conditional' && !input.defaultValue.trim()) {
      setError('Enter a default value.')
      return
    }
    const entry = mergeWizardYaml(files, targetPath, yaml, `# Placeholders\n`)
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  return (
    <DialogShell size="md" className="wizard-dialog" labelledBy="placeholder-wizard-title" onClose={onClose}>
      <DialogHeader
        title="New placeholder"
        titleId="placeholder-wizard-title"
        onClose={onClose}
        lead="Create a reusable placeholder for lore and display text."
      />

      <DialogBody>
        <DialogPanel title="Placeholder">
          <div className="dialog-fields">
            <label>
              Preset
              <select
                value=""
                onChange={(e) => {
                  const preset = PLACEHOLDER_PRESETS.find((p) => p.id === e.target.value)
                  if (preset) setInput(preset.apply())
                }}
              >
                <option value="">Choose a starting point…</option>
                {PLACEHOLDER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <label>
              ID
              <input value={input.id} onChange={(e) => patch({ id: e.target.value })} />
            </label>
            <label>
              Kind
              <select
                value={input.kind}
                onChange={(e) => patch({ kind: e.target.value as CruciblePlaceholderKind })}
              >
                <option value="simple">Simple text</option>
                <option value="random">Random list</option>
                <option value="conditional">Conditional (day / night)</option>
              </select>
            </label>
            {input.kind === 'simple' && (
              <ColorTextField
                label="Value"
                value={input.value}
                onChange={(value) => patch({ value })}
              />
            )}
            {input.kind === 'random' && (
              <label className="wide">
                Values <span className="field-hint">One per line</span>
                <textarea
                  rows={4}
                  value={input.randomValues}
                  onChange={(e) => patch({ randomValues: e.target.value })}
                />
              </label>
            )}
            {input.kind === 'conditional' && (
              <>
                <ColorTextField
                  label="Default value"
                  value={input.defaultValue}
                  onChange={(defaultValue) => patch({ defaultValue })}
                />
                <ColorTextField
                  label="Day value"
                  value={input.dayValue}
                  onChange={(dayValue) => patch({ dayValue })}
                />
                <ColorTextField
                  label="Night value"
                  value={input.nightValue}
                  onChange={(nightValue) => patch({ nightValue })}
                />
              </>
            )}
            <label className="wide">
              File path
              <input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} />
            </label>
          </div>
        </DialogPanel>
      </DialogBody>

      <DialogPreviewBlock code={yaml} />
      {error ? <p className="error-copy">{error}</p> : null}

      <DialogFooter className="wizard-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="primary" onClick={submit}>Create placeholder</button>
      </DialogFooter>
    </DialogShell>
  )
}
