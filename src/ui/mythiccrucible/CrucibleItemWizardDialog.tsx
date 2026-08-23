import { useEffect, useMemo, useState } from 'react'
import {
  generateCrucibleItemYaml,
  resolvePackRoot,
  suggestCrucibleItemPath,
} from '../../core/mythiccrucible/generators'
import { yamlHasTopLevelKey } from '../../core/mythicrpg/generators'
import { CRUCIBLE_ITEM_PRESETS } from '../../data/mythiccrucible/presets'
import type {
  CrucibleItemGeneratorInput,
  CrucibleItemKind,
  CrucibleItemRole,
  FileRecord,
} from '../../types'
import { ColorTextField } from '../ColorTextField'
import { SkillLineBuilder } from '../SkillLineBuilder'
import { Switch } from '../Switch'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'

const STEPS = ['Identity', 'Options', 'Power', 'Skills and craft'] as const

const STEP_HINTS = [
  'Choose the item kind and a preset, then set id, material, and display name.',
  'Toggle common Crucible options, durability, and upgrade levels.',
  'Add stats, equipment sets, and augment slots or gem data.',
  'Add skill lines, bag inventory settings, and an optional recipe.',
]

function emptyItem(asBag = false): CrucibleItemGeneratorInput {
  const preset = asBag
    ? CRUCIBLE_ITEM_PRESETS.find((p) => p.id === 'bag')!.apply()
    : CRUCIBLE_ITEM_PRESETS[0]!.apply()
  return preset
}

export interface CrucibleItemWizardOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface CrucibleItemWizardDialogProps {
  files: FileRecord[]
  packName: string
  existingItemIds: string[]
  equipmentSetIds: string[]
  augmentTypeIds: string[]
  crucibleEnabled: boolean
  /** Start as a bag (from New → New bag). */
  initialAsBag?: boolean
  onClose: () => void
  onApply: (output: CrucibleItemWizardOutput) => void
}

function appendOrCreate(
  files: FileRecord[],
  path: string,
  yaml: string,
): { path: string; content: string; mode: 'create' | 'append' } | { error: string } {
  const existing = files.find((f) => f.path.replace(/\\/g, '/') === path)
  const key = yaml.split('\n')[0]?.replace(/:$/, '') ?? ''
  if (existing && key && yamlHasTopLevelKey(existing.content, key)) {
    return {
      error: `${key} already exists in ${path}. Pick another id or edit the existing entry.`,
    }
  }
  if (!existing) {
    return { path, content: `# Items\n${yaml}`, mode: 'create' }
  }
  const base = existing.content.trimEnd()
  return { path, content: base ? `${base}\n\n${yaml}` : yaml, mode: 'create' }
}

export function CrucibleItemWizardDialog({
  files,
  packName,
  existingItemIds,
  equipmentSetIds,
  augmentTypeIds,
  crucibleEnabled,
  initialAsBag = false,
  onClose,
  onApply,
}: CrucibleItemWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState(() => emptyItem(initialAsBag))
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')
  const [builderOpen, setBuilderOpen] = useState(false)

  const packRoot = useMemo(() => resolvePackRoot(files, packName), [files, packName])
  const itemFiles = useMemo(() => files.filter((f) => f.category === 'items'), [files])

  useEffect(() => {
    setTargetPath(itemFiles[0]?.path ?? suggestCrucibleItemPath(packRoot))
  }, [itemFiles, packRoot])

  const yaml = useMemo(() => generateCrucibleItemYaml(input), [input])

  function patch(partial: Partial<CrucibleItemGeneratorInput>): void {
    setInput((prev) => ({ ...prev, ...partial }))
    setError('')
  }

  function validate(): boolean {
    const id = input.id.trim()
    if (!id) {
      setError('Enter an item ID.')
      return false
    }
    if (existingItemIds.some((s) => s.toLowerCase() === id.toLowerCase())) {
      setError(`An item named ${id} already exists in this pack.`)
      return false
    }
    return true
  }

  function handleCreate(): void {
    if (!validate()) return
    const entry = appendOrCreate(files, targetPath, yaml)
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  return (
    <DialogShell size="lg" className="wizard-dialog" labelledBy="crucible-item-wizard-title" onClose={onClose}>
      <DialogHeader
        title={initialAsBag ? 'New bag' : 'New Crucible item'}
        titleId="crucible-item-wizard-title"
        onClose={onClose}
        lead={STEP_HINTS[step]}
      />

        <div className="wizard-steps" role="tablist">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              className={i === step ? 'wizard-step active' : 'wizard-step'}
              aria-selected={i === step}
              onClick={() => setStep(i)}
            >
              {label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <DialogBody>
            <DialogPanel title="Identity">
              <div className="dialog-fields">
                <label>
                  Preset
                  <select
                    value=""
                    onChange={(e) => {
                      const preset = CRUCIBLE_ITEM_PRESETS.find((p) => p.id === e.target.value)
                      if (preset) setInput(preset.apply())
                    }}
                  >
                    <option value="">Choose a starting point…</option>
                    {CRUCIBLE_ITEM_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  ID
                  <input value={input.id} onChange={(e) => patch({ id: e.target.value })} />
                </label>
                <label>
                  Material
                  <input value={input.material} onChange={(e) => patch({ material: e.target.value })} />
                </label>
                <ColorTextField
                  label="Display name"
                  value={input.display}
                  onChange={(display) => patch({ display })}
                />
                <label>
                  Group
                  <input value={input.group} onChange={(e) => patch({ group: e.target.value })} />
                </label>
                <label>
                  Type
                  <select
                    value={input.itemKind}
                    onChange={(e) => patch({ itemKind: e.target.value as CrucibleItemKind })}
                  >
                    <option value="ITEM">Item</option>
                    <option value="BAG">Bag</option>
                    <option value="HAT">Hat</option>
                  </select>
                </label>
                <label>
                  Role
                  <select
                    value={input.role}
                    onChange={(e) => patch({ role: e.target.value as CrucibleItemRole })}
                  >
                    <option value="standard">Standard</option>
                    <option value="gem">Augment gem</option>
                    <option value="socket">Socket unlocker</option>
                    <option value="remover">Augment remover</option>
                  </select>
                </label>
                <ColorTextField
                  label="Lore"
                  value={input.lore}
                  onChange={(lore) => patch({ lore })}
                  multiline
                />
                <label>
                  Lore template
                  <input
                    value={input.loreTemplate}
                    onChange={(e) => patch({ loreTemplate: e.target.value })}
                    placeholder="Optional template id"
                  />
                </label>
                <label className="wide">
                  File path
                  <input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} />
                </label>
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        {step === 1 && (
          <DialogBody>
            <DialogPanel title="Options">
              <div className="dialog-fields">
                {(
                  [
                    ['optionsCancelDamage', 'Cancel damage', 'Melee hits deal no physical damage'],
                    ['optionsKeepOnDeath', 'Keep on death', 'Item is not dropped on death'],
                    ['optionsPreventDropping', 'Prevent dropping', 'Players cannot drop this item'],
                    ['optionsPreventEnchanting', 'Prevent enchanting', 'Cannot be enchanted'],
                    ['optionsPreventStacking', 'Prevent stacking', 'Each copy stays separate'],
                    ['optionsPlaceable', 'Placeable', 'Can be placed in the world'],
                    ['optionsRepairable', 'Repairable', 'Can be repaired'],
                  ] as const
                ).map(([key, title, hint]) => (
                  <div key={key} className="wz-toggle">
                    <span className="wz-toggle-copy">
                      <span className="wz-toggle-title">{title}</span>
                      <span className="wz-toggle-hint">{hint}</span>
                    </span>
                    <Switch
                      checked={input[key]}
                      onChange={(next) => patch({ [key]: next })}
                      aria-label={title}
                    />
                  </div>
                ))}
                <label>
                  ItemUpdater version
                  <input
                    type="number"
                    min={0}
                    value={input.itemUpdaterVersion}
                    onChange={(e) => patch({ itemUpdaterVersion: Number(e.target.value) || 0 })}
                  />
                </label>
                <label>
                  Max durability
                  <input
                    value={input.maxDurability}
                    onChange={(e) => patch({ maxDurability: e.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Starting durability used
                  <input
                    value={input.durability}
                    onChange={(e) => patch({ durability: e.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Default level
                  <input
                    value={input.defaultLevel}
                    onChange={(e) => patch({ defaultLevel: e.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Max level
                  <input
                    value={input.maxLevel}
                    onChange={(e) => patch({ maxLevel: e.target.value })}
                    placeholder="Optional"
                  />
                </label>
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        {step === 2 && (
          <DialogBody>
            <DialogPanel title="Power">
              <div className="dialog-fields">
                {input.role !== 'socket' && input.role !== 'remover' && (
                  <label className="wide">
                    Stats <span className="field-hint">One per line, e.g. ATTACK_DAMAGE 5 ADDITIVE</span>
                    <textarea
                      rows={3}
                      value={input.stats}
                      onChange={(e) => patch({ stats: e.target.value })}
                    />
                  </label>
                )}
                {input.role === 'standard' && (
                  <>
                    <label>
                      Equipment set
                      <select
                        value={input.equipmentSet}
                        onChange={(e) => patch({ equipmentSet: e.target.value })}
                      >
                        <option value="">None</option>
                        {equipmentSetIds.map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Augment slot type
                      <select
                        value={input.augmentSlotType}
                        onChange={(e) => patch({ augmentSlotType: e.target.value })}
                      >
                        <option value="">None</option>
                        {augmentTypeIds.map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </label>
                    {input.augmentSlotType ? (
                      <>
                        <label>
                          Slot amount
                          <input
                            value={input.augmentSlotAmount}
                            onChange={(e) => patch({ augmentSlotAmount: e.target.value })}
                          />
                        </label>
                        <label>
                          Slot chance
                          <input
                            value={input.augmentSlotChance}
                            onChange={(e) => patch({ augmentSlotChance: e.target.value })}
                          />
                        </label>
                        <label>
                          Max slots
                          <input
                            value={input.augmentSlotMaxAmount}
                            onChange={(e) => patch({ augmentSlotMaxAmount: e.target.value })}
                            placeholder="Optional"
                          />
                        </label>
                      </>
                    ) : null}
                  </>
                )}
                {(input.role === 'gem' || input.role === 'socket' || input.role === 'remover') && (
                  <>
                    <label>
                      Augment type
                      <select
                        value={input.augmentType}
                        onChange={(e) => patch({ augmentType: e.target.value })}
                      >
                        <option value="">Select type…</option>
                        {augmentTypeIds.map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </label>
                    {input.role === 'gem' && (
                      <ColorTextField
                        label="Tooltip"
                        value={input.augmentTooltip}
                        onChange={(augmentTooltip) => patch({ augmentTooltip })}
                      />
                    )}
                    {input.role === 'socket' && (
                      <label>
                        Max sockets
                        <input
                          type="number"
                          min={1}
                          value={input.augmentSocketMaxSockets}
                          onChange={(e) =>
                            patch({ augmentSocketMaxSockets: Number(e.target.value) || 1 })
                          }
                        />
                      </label>
                    )}
                    {input.role === 'remover' && (
                      <>
                        <div className="wz-toggle">
                          <span className="wz-toggle-copy">
                            <span className="wz-toggle-title">Destroy socket</span>
                            <span className="wz-toggle-hint">Remove the slot entirely</span>
                          </span>
                          <Switch
                            checked={input.augmentRemoverDestroySocket}
                            onChange={(augmentRemoverDestroySocket) =>
                              patch({ augmentRemoverDestroySocket })
                            }
                            aria-label="Destroy socket"
                          />
                        </div>
                        <div className="wz-toggle">
                          <span className="wz-toggle-copy">
                            <span className="wz-toggle-title">Return augment</span>
                            <span className="wz-toggle-hint">Give the gem back to the player</span>
                          </span>
                          <Switch
                            checked={input.augmentRemoverReturnAugment}
                            onChange={(augmentRemoverReturnAugment) =>
                              patch({ augmentRemoverReturnAugment })
                            }
                            aria-label="Return augment"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        {step === 3 && (
          <DialogBody>
            {input.itemKind === 'BAG' && (
              <DialogPanel title="Bag inventory">
              <div className="dialog-fields">
                  <label>
                    Size
                    <select
                      value={input.bagSize}
                      onChange={(e) => patch({ bagSize: Number(e.target.value) })}
                    >
                      {[9, 18, 27, 36, 45, 54].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <ColorTextField
                    label="Inventory title"
                    value={input.bagTitle}
                    onChange={(bagTitle) => patch({ bagTitle })}
                  />
                  <div className="wz-toggle">
                    <span className="wz-toggle-copy">
                      <span className="wz-toggle-title">Prevent bag nesting</span>
                      <span className="wz-toggle-hint">Blocks putting bags inside bags</span>
                    </span>
                    <Switch
                      checked={input.bagPreventNesting}
                      onChange={(bagPreventNesting) => patch({ bagPreventNesting })}
                      aria-label="Prevent bag nesting"
                    />
                  </div>
                  <div className="wz-toggle">
                    <span className="wz-toggle-copy">
                      <span className="wz-toggle-title">Save on item update</span>
                      <span className="wz-toggle-hint">Keep contents when ItemUpdater runs</span>
                    </span>
                    <Switch
                      checked={input.bagSaveOnUpdate}
                      onChange={(bagSaveOnUpdate) => patch({ bagSaveOnUpdate })}
                      aria-label="Save on item update"
                    />
                  </div>
                  <div className="wz-toggle">
                    <span className="wz-toggle-copy">
                      <span className="wz-toggle-title">Auto pickup</span>
                      <span className="wz-toggle-hint">Collect nearby items into the bag</span>
                    </span>
                    <Switch
                      checked={input.bagAutoPickup}
                      onChange={(bagAutoPickup) => patch({ bagAutoPickup })}
                      aria-label="Auto pickup"
                    />
                  </div>
                </div>
              </DialogPanel>
            )}

            <DialogPanel title="Skills" className="dialog-panel-skills">
              <div className="dialog-panel-toolbar">
                <button
                  type="button"
                  className={`slb-open-btn${builderOpen ? ' active' : ''}`}
                  onClick={() => setBuilderOpen((v) => !v)}
                >
                  {builderOpen ? 'Hide builder' : 'Build line'}
                </button>
              </div>
              <p className="dialog-note">One skill line per row.</p>
              <textarea
                rows={4}
                value={input.skills}
                onChange={(e) => patch({ skills: e.target.value })}
                placeholder="ignite{t=40} @target ~onHit"
              />
              {builderOpen && (
                <SkillLineBuilder
                  value={input.skills.split('\n')[0] ?? ''}
                  crucibleEnabled={crucibleEnabled}
                  onConfirm={(line) => {
                    const rest = input.skills.split('\n').slice(1).filter(Boolean)
                    patch({ skills: [line, ...rest].join('\n') })
                    setBuilderOpen(false)
                  }}
                  onClose={() => setBuilderOpen(false)}
                />
              )}
            </DialogPanel>

            <DialogPanel title="Recipe">
              <div className="dialog-fields">
                <label>
                  Recipe type
                  <select
                    value={input.recipeType}
                    onChange={(e) =>
                      patch({ recipeType: e.target.value as CrucibleItemGeneratorInput['recipeType'] })
                    }
                  >
                    <option value="">None</option>
                    <option value="SHAPED">Shaped</option>
                    <option value="SHAPELESS">Shapeless</option>
                  </select>
                </label>
                {input.recipeType ? (
                  <label className="wide">
                    Ingredients{' '}
                    <span className="field-hint">
                      {input.recipeType === 'SHAPED'
                        ? 'One grid row per line, cells separated by |'
                        : 'One ingredient per line'}
                    </span>
                    <textarea
                      rows={3}
                      value={input.recipeIngredients}
                      onChange={(e) => patch({ recipeIngredients: e.target.value })}
                    />
                  </label>
                ) : null}
              </div>
            </DialogPanel>
          </DialogBody>
        )}

        <DialogPreviewBlock code={yaml} />
        {error ? <p className="error-copy">{error}</p> : null}

        <DialogFooter className="wizard-footer">
          <button type="button" onClick={onClose}>Cancel</button>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)}>Back</button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" className="primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="primary" onClick={handleCreate}>
              Create item
            </button>
          )}
        </DialogFooter>
    </DialogShell>
  )
}
