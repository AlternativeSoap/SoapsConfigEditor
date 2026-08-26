import { useEffect, useMemo, useState } from 'react'
import {
  generateLoreTemplateYaml,
  resolvePackRoot,
  suggestLoreTemplatesPath,
} from '../../core/mythiccrucible/generators'
import { mergeWizardYaml } from '../../core/yaml/mergeWizardYaml'
import { LORE_TEMPLATE_PRESETS } from '../../data/mythiccrucible/presets'
import { DEFAULT_SET_PIECE_LORE } from '../../data/mythiccrucible/itemCompletions'
import type { CrucibleLoreTemplateGeneratorInput, FileRecord } from '../../types'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'

const STEPS = ['Identity', 'Lines'] as const

const STEP_HINTS = [
  'Name the lore template items can reuse.',
  'Write one lore line per row. Use placeholders like {stats} when needed.',
]

const emptyTemplate = (): CrucibleLoreTemplateGeneratorInput => ({
  id: 'WeaponStats',
  lines: DEFAULT_SET_PIECE_LORE,
})

export interface LoreTemplateWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface LoreTemplateWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingIds: string[]
  onClose: () => void
  onApply: (output: LoreTemplateWizardOutput) => void
}

export function LoreTemplateWizardDialog({
  files,
  packName,
  existingIds,
  onClose,
  onApply,
}: LoreTemplateWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<CrucibleLoreTemplateGeneratorInput>(emptyTemplate)
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const templateFiles = useMemo(
    () => files.filter((f) => f.category === 'lore-templates'),
    [files],
  )

  useEffect(() => {
    setTargetPath(templateFiles[0]?.path ?? suggestLoreTemplatesPath(packRoot))
  }, [templateFiles, packRoot])

  const yaml = useMemo(() => generateLoreTemplateYaml(input), [input])

  function patch(partial: Partial<CrucibleLoreTemplateGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      const id = input.id.trim()
      if (!id) return 'Template id is required.'
      if (existingIds.some((s) => s.toLowerCase() === id.toLowerCase())) {
        return `Template ${id} already exists in this pack.`
      }
    }
    if (current === 1 && !input.lines.trim()) {
      return 'Add at least one lore line.'
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
    const entry = mergeWizardYaml(files, targetPath, yaml, `# Lore templates\n`)
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  return (
    <DialogShell size="md" className="wizard-dialog" labelledBy="lore-template-wizard-title" onClose={onClose}>
      <DialogHeader
        title="New lore template"
        titleId="lore-template-wizard-title"
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
                    const preset = LORE_TEMPLATE_PRESETS.find((p) => p.id === e.target.value)
                    if (preset) setInput(preset.apply())
                  }}
                >
                  <option value="">Choose a starting point…</option>
                  {LORE_TEMPLATE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Template id
                <input value={input.id} onChange={(e) => patch({ id: e.target.value })} />
              </label>
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
          <DialogPanel title="Lines">
            <div className="dialog-fields">
              <label className="wide">
                Lore lines <span className="field-hint">One line per row</span>
                <textarea
                  rows={8}
                  value={input.lines}
                  onChange={(e) => patch({ lines: e.target.value })}
                />
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
          <button type="button" className="primary" onClick={goNext}>Next</button>
        ) : (
          <button type="button" className="primary" onClick={submit}>Create template</button>
        )}
      </DialogFooter>
    </DialogShell>
  )
}
