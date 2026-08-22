import { useEffect, useState } from 'react'
import {
  SKILL_CASTING_PRESETS,
  type SkillCastingMode,
} from '../../data/mmocore/skillCastingPresets'
import type { FileRecord } from '../../types'

interface SkillCastingDialogProps {
  files: FileRecord[]
  onClose: () => void
  onApply: (path: string, content: string) => void
}

function mergeSkillCastingIntoConfig(existing: string, castingYaml: string): string {
  const block = castingYaml.trimEnd()
  if (!existing.trim()) {
    return `# MMOCore config\n${block}\n`
  }
  if (/^skill-casting:/m.test(existing)) {
    return existing.replace(
      /^skill-casting:[\s\S]*?(?=\n[a-zA-Z0-9_-]+:|\n*$)/m,
      `${block}\n`,
    )
  }
  return `${existing.trimEnd()}\n\n${block}\n`
}

export function SkillCastingDialog({ files, onClose, onApply }: SkillCastingDialogProps) {
  const path = 'MMOCore/config.yml'
  const existing = files.find((f) => f.path === path)
  const [mode, setMode] = useState<SkillCastingMode>('KEY_COMBOS')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const preset = SKILL_CASTING_PRESETS.find((p) => p.mode === mode) ?? SKILL_CASTING_PRESETS[0]

  function submit(): void {
    const next = mergeSkillCastingIntoConfig(existing?.content ?? '', preset.yaml)
    onApply(path, next)
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg"
        role="dialog"
        aria-labelledby="casting-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <h2 id="casting-title">Skill casting mode</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="dialog-fields">
          <p>
            Writes a skill-casting block into MMOCore/config.yml. Class files can still define
            optional key-combos; most servers keep casting global here.
          </p>
          <div className="wz-preset-row">
            {SKILL_CASTING_PRESETS.map((p) => (
              <button
                key={p.mode}
                type="button"
                className={mode === p.mode ? 'chip chip-active' : 'chip'}
                onClick={() => setMode(p.mode)}
                title={p.hint}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="wz-card-lead">{preset.hint}</p>
          <pre className="dialog-preview">{preset.yaml}</pre>
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={submit}>
            Apply to config.yml
          </button>
        </div>
      </div>
    </div>
  )
}
