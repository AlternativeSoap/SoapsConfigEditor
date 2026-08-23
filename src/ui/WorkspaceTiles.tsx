import type { CSSProperties } from 'react'
import type { WorkspaceKind } from '../types'
import type { MythicAddons } from '../core/workspaces/mythicAddons'
import { WORKSPACES } from '../core/workspaces/profiles'
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
  const focused = selected != null

  return (
    <div className={focused ? 'tile-layout is-focused' : 'tile-layout'}>
      <div className="tile-grid">
        {primary.map((workspace, index) => {
          const active = selected === workspace.id
          const delayStyle = { '--tile-delay': `${0.04 + index * 0.06}s` } as CSSProperties

          if (workspace.id === 'mythicmobs') {
            return (
              <div
                key={workspace.id}
                className={
                  active
                    ? 'workspace-tile workspace-tile-mythic active'
                    : 'workspace-tile workspace-tile-mythic'
                }
                style={delayStyle}
              >
                <button
                  type="button"
                  className="workspace-tile-select"
                  onClick={() => onSelect(workspace.id)}
                >
                  <h2>{workspace.name}</h2>
                  <p>{workspace.summary}</p>
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
                      <span className="tile-addon-hint">Spells, archetypes, reagents</span>
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
                      <span className="tile-addon-hint">Items, bags, sets, augments</span>
                    </div>
                    <Switch
                      size="sm"
                      checked={mythicAddons.crucible}
                      onChange={(next) => onMythicAddonsChange({ crucible: next })}
                      aria-label="Enable Crucible tools"
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
              style={delayStyle}
              onClick={() => onSelect(workspace.id)}
            >
              <h2>{workspace.name}</h2>
              <p>{workspace.summary}</p>
            </button>
          )
        })}
      </div>

      {compact.length > 0 ? (
        <div className="tile-grid tile-grid-compact" aria-label="Soaps plugins">
          {compact.map((workspace, index) => {
            const active = selected === workspace.id
            const delayStyle = {
              '--tile-delay': `${0.04 + (primary.length + index) * 0.06}s`,
            } as CSSProperties
            return (
              <button
                key={workspace.id}
                type="button"
                className={
                  active
                    ? 'workspace-tile workspace-tile-compact active'
                    : 'workspace-tile workspace-tile-compact'
                }
                style={delayStyle}
                onClick={() => onSelect(workspace.id)}
              >
                <h2>{workspace.name}</h2>
                <p>{workspace.summary}</p>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
