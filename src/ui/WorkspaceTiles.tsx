import type { WorkspaceKind } from '../types'
import { WORKSPACES } from '../core/workspaces/profiles'

interface WorkspaceTilesProps {
  selected: WorkspaceKind | null
  onSelect: (id: WorkspaceKind) => void
}

export function WorkspaceTiles({ selected, onSelect }: WorkspaceTilesProps) {
  return (
    <div className="tile-grid">
      {WORKSPACES.map((workspace) => {
        const active = selected === workspace.id
        return (
          <button
            key={workspace.id}
            type="button"
            className={active ? 'workspace-tile active' : 'workspace-tile'}
            onClick={() => onSelect(workspace.id)}
          >
            <h2>{workspace.name}</h2>
            <p>{workspace.summary}</p>
            <span className="tile-meta">
              {workspace.tools.length > 0 ? workspace.tools.join(' · ') : 'YAML editor'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
