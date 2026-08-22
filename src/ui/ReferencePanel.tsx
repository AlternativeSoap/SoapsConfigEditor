import { useMemo, useState } from 'react'
import {
  MECHANIC_CATEGORY_LABELS,
  MECHANICS,
  type MechanicCategory,
  type MechanicEntry,
  type MechanicAttr,
} from '../data/mythicmobs/mechanics'
import { CONDITION_TYPE_LABELS, CONDITIONS, toInlineConditionSnippet, type ConditionEntry, type ConditionType } from '../data/mythicmobs/conditions'
import { TARGETER_KIND_LABELS, TARGETERS, type TargeterEntry, type TargeterKind } from '../data/mythicmobs/targeters'
import { TRIGGERS, type TriggerEntry } from '../data/mythicmobs/triggers'
import {
  PRESET_CATEGORY_LABELS,
  SKILL_PRESETS,
  presetToFullYaml,
  presetToYaml,
  type PresetCategory,
  type SkillPreset,
} from '../data/mythicmobs/projectilePresets'
import { attrsFromInsertSnippet, type SkillLineContext } from '../core/mythicmobs/skillLineAttrs'

type Tab = 'presets' | 'mechanics' | 'targeters' | 'triggers' | 'conditions'

interface ReferencePanelProps {
  onInsert: (snippet: string) => void
  /** Appends the cast skill and all companion metaskills to the open file. */
  onInsertPreset: (yaml: string) => void
  onInsertMechanicAttr: (mechanicId: string, attr: MechanicAttr) => void
  onInsertTargeterAttr: (targeterId: string, attr: MechanicAttr) => void
  onInsertConditionAttr: (conditionId: string, attr: MechanicAttr) => void
  lineContext: SkillLineContext
}

const ATTR_TYPE_COLOR: Record<string, string> = {
  number: 'ref-attr-number',
  boolean: 'ref-attr-boolean',
  string: 'ref-attr-string',
  enum: 'ref-attr-enum',
  skill: 'ref-attr-skill',
}

function AttrHints({
  attrs,
  presentAttrs,
  onInsert,
}: {
  attrs: MechanicAttr[]
  presentAttrs: string[]
  onInsert: (attr: MechanicAttr) => void
}) {
  const present = new Set(presentAttrs.map((a) => a.toLowerCase()))
  return (
    <div className="ref-attr-list">
      {attrs.map((a) => {
        const snippet = a.default !== undefined ? `${a.name}=${a.default}` : `${a.name}=`
        const added = present.has(a.name.toLowerCase())
        return (
          <div key={a.name} className="ref-attr-row">
            <button
              type="button"
              className="ref-attr-add"
              title={added ? `${a.name} is already on this line` : `Add: ${snippet}`}
              disabled={added}
              onClick={() => onInsert(a)}
            >
              +
            </button>
            <span className="ref-attr-name">{a.name}</span>
            <span className={`ref-attr-type ${ATTR_TYPE_COLOR[a.type] ?? ''}`}>{a.type}</span>
            {a.default !== undefined && (
              <span className="ref-attr-default">={a.default}</span>
            )}
            {a.desc && <span className="ref-attr-desc">{a.desc}</span>}
          </div>
        )
      })}
    </div>
  )
}

export function ReferencePanel({
  onInsert,
  onInsertPreset,
  onInsertMechanicAttr,
  onInsertTargeterAttr,
  onInsertConditionAttr,
  lineContext,
}: ReferencePanelProps) {
  const [tab, setTab] = useState<Tab>('presets')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<MechanicCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<PresetCategory | 'all'>('all')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'presets', label: 'Presets' },
    { id: 'mechanics', label: 'Mechanics' },
    { id: 'targeters', label: 'Targeters' },
    { id: 'triggers', label: 'Triggers' },
    { id: 'conditions', label: 'Conditions' },
  ]

  const query = search.toLowerCase().trim()

  const filteredMechanics = useMemo(() => {
    return MECHANICS.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
      if (!query) return true
      return (
        m.id.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.aliases.some((a) => a.toLowerCase().includes(query))
      )
    })
  }, [query, categoryFilter])

  const filteredTargeters = useMemo<TargeterEntry[]>(() => {
    if (!query) return TARGETERS
    return TARGETERS.filter(
      (t) =>
        t.id.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.shorthand.some((s) => s.toLowerCase().includes(query)),
    )
  }, [query])

  const filteredTriggers = useMemo<TriggerEntry[]>(() => {
    if (!query) return TRIGGERS
    return TRIGGERS.filter(
      (t) =>
        t.id.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query),
    )
  }, [query])

  const filteredConditions = useMemo<ConditionEntry[]>(() => {
    if (!query) return CONDITIONS
    return CONDITIONS.filter(
      (c) =>
        c.id.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query),
    )
  }, [query])

  const filteredPresets = useMemo(() => {
    return SKILL_PRESETS.filter((p) => {
      if (presetCategoryFilter !== 'all' && p.category !== presetCategoryFilter) return false
      if (!query) return true
      return (
        p.label.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      )
    })
  }, [query, presetCategoryFilter])

  const presetCategories = Object.entries(PRESET_CATEGORY_LABELS) as [PresetCategory, string][]

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard unavailable */
    }
  }
  const mechanicCategories = Object.entries(MECHANIC_CATEGORY_LABELS) as [MechanicCategory, string][]
  const targeterKinds = Object.entries(TARGETER_KIND_LABELS) as [TargeterKind, string][]
  const conditionTypes = Object.entries(CONDITION_TYPE_LABELS) as [ConditionType, string][]

  function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>()
    for (const item of arr) {
      const k = key(item)
      const group = map.get(k) ?? []
      group.push(item)
      map.set(k, group)
    }
    return map
  }

  return (
    <div className="ref-panel">
      <div className="ref-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={tab === t.id ? 'ref-tab active' : 'ref-tab'}
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id)
              setSearch('')
              setCategoryFilter('all')
              setPresetCategoryFilter('all')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ref-search-row">
        <input
          className="ref-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab}…`}
          aria-label={`Search ${tab}`}
        />
      </div>

      {tab === 'mechanics' && (
        <div className="ref-filter-row">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as MechanicCategory | 'all')}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {mechanicCategories.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {tab === 'presets' && (
        <div className="ref-filter-row">
          <select
            value={presetCategoryFilter}
            onChange={(e) => setPresetCategoryFilter(e.target.value as PresetCategory | 'all')}
            aria-label="Filter presets by category"
          >
            <option value="all">All categories</option>
            {presetCategories.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="ref-list">
        {tab === 'mechanics' && (() => {
          const grouped = groupBy(filteredMechanics, (m) => m.category)
          const categories = categoryFilter !== 'all'
            ? [categoryFilter]
            : (Object.keys(MECHANIC_CATEGORY_LABELS) as MechanicCategory[])
          return categories.map((cat) => {
            const items = grouped.get(cat)
            if (!items || items.length === 0) return null
            return (
              <div key={cat} className="ref-group">
                <div className="ref-group-label">{MECHANIC_CATEGORY_LABELS[cat]}</div>
                {items.map((m: MechanicEntry) => {
                  const isExpanded = expandedId === m.id
                  const hasAttrs = m.attributes && m.attributes.length > 0
                  return (
                    <div key={m.id} className={`ref-entry ${isExpanded ? 'ref-entry-expanded' : ''}`}>
                      <div className="ref-entry-info">
                        <div className="ref-entry-header">
                          <span className="ref-entry-id">{m.id}</span>
                          {hasAttrs && (
                            <button
                              type="button"
                              className="ref-expand-btn"
                              aria-label={isExpanded ? 'Collapse attributes' : 'Show attributes'}
                              onClick={() => setExpandedId(isExpanded ? null : m.id)}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          )}
                        </div>
                        <span className="ref-entry-desc">{m.description}</span>
                        {isExpanded && hasAttrs && (
                          <AttrHints
                            attrs={m.attributes!}
                            presentAttrs={lineContext.mechanicId === m.id ? lineContext.presentAttrs : []}
                            onInsert={(attr) => onInsertMechanicAttr(m.id, attr)}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="ref-add-btn"
                        title={`Add: ${m.insertSnippet}`}
                        onClick={() => onInsert(m.insertSnippet)}
                      >
                        Add
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })
        })()}

        {tab === 'presets' && (
          <>
            <p className="ref-note">
              Ready-made projectile patterns. Each preset uses its own skill ids (for example{' '}
              <code>PRISM_PIN</code>). Add appends the cast skill and every companion to the open file.
            </p>
            {filteredPresets.map((preset: SkillPreset) => {
              const isExpanded = expandedId === preset.id
              const companionYaml = preset.companions.length > 0 ? presetToYaml(preset) : ''
              const fullYaml = presetToFullYaml(preset)
              return (
                <div key={preset.id} className={`ref-entry ref-preset-entry ${isExpanded ? 'ref-entry-expanded' : ''}`}>
                  <div className="ref-entry-info">
                    <div className="ref-entry-header">
                      <span className="ref-entry-id">{preset.label}</span>
                      <span className="ref-preset-badge">{PRESET_CATEGORY_LABELS[preset.category]}</span>
                      <span className="ref-preset-cast-id">{preset.castSkillId}</span>
                      {(preset.companions.length > 0 || preset.tips.length > 0) && (
                        <button
                          type="button"
                          className="ref-expand-btn"
                          aria-label={isExpanded ? 'Collapse preset details' : 'Show preset details'}
                          onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                    <span className="ref-entry-desc">{preset.description}</span>
                    <code className="ref-preset-line">{preset.mainLine}</code>
                    {isExpanded && (
                      <div className="ref-preset-details">
                        {preset.tips.length > 0 && (
                          <ul className="ref-preset-tips">
                            {preset.tips.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        )}
                        {companionYaml && (
                          <>
                            <pre className="ref-preset-yaml">{companionYaml}</pre>
                            <button
                              type="button"
                              className="ref-copy-btn"
                              onClick={() => copyText(companionYaml)}
                            >
                              Copy companion YAML
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ref-preset-actions">
                    <button
                      type="button"
                      className="ref-copy-btn"
                      onClick={() => copyText(fullYaml)}
                    >
                      Copy full YAML
                    </button>
                    <button
                      type="button"
                      className="ref-add-btn"
                      title={`Add ${preset.castSkillId} and companion skills`}
                      onClick={() => onInsertPreset(fullYaml)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {tab === 'targeters' && (() => {
          const grouped = groupBy(filteredTargeters, (t) => t.kind)
          return targeterKinds.map(([kind, label]) => {
            const items = grouped.get(kind)
            if (!items || items.length === 0) return null
            return (
              <div key={kind} className="ref-group">
                <div className="ref-group-label">{label}</div>
                {items.map((t: TargeterEntry) => {
                  const isExpanded = expandedId === t.id
                  const snippetAttrs = attrsFromInsertSnippet(t.insertSnippet)
                  const hasAttrs = snippetAttrs.length > 0
                  return (
                  <div key={t.id} className={`ref-entry ${isExpanded ? 'ref-entry-expanded' : ''}`}>
                    <div className="ref-entry-info">
                      <div className="ref-entry-header">
                        <span className="ref-entry-id">@{t.id}</span>
                        {hasAttrs && (
                          <button
                            type="button"
                            className="ref-expand-btn"
                            aria-label={isExpanded ? 'Collapse attributes' : 'Show attributes'}
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                      <span className="ref-entry-desc">{t.description}</span>
                      {t.shorthand.length > 0 && (
                        <span className="ref-entry-aliases">{t.shorthand.join(', ')}</span>
                      )}
                      {isExpanded && hasAttrs && (
                        <AttrHints
                          attrs={snippetAttrs}
                          presentAttrs={lineContext.targeters.get(t.id.toLowerCase()) ?? []}
                          onInsert={(attr) => onInsertTargeterAttr(t.id, attr)}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="ref-add-btn"
                      title={`Add: ${t.insertSnippet}`}
                      onClick={() => onInsert(t.insertSnippet)}
                    >
                      Add
                    </button>
                  </div>
                  )
                })}
              </div>
            )
          })
        })()}

        {tab === 'triggers' && (
          <>
            <p className="ref-note">
              Triggers go on mob skill lines only. Do not use them inside metaskills.
              Timer format: <code>~onTimer:200</code>
            </p>
            {filteredTriggers.map((t: TriggerEntry) => (
              <div key={t.id} className="ref-entry">
                <div className="ref-entry-info">
                  <span className="ref-entry-id">~{t.id}</span>
                  <span className="ref-entry-desc">{t.description}</span>
                  {t.notes && <span className="ref-entry-aliases">{t.notes}</span>}
                </div>
                <button
                  type="button"
                  className="ref-add-btn"
                  title={`Add: ${t.insertSnippet}`}
                  onClick={() => onInsert(t.insertSnippet)}
                >
                  Add
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'conditions' && (() => {
          const grouped = groupBy(filteredConditions, (c) => c.type)
          return conditionTypes.map(([type, label]) => {
            const items = grouped.get(type)
            if (!items || items.length === 0) return null
            return (
              <div key={type} className="ref-group">
                <div className="ref-group-label">{label}</div>
                {items.map((c: ConditionEntry) => {
                  const isExpanded = expandedId === c.id
                  const snippetAttrs = attrsFromInsertSnippet(c.insertSnippet)
                  const hasAttrs = snippetAttrs.length > 0
                  return (
                  <div key={c.id} className={`ref-entry ${isExpanded ? 'ref-entry-expanded' : ''}`}>
                    <div className="ref-entry-info">
                      <div className="ref-entry-header">
                        <span className="ref-entry-id">{c.id}</span>
                        {hasAttrs && (
                          <button
                            type="button"
                            className="ref-expand-btn"
                            aria-label={isExpanded ? 'Collapse attributes' : 'Show attributes'}
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                      <span className="ref-entry-desc">{c.description}</span>
                      {isExpanded && hasAttrs && (
                        <AttrHints
                          attrs={snippetAttrs}
                          presentAttrs={lineContext.conditions.get(c.id.toLowerCase()) ?? []}
                          onInsert={(attr) => onInsertConditionAttr(c.id, attr)}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="ref-add-btn"
                      title={`Add: ${toInlineConditionSnippet(c.insertSnippet)}`}
                      onClick={() => onInsert(toInlineConditionSnippet(c.insertSnippet))}
                    >
                      Add
                    </button>
                  </div>
                  )
                })}
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}
