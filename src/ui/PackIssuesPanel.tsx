import { useMemo } from 'react'
import { validatePack } from '../core/mythicmobs/validate'
import type { FileRecord, ValidationIssue } from '../types'

interface PackIssuesPanelProps {
  files: FileRecord[]
  onNavigate: (path: string) => void
}

const TYPE_LABEL: Record<ValidationIssue['type'], string> = {
  missing_skill_reference: 'Missing skill',
  missing_droptable_reference: 'Missing drop table',
  missing_spawn_mob_reference: 'Missing mob',
}

export function PackIssuesPanel({ files, onNavigate }: PackIssuesPanelProps) {
  const issues = useMemo(() => validatePack(files), [files])

  if (issues.length === 0) {
    return (
      <div className="dep-panel">
        <p className="dep-empty">No missing skill, drop table, or spawn mob references.</p>
      </div>
    )
  }

  return (
    <div className="dep-panel">
      {issues.map((issue) => (
        <button
          key={`${issue.type}:${issue.filePath}:${issue.entityId}:${issue.missingId}`}
          type="button"
          className="dep-link pack-issue"
          onClick={() => onNavigate(issue.filePath)}
          title={issue.filePath}
        >
          <span className="dep-link-cat">{TYPE_LABEL[issue.type]}</span>
          <span className="dep-link-id">{issue.missingId}</span>
          <span className="dep-link-file">
            in {issue.entityId}
          </span>
        </button>
      ))}
    </div>
  )
}
