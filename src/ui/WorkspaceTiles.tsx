import type { WorkspaceKind } from '../types'
import type { MythicAddons } from '../core/workspaces/mythicAddons'
import { WORKSPACES, mythicToolsLabel } from '../core/workspaces/profiles'
import { Switch } from './Switch'

interface WorkspaceTilesProps {
  selected: WorkspaceKind | null
  onSelect: (id: WorkspaceKind) => void
  mythicAddons: MythicAddons
  onMythicAddonsChange: (partial: Partial<MythicAddons>) => void
}

export function WorkspaceTiles({
  selected,
  onSelect,
  mythicAddons,
  onMythicAddonsChange,
}: WorkspaceTilesProps) {
  const primary = WORKSPACES.filter((w) => !w.compact)
  const compact = WORKSPACES.filter((w) => w.compact)

  return (
    <div className="tile-layout">
      <div className="tile-grid">
        {primary.map((workspace) => {
          const active = selected === workspace.id
          const tools =
            workspace.id === 'mythicmobs'
              ? mythicToolsLabel(mythicAddons.mythicrpg)
              : workspace.tools

          if (workspace.id === 'mythicmobs') {
            return (
              <div
                key={workspace.id}
                className={active ? 'workspace-tile workspace-tile-mythic active' : 'workspace-tile workspace-tile-mythic'}
              >
                <button
                  type="button"
                  className="workspace-tile-select"
                  onClick={() => onSelect(workspace.id)}
                >
                  <h2>{workspace.name}</h2>
                  <p>{workspace.summary}</p>
                  <span className="tile-meta">
                    {tools.length > 0 ? tools.join(' · ') : 'YAML editor'}
                  </span>
                </button>
                <div
                  className="tile-addons"
                  role="group"
                  aria-label="Mythic add-ons"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="tile-addon-row">
                    <div className="tile-addon-copy">
                      <span className="tile-addon-title">MythicRPG</span>
                      <span className="tile-addon-hint">Spells, archetypes, and reagents</span>
                    </div>
                    <Switch
                      size="sm"
                      checked={mythicAddons.mythicrpg}
                      onChange={(next) => onMythicAddonsChange({ mythicrpg: next })}
                      aria-label="Enable MythicRPG tools"
                    />
                  </div>
                  <div className="tile-addon-row">
                    <div className="tile-addon-copy">
                      <span className="tile-addon-title">Crucible</span>
                      <span className="tile-addon-hint">Remembered for later. Extra item tools are not available yet.</span>
                    </div>
                    <Switch
                      size="sm"
                      checked={mythicAddons.crucible}
                      onChange={(next) => onMythicAddonsChange({ crucible: next })}
                      aria-label="Remember Crucible add-on"
                    />
                  </div>
                </div>
              </div>
            )
          }

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
                {tools.length > 0 ? tools.join(' · ') : 'YAML editor'}
              </span>
            </button>
          )
        })}
      </div>

      {compact.length > 0 ? (
        <div className="tile-grid tile-grid-compact" aria-label="Soaps plugins">
          {compact.map((workspace) => {
            const active = selected === workspace.id
            return (
              <button
                key={workspace.id}
                type="button"
                className={
                  active
                    ? 'workspace-tile workspace-tile-compact active'
                    : 'workspace-tile workspace-tile-compact'
                }
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
      ) : null}
    </div>
  )
}
