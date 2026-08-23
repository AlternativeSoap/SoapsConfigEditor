import { useMemo, useState } from 'react'
import {
  SKILL_CASTING_PRESETS,
  type SkillCastingMode,
} from '../../data/mmocore/skillCastingPresets'
import type { FileRecord } from '../../types'
import {
  DialogFooter,
  DialogHeader,
  DialogOption,
  DialogOptionGrid,
  DialogPanel,
  DialogPreviewBlock,
  DialogShell,
} from '../DialogShell'

interface SkillCastingDialogProps {
  files: FileRecord[]
  onClose: () => void
  onApply: (path: string, content: string) => void
}

const CONFIG_PATH = 'MMOCore/config.yml'

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

function parseCastingMode(content: string): SkillCastingMode | null {
  const match = content.match(/^\s*mode:\s*(\S+)/m)
  if (!match) return null
  const mode = match[1].toUpperCase()
  if (mode === 'KEY_COMBOS' || mode === 'SKILL_BAR' || mode === 'SKILL_SCROLLER' || mode === 'NONE') {
    return mode
  }
  return null
}

export function SkillCastingDialog({ files, onClose, onApply }: SkillCastingDialogProps) {
  const existing = files.find((f) => f.path === CONFIG_PATH)
  const initialMode = useMemo(
    () => parseCastingMode(existing?.content ?? '') ?? 'KEY_COMBOS',
    [existing?.content],
  )
  const [mode, setMode] = useState<SkillCastingMode>(initialMode)

  const preset = SKILL_CASTING_PRESETS.find((p) => p.mode === mode) ?? SKILL_CASTING_PRESETS[0]
  const hasExistingBlock = Boolean(existing?.content && /^skill-casting:/m.test(existing.content))

  function submit(): void {
    const next = mergeSkillCastingIntoConfig(existing?.content ?? '', preset.yaml)
    onApply(CONFIG_PATH, next)
  }

  return (
    <DialogShell size="md" labelledBy="casting-title" onClose={onClose}>
      <DialogHeader
        title="Skill casting mode"
        titleId="casting-title"
        onClose={onClose}
        lead="Choose how players cast MMOCore skills. This writes the skill-casting block in MMOCore/config.yml. Class files can still add optional key-combos on top."
      />

      <DialogPanel title="Casting mode">
        <DialogOptionGrid label="Casting mode">
          {SKILL_CASTING_PRESETS.map((p) => (
            <DialogOption
              key={p.mode}
              selected={mode === p.mode}
              title={p.label}
              description={p.hint}
              onClick={() => setMode(p.mode)}
            />
          ))}
        </DialogOptionGrid>
      </DialogPanel>

      <DialogPreviewBlock
        path="MMOCore/config.yml"
        code={preset.yaml}
        note={
          hasExistingBlock
            ? 'An existing skill-casting block will be replaced. Other settings in config.yml stay unchanged.'
            : 'A new skill-casting block will be added to config.yml.'
        }
      />

      <DialogFooter>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={submit}>
          Apply to config.yml
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
