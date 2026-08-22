import { useEffect, useState } from 'react'
import type { AcPrefs, SavePrefs, ThemeMode } from '../types'
import { Switch } from './Switch'

interface SettingsMenuProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  open: boolean
  onOpen: () => void
  onClose: () => void
  acPrefs: AcPrefs
  onAcPrefsChange: (patch: Partial<AcPrefs>) => void
  /** Show the Autocomplete section (only for MythicMobs workspace) */
  showAcSettings: boolean
  savePrefs: SavePrefs
  onSavePrefsChange: (patch: Partial<SavePrefs>) => void
  onBackupNow: () => Promise<void>
  onPickBackupFolder: () => Promise<void>
  /** True when a live folder handle is available (false after reload until re-picked) */
  backupReady: boolean
  /** Compact gear button for the top bar */
  iconOnly?: boolean
}

const AC_TOGGLES: { key: keyof AcPrefs; label: string; hint: string }[] = [
  { key: 'mechanics',      label: 'Mechanics',     hint: 'After "  - " on a skill line' },
  { key: 'targeters',      label: 'Targeters',     hint: 'After "@"' },
  { key: 'triggers',       label: 'Triggers',      hint: 'After "~"' },
  { key: 'conditions',     label: 'Conditions',    hint: 'After "?" or "!" on a skill line' },
  { key: 'packIds',        label: 'Pack IDs',      hint: 'Skills, mobs, items, and droptables from loaded files' },
  { key: 'activateOnTyping', label: 'Auto-show',   hint: 'Show suggestions while typing (disable for manual Ctrl+Space only)' },
]

const TRIGGERS_HELP = [
  { trigger: '@',        desc: 'Targeters and shorthands (@PIR, @T, …)', example: '@NearestPlayer{r=10}' },
  { trigger: '~',        desc: 'Triggers; ~onTimer: suggests tick intervals', example: '~onTimer:200' },
  { trigger: '  - ',     desc: 'Mechanics, conditions, or pack skill IDs (context-aware)', example: '  - damage{amount=5}' },
  { trigger: '{…}',      desc: 'Attribute names and values (sounds, true/false, particles, materials, …)', example: 'sound=entity.player.levelup' },
  { trigger: 'Type: ',   desc: 'Entity type on a mob or random spawn', example: 'Type: ZOMBIE' },
  { trigger: 'skill{s=', desc: 'Skill ID in a mechanic or onHit=/skill= attrs', example: 'skill{s=MY_SKILL}' },
  { trigger: '?',        desc: 'Inline condition', example: '?day' },
  { trigger: '!',        desc: 'Negated inline condition', example: '!day' },
  { trigger: '<',        desc: 'Placeholder variables in messages', example: '<caster.name>' },
  { trigger: 'Ctrl+Space', desc: 'Force-open suggestions anywhere', example: '' },
]

const AUTOSAVE_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
]

const BACKUP_EVERY_OPTIONS: { value: SavePrefs['backupEvery']; label: string }[] = [
  { value: 'every-save', label: 'Every save' },
  { value: 1,  label: 'Every save' },
  { value: 5,  label: 'Every 5 saves' },
  { value: 10, label: 'Every 10 saves' },
]

export function SettingsMenu({
  theme,
  onThemeChange,
  open,
  onOpen,
  onClose,
  acPrefs,
  onAcPrefsChange,
  showAcSettings,
  savePrefs,
  onSavePrefsChange,
  onBackupNow,
  onPickBackupFolder,
  backupReady,
  iconOnly = false,
}: SettingsMenuProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      <button
        type="button"
        className={iconOnly ? 'settings-trigger icon-only' : 'settings-trigger'}
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
        onClick={onOpen}
      >
        {iconOnly ? '⚙' : 'Settings'}
      </button>
      {open ? (
        <div className="dialog-backdrop" role="presentation" onClick={onClose}>
          <div
            className="dialog dialog-settings"
            role="dialog"
            aria-labelledby="settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="settings-title">Settings</h2>
            <p>These apply to this editor on this computer.</p>

            {/* ── Theme ── */}
            <div className="settings-section">
              <div className="setting-row">
                <span className="setting-label">Theme</span>
                <div className="segmented-control" role="group" aria-label="Theme">
                  {(['dark', 'light'] as ThemeMode[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={theme === option ? 'seg-btn active' : 'seg-btn'}
                      onClick={() => onThemeChange(option)}
                      aria-pressed={theme === option}
                    >
                      {option === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Autocomplete ── only in MythicMobs workspace ── */}
            {showAcSettings && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <span className="settings-section-title">Autocomplete</span>
                  <button
                    type="button"
                    className={`settings-help-btn ${helpOpen ? 'active' : ''}`}
                    onClick={() => setHelpOpen((v) => !v)}
                    aria-expanded={helpOpen}
                  >
                    {helpOpen ? 'Hide help' : 'How it works'}
                  </button>
                </div>

                {helpOpen && (
                  <div className="ac-help">
                    <p className="ac-help-intro">
                      While editing a MythicMobs YAML file, the editor suggests completions based on what you type. Each suggestion type is triggered by a different context:
                    </p>
                    <div className="ac-help-table">
                      {TRIGGERS_HELP.map((r) => (
                        <div key={r.trigger} className="ac-help-row">
                          <code className="ac-help-trigger">{r.trigger}</code>
                          <span className="ac-help-desc">{r.desc}</span>
                          {r.example && <code className="ac-help-example">{r.example}</code>}
                        </div>
                      ))}
                    </div>
                    <p className="ac-help-note">
                      Accept a suggestion with <kbd>Tab</kbd> or <kbd>Enter</kbd>. Close the popup with <kbd>Escape</kbd>.
                    </p>
                  </div>
                )}

                <div className="setting-row">
                  <span className="setting-label">Enable autocomplete</span>
                  <Switch
                    checked={acPrefs.enabled}
                    onChange={(v) => onAcPrefsChange({ enabled: v })}
                    aria-label="Enable autocomplete"
                  />
                </div>

                {acPrefs.enabled && (
                  <div className="ac-toggles">
                    {AC_TOGGLES.map(({ key, label, hint }) => (
                      <div key={key} className="ac-toggle-row">
                        <div className="ac-toggle-text">
                          <span className="ac-toggle-label">{label}</span>
                          <span className="ac-toggle-hint">{hint}</span>
                        </div>
                        <Switch
                          checked={acPrefs[key] as boolean}
                          onChange={(v) => onAcPrefsChange({ [key]: v })}
                          aria-label={label}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Save & Backup ── */}
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-title">Save &amp; Backup</span>
              </div>

              {/* Auto-save */}
              <div className="setting-row">
                <div className="ac-toggle-text">
                  <span className="setting-label">Auto-save</span>
                  <span className="ac-toggle-hint">Silently saves all edited files on a timer</span>
                </div>
                <Switch
                  checked={savePrefs.autoSave}
                  onChange={(v) => onSavePrefsChange({ autoSave: v })}
                  aria-label="Auto-save"
                />
              </div>

              {savePrefs.autoSave && (
                <div className="setting-row">
                  <span className="setting-label">Save every</span>
                  <div className="segmented-control" role="group">
                    {AUTOSAVE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={savePrefs.autoSaveInterval === opt.value ? 'seg-btn active' : 'seg-btn'}
                        onClick={() => onSavePrefsChange({ autoSaveInterval: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Backup folder */}
              <div className="setting-row">
                <div className="ac-toggle-text">
                  <span className="setting-label">Backup folder</span>
                  <span className="ac-toggle-hint">
                    {!savePrefs.backupFolder
                      ? 'No folder selected'
                      : backupReady
                        ? savePrefs.backupFolder
                        : `${savePrefs.backupFolder} (choose again after reload)`}
                  </span>
                </div>
                <button type="button" className="settings-help-btn" onClick={onPickBackupFolder}>
                  {backupReady ? 'Change…' : 'Choose…'}
                </button>
              </div>

              {backupReady && (
                <>
                  <div className="setting-row">
                    <div className="ac-toggle-text">
                      <span className="setting-label">Auto-backup</span>
                      <span className="ac-toggle-hint">ZIP all files automatically on save</span>
                    </div>
                    <Switch
                      checked={savePrefs.autoBackup}
                      onChange={(v) => onSavePrefsChange({ autoBackup: v })}
                      aria-label="Auto-backup"
                    />
                  </div>

                  {savePrefs.autoBackup && (
                    <div className="setting-row">
                      <span className="setting-label">Backup every</span>
                      <div className="segmented-control" role="group">
                        {BACKUP_EVERY_OPTIONS.filter((o) => o.value !== 1).map((opt) => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            className={savePrefs.backupEvery === opt.value ? 'seg-btn active' : 'seg-btn'}
                            onClick={() => onSavePrefsChange({ backupEvery: opt.value })}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="setting-row">
                    <span className="setting-label">Manual backup</span>
                    <button
                      type="button"
                      className="settings-help-btn"
                      disabled={backingUp}
                      onClick={async () => {
                        setBackingUp(true)
                        await onBackupNow()
                        setBackingUp(false)
                        onClose()
                      }}
                    >
                      {backingUp ? 'Backing up…' : 'Backup now'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="dialog-actions">
              <button type="button" className="primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
