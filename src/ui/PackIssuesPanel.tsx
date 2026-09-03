import { useMemo, useState } from 'react'
import { validatePack } from '../core/mythicmobs/validate'
import { detectTemplateHints, type TemplateHint } from '../core/mythicmobs/templateHints'
import { TemplateHintDialog } from './TemplateHintDialog'
import type { FileRecord, ValidationIssue } from '../types'

interface PackIssuesPanelProps {
  files: FileRecord[]
  onNavigate: (path: string) => void
  onApplyPatches: (patches: Record<string, string>, summary: string) => void
}

const TYPE_LABEL: Record<ValidationIssue['type'], string> = {
  missing_skill_reference: 'Missing skill',
  missing_droptable_reference: 'Unresolved drop',
  missing_spawn_mob_reference: 'Missing mob',
  missing_equipment_set_reference: 'Missing equipment set',
  missing_augment_type_reference: 'Missing augment type',
}

export function countPackSidebarItems(files: FileRecord[]): number {
  return validatePack(files).length + detectTemplateHints(files).length
}

export function PackIssuesPanel({ files, onNavigate, onApplyPatches }: PackIssuesPanelProps) {
  const issues = useMemo(() => validatePack(files), [files])
  const hints = useMemo(() => detectTemplateHints(files), [files])
  const [reviewHint, setReviewHint] = useState<TemplateHint | null>(null)

  const showIssues = issues.length > 0
  const showHints = hints.length > 0

  if (!showIssues && !showHints) {
    return (
      <div className="dep-panel">
        <p className="dep-empty">No missing skill, drop, spawn mob, equipment set, or augment type references.</p>
      </div>
    )
  }

  return (
    <div className="dep-panel">
      {showIssues &&
        issues.map((issue) => (
          <button
            key={`${issue.type}:${issue.filePath}:${issue.entityId}:${issue.missingId}`}
            type="button"
            className="dep-link pack-issue"
            onClick={() => onNavigate(issue.filePath)}
            title={issue.filePath}
          >
            <span className="dep-link-cat">{TYPE_LABEL[issue.type]}</span>
            <span className="dep-link-id">{issue.missingId}</span>
            <span className="dep-link-file">in {issue.entityId}</span>
          </button>
        ))}

      {showHints && (
        <div className="dep-section pack-hints">
          <div className="dep-section-label">Template hints · {hints.length}</div>
          {hints.map((hint) => (
            <div
              key={`${hint.kind}:${hint.templateId}:${hint.mobIds.join(',')}:${hint.keys.join(',')}`}
              className="pack-hint-row"
            >
              <p className="pack-hint-copy">{hint.message}</p>
              <button
                type="button"
                className="pack-hint-review"
                onClick={() => setReviewHint(hint)}
              >
                Review
              </button>
            </div>
          ))}
        </div>
      )}

      {reviewHint && (
        <TemplateHintDialog
          hint={reviewHint}
          files={files}
          onClose={() => setReviewHint(null)}
          onApply={(patches, summary) => {
            onApplyPatches(patches, summary)
            setReviewHint(null)
          }}
        />
      )}
    </div>
  )
}
