import { useMemo } from 'react'
import { validateSoapsQuest, type QuestValidationIssue } from '../../core/soapsquest/validate'
import type { FileRecord } from '../../types'

interface QuestIssuesPanelProps {
  files: FileRecord[]
  onNavigate: (path: string) => void
}

const TYPE_LABEL: Record<QuestValidationIssue['type'], string> = {
  missing_display: 'Missing display',
  missing_objectives: 'Missing objectives',
  unknown_tier: 'Unknown tier',
  unknown_difficulty: 'Unknown difficulty',
  missing_quest_reference: 'Missing quest ref',
}

export function QuestIssuesPanel({ files, onNavigate }: QuestIssuesPanelProps) {
  const issues = useMemo(() => validateSoapsQuest(files), [files])

  if (issues.length === 0) {
    return (
      <div className="dep-panel">
        <p className="dep-empty">No quest validation issues found in quests.yml.</p>
      </div>
    )
  }

  return (
    <div className="dep-panel">
      {issues.map((issue) => (
        <button
          key={`${issue.type}:${issue.filePath}:${issue.questId}:${issue.message}`}
          type="button"
          className="dep-link pack-issue"
          onClick={() => onNavigate(issue.filePath)}
          title={issue.message}
        >
          <span className="dep-link-cat">{TYPE_LABEL[issue.type]}</span>
          {issue.questId ? (
            <span className="dep-link-id">{issue.questId}</span>
          ) : null}
          <span className="dep-link-file">{issue.message}</span>
        </button>
      ))}
    </div>
  )
}
