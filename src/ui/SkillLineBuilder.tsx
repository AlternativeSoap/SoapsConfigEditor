import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  parseSkillLineParts,
  serializeSkillLineParts,
  type SkillLineCondition,
} from '../core/mythicmobs/skillLineParts'
import { resolveMythicCatalogs } from '../core/mythicmobs/resolveCatalogs'
import { toInlineConditionSnippet } from '../data/mythicmobs/conditions'
import {
  PRESET_CATEGORY_LABELS,
  SKILL_PRESETS,
  presetToFullYaml,
  type PresetCategory,
  type SkillPreset,
} from '../data/mythicmobs/projectilePresets'

interface SkillLineBuilderProps {
  value: string
  onConfirm: (line: string) => void
  onClose: () => void
  hideTriggers?: boolean
  /** When true, includes Crucible mechanics, targeters, triggers, and conditions. */
  crucibleEnabled?: boolean
  /** Loads cast lines into the create form and copies full YAML to the clipboard. */
  onApplyPresetPack?: (preset: SkillPreset) => void
}

type DropdownKind = 'mech' | 'targ' | 'trig' | 'cond'

export function SkillLineBuilder({
  value,
  onConfirm,
  onClose,
  hideTriggers,
  crucibleEnabled = false,
  onApplyPresetPack,
}: SkillLineBuilderProps) {
  const catalogs = useMemo(() => resolveMythicCatalogs(crucibleEnabled), [crucibleEnabled])
  const parsed = parseSkillLineParts(value)
  const [mechanic, setMechanic] = useState(parsed.mechanic)
  const [targeter, setTargeter] = useState(parsed.targeter)
  const [trigger, setTrigger] = useState(parsed.trigger)
  const [conditions, setConditions] = useState<SkillLineCondition[]>(parsed.conditions)
  const [chance, setChance] = useState(parsed.chance)
  const [health, setHealth] = useState(parsed.health)
  const [healthPercent, setHealthPercent] = useState(parsed.healthPercent)
  const [condInput, setCondInput] = useState('')
  const [mechSearch, setMechSearch] = useState('')
  const [targSearch, setTargSearch] = useState('')
  const [trigSearch, setTrigSearch] = useState('')
  const [condSearch, setCondSearch] = useState('')
  const [activeDropdown, setActiveDropdown] = useState<DropdownKind | null>(null)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [presetCategory, setPresetCategory] = useState<PresetCategory | 'all'>('all')
  const [presetSearch, setPresetSearch] = useState('')
  const [presetNotice, setPresetNotice] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  // Escape closes the builder. Outside-click is intentionally omitted so
  // picking from a dropdown cannot unmount the panel mid-selection.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeDropdown) {
          setActiveDropdown(null)
          return
        }
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, activeDropdown])

  // Close dropdown when clicking elsewhere inside the builder
  useEffect(() => {
    if (!activeDropdown) return
    function handler(e: MouseEvent) {
      const root = rootRef.current
      if (!root) return
      const target = e.target as Node
      if (!root.contains(target)) return
      const picker = (target as Element).closest?.('[data-slb-picker]')
      if (!picker) setActiveDropdown(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeDropdown])

  const preview = serializeSkillLineParts({
    mechanic,
    targeter,
    trigger,
    conditions,
    chance,
    health,
    healthPercent,
  })

  const filteredMechanics = catalogs.mechanics.filter(
    (m) =>
      !mechSearch ||
      m.id.toLowerCase().includes(mechSearch.toLowerCase()) ||
      m.aliases.some((a) => a.toLowerCase().includes(mechSearch.toLowerCase())),
  )
  const mechanicOptions = filteredMechanics.slice(0, 50)

  const filteredTargeters = catalogs.targeters.filter(
    (t) =>
      !targSearch ||
      t.id.toLowerCase().includes(targSearch.toLowerCase()) ||
      t.shorthand.some((s) => s.toLowerCase().includes(targSearch.toLowerCase())),
  )
  const targeterOptions = filteredTargeters.slice(0, 40)

  const filteredTriggers = catalogs.triggers.filter(
    (t) => !trigSearch || t.id.toLowerCase().includes(trigSearch.toLowerCase()),
  )
  const triggerOptions = filteredTriggers.slice(0, 40)

  const filteredConditions = catalogs.conditions.filter(
    (c) => !condSearch || c.id.toLowerCase().includes(condSearch.toLowerCase()),
  )
  const conditionOptions = filteredConditions.slice(0, 40)

  function addCondition(idOrSnippet: string, invert = false) {
    const entry = catalogs.conditions.find((c) => c.id === idOrSnippet)
    const snippet = toInlineConditionSnippet(entry?.insertSnippet ?? idOrSnippet).replace(/^[!?]/, '')
    if (!snippet) return
    if (!conditions.find((c) => c.id === snippet)) {
      setConditions([...conditions, { id: snippet, invert }])
    }
    setCondInput('')
    setCondSearch('')
    setActiveDropdown(null)
  }

  function removeCondition(id: string) {
    setConditions(conditions.filter((c) => c.id !== id))
  }

  function toggleInvert(id: string) {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, invert: !c.invert } : c)))
  }

  function pickMechanic(snippet: string) {
    setMechanic(snippet)
    setMechSearch('')
    setActiveDropdown(null)
  }

  function pickTargeter(snippet: string) {
    setTargeter(snippet)
    setTargSearch('')
    setActiveDropdown(null)
  }

  function pickTrigger(snippet: string) {
    setTrigger(snippet)
    setTrigSearch('')
    setActiveDropdown(null)
  }

  const stepDone = {
    mechanic: Boolean(mechanic),
    targeter: Boolean(targeter),
    trigger: Boolean(trigger) || Boolean(hideTriggers),
  }

  const filteredPresets = useMemo(() => {
    const q = presetSearch.toLowerCase().trim()
    return SKILL_PRESETS.filter((p) => {
      if (presetCategory !== 'all' && p.category !== presetCategory) return false
      if (!q) return true
      return (
        p.label.toLowerCase().includes(q) ||
        p.castSkillId.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    })
  }, [presetCategory, presetSearch])

  function loadPresetLine(preset: SkillPreset) {
    const { mechanic: m, targeter: t, trigger: tr } = parseSkillLineParts(preset.mainLine)
    setMechanic(m)
    setTargeter(t)
    if (!hideTriggers) setTrigger(tr)
    setPresetNotice(`Loaded ${preset.label}. Edit attrs, then use the line or apply the full pack.`)
  }

  async function applyPresetPack(preset: SkillPreset) {
    loadPresetLine(preset)
    onApplyPresetPack?.(preset)
    try {
      await navigator.clipboard.writeText(presetToFullYaml(preset))
      setPresetNotice(
        onApplyPresetPack
          ? `Applied ${preset.label}. Full YAML copied to the clipboard.`
          : `Copied full YAML for ${preset.label}.`,
      )
    } catch {
      setPresetNotice(`Applied ${preset.label}. Could not copy YAML. Use Copy full YAML in the Reference panel.`)
    }
  }

  return (
    <div className="slb-wrap" ref={rootRef} role="region" aria-label="Skill line builder">
      <div className="slb-header">
        <div className="slb-header-text">
          <span className="slb-title">Skill line builder</span>
          <span className="slb-subtitle">Start from a preset or pick each piece in order.</span>
        </div>
        <button type="button" className="slb-close" onClick={onClose} aria-label="Close builder">
          ✕
        </button>
      </div>

      <section className="slb-presets">
        <button
          type="button"
          className={`slb-presets-toggle${presetsOpen ? ' open' : ''}`}
          onClick={() => setPresetsOpen((o) => !o)}
          aria-expanded={presetsOpen}
        >
          Skill presets
          <span className="slb-presets-count">{SKILL_PRESETS.length}</span>
        </button>
        {presetsOpen ? (
          <div className="slb-presets-panel">
            <div className="slb-presets-toolbar">
              <input
                className="slb-input"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Search presets…"
                autoComplete="off"
              />
              <select
                className="slb-presets-filter"
                value={presetCategory}
                onChange={(e) => setPresetCategory(e.target.value as PresetCategory | 'all')}
                aria-label="Filter preset category"
              >
                <option value="all">All categories</option>
                {(Object.entries(PRESET_CATEGORY_LABELS) as [PresetCategory, string][]).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <ul className="slb-preset-list">
              {filteredPresets.map((preset) => (
                <li key={preset.id} className="slb-preset-item">
                  <div className="slb-preset-info">
                    <span className="slb-preset-name">{preset.label}</span>
                    <span className="slb-preset-meta">
                      {PRESET_CATEGORY_LABELS[preset.category]} · {preset.castSkillId}
                    </span>
                    <span className="slb-preset-desc">{preset.description}</span>
                  </div>
                  <div className="slb-preset-btns">
                    <button type="button" className="slb-preset-btn" onClick={() => loadPresetLine(preset)}>
                      Load line
                    </button>
                    {onApplyPresetPack ? (
                      <button type="button" className="slb-preset-btn primary" onClick={() => applyPresetPack(preset)}>
                        Apply pack
                      </button>
                    ) : (
                      <button type="button" className="slb-preset-btn" onClick={() => applyPresetPack(preset)}>
                        Copy full YAML
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {presetNotice ? <p className="slb-preset-notice">{presetNotice}</p> : null}
          </div>
        ) : null}
      </section>

      <ol className="slb-steps">
        <li className={`slb-step${stepDone.mechanic ? ' done' : ''}${activeDropdown === 'mech' ? ' active' : ''}`}>
          <div className="slb-step-head">
            <span className="slb-step-num">1</span>
            <label className="slb-field-label" htmlFor={`${listId}-mech`}>
              Mechanic
            </label>
          </div>
          <div className="slb-picker" data-slb-picker>
            <input
              id={`${listId}-mech`}
              className="slb-input"
              value={mechanic}
              onChange={(e) => {
                setMechanic(e.target.value)
                setMechSearch(e.target.value.replace(/\{.*/, ''))
                setActiveDropdown('mech')
              }}
              onFocus={() => {
                setMechSearch(mechanic.replace(/\{.*/, ''))
                setActiveDropdown('mech')
              }}
              placeholder="Search or type, e.g. damage{amount=5}"
              autoComplete="off"
            />
            {mechanic ? (
              <button type="button" className="slb-clear" onClick={() => setMechanic('')} aria-label="Clear mechanic">
                ✕
              </button>
            ) : null}
            {activeDropdown === 'mech' && mechanicOptions.length > 0 ? (
              <div className="slb-dropdown" role="listbox">
                {mechanicOptions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="slb-dd-item"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      pickMechanic(m.insertSnippet)
                    }}
                  >
                    <span className="slb-dd-id">{m.id}</span>
                    <span className="slb-dd-desc">{m.description}</span>
                  </button>
                ))}
                {filteredMechanics.length > mechanicOptions.length ? (
                  <p className="slb-dd-more">Type to narrow the list.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </li>

        <li className={`slb-step${stepDone.targeter ? ' done' : ''}${activeDropdown === 'targ' ? ' active' : ''}`}>
          <div className="slb-step-head">
            <span className="slb-step-num">2</span>
            <label className="slb-field-label" htmlFor={`${listId}-targ`}>
              Targeter
            </label>
          </div>
          <div className="slb-picker" data-slb-picker>
            <input
              id={`${listId}-targ`}
              className="slb-input"
              value={targeter}
              onChange={(e) => {
                setTargeter(e.target.value)
                setTargSearch(e.target.value.replace('@', ''))
                setActiveDropdown('targ')
              }}
              onFocus={() => {
                setTargSearch(targeter.replace('@', ''))
                setActiveDropdown('targ')
              }}
              placeholder="@NearestPlayer"
              autoComplete="off"
            />
            {targeter ? (
              <button type="button" className="slb-clear" onClick={() => setTargeter('')} aria-label="Clear targeter">
                ✕
              </button>
            ) : null}
            {activeDropdown === 'targ' && targeterOptions.length > 0 ? (
              <div className="slb-dropdown" role="listbox">
                {targeterOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="slb-dd-item"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      pickTargeter(t.insertSnippet)
                    }}
                  >
                    <span className="slb-dd-id">@{t.id}</span>
                    <span className="slb-dd-desc">{t.description}</span>
                  </button>
                ))}
                {filteredTargeters.length > targeterOptions.length ? (
                  <p className="slb-dd-more">Type to narrow the list.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </li>

        {!hideTriggers ? (
          <li className={`slb-step${stepDone.trigger ? ' done' : ''}${activeDropdown === 'trig' ? ' active' : ''}`}>
            <div className="slb-step-head">
              <span className="slb-step-num">3</span>
              <label className="slb-field-label" htmlFor={`${listId}-trig`}>
                Trigger
              </label>
            </div>
            <div className="slb-picker" data-slb-picker>
              <input
                id={`${listId}-trig`}
                className="slb-input"
                value={trigger}
                onChange={(e) => {
                  setTrigger(e.target.value)
                  setTrigSearch(e.target.value.replace('~', ''))
                  setActiveDropdown('trig')
                }}
                onFocus={() => {
                  setTrigSearch(trigger.replace('~', ''))
                  setActiveDropdown('trig')
                }}
                placeholder="~onAttack"
                autoComplete="off"
              />
              {trigger ? (
                <button type="button" className="slb-clear" onClick={() => setTrigger('')} aria-label="Clear trigger">
                  ✕
                </button>
              ) : null}
              {activeDropdown === 'trig' && triggerOptions.length > 0 ? (
                <div className="slb-dropdown" role="listbox">
                  {triggerOptions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="slb-dd-item"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        pickTrigger(t.insertSnippet)
                      }}
                    >
                      <span className="slb-dd-id">~{t.id}</span>
                      <span className="slb-dd-desc">{t.description}</span>
                    </button>
                  ))}
                  {filteredTriggers.length > triggerOptions.length ? (
                    <p className="slb-dd-more">Type to narrow the list.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ) : null}

        <li className={`slb-step optional${activeDropdown === 'cond' ? ' active' : ''}`}>
          <div className="slb-step-head">
            <span className="slb-step-num">{hideTriggers ? '3' : '4'}</span>
            <label className="slb-field-label" htmlFor={`${listId}-cond`}>
              Conditions <span className="slb-field-hint">optional</span>
            </label>
          </div>
          <div className="slb-conditions">
            {conditions.map((c) => (
              <span key={c.id} className={`slb-chip${c.invert ? ' slb-chip-inverted' : ''}`}>
                <button
                  type="button"
                  className="slb-chip-invert"
                  title={c.invert ? 'Negated. Click to remove negation.' : 'Click to negate'}
                  onClick={() => toggleInvert(c.id)}
                >
                  {c.invert ? '!' : '?'}
                </button>
                {c.id}
                <button
                  type="button"
                  className="slb-chip-remove"
                  onClick={() => removeCondition(c.id)}
                  aria-label={`Remove ${c.id}`}
                >
                  ✕
                </button>
              </span>
            ))}
            <div className="slb-cond-add" data-slb-picker>
              <input
                id={`${listId}-cond`}
                className="slb-input slb-cond-input"
                value={condInput}
                onChange={(e) => {
                  setCondInput(e.target.value)
                  setCondSearch(e.target.value)
                  setActiveDropdown('cond')
                }}
                onFocus={() => {
                  setCondSearch(condInput)
                  setActiveDropdown('cond')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && condInput.trim()) {
                    addCondition(condInput.trim())
                    e.preventDefault()
                  }
                }}
                placeholder="Add condition…"
                autoComplete="off"
              />
              {activeDropdown === 'cond' && conditionOptions.length > 0 ? (
                <div className="slb-dropdown" role="listbox">
                  {conditionOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="slb-dd-item"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        addCondition(c.id)
                      }}
                    >
                      <span className="slb-dd-id">{c.id}</span>
                      <span className="slb-dd-desc">{c.description}</span>
                    </button>
                  ))}
                  {filteredConditions.length > conditionOptions.length ? (
                    <p className="slb-dd-more">Type to narrow the list.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="slb-filters">
            <label className="slb-filter">
              <span className="slb-field-label">
                Chance <span className="slb-field-hint">?chance&#123;chance=…&#125;</span>
              </span>
              <input
                className="slb-input"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={chance}
                onChange={(e) => setChance(e.target.value)}
                placeholder="0.3"
              />
            </label>
            <label className="slb-filter">
              <span className="slb-field-label">
                Health <span className="slb-field-hint">HP, e.g. &lt;50</span>
              </span>
              <input
                className="slb-input"
                value={health}
                onChange={(e) => setHealth(e.target.value)}
                placeholder="e.g. <50"
              />
            </label>
            <label className="slb-filter">
              <span className="slb-field-label">
                Health % <span className="slb-field-hint">e.g. &lt;50%</span>
              </span>
              <input
                className="slb-input"
                value={healthPercent}
                onChange={(e) => setHealthPercent(e.target.value)}
                placeholder="e.g. <50%"
              />
            </label>
          </div>
        </li>
      </ol>

      <div className="slb-preview">
        <span className="slb-preview-label">Preview</span>
        <code className="slb-preview-code">{preview || <em>Fill step 1 to preview the line</em>}</code>
      </div>

      <div className="slb-actions">
        <button type="button" className="slb-btn-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="slb-btn-confirm"
          disabled={!mechanic}
          onClick={() => {
            if (mechanic) onConfirm(preview)
          }}
        >
          Use line
        </button>
      </div>
    </div>
  )
}
