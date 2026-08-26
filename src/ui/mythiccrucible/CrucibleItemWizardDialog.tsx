import { useEffect, useMemo, useState } from 'react'
import {
  generateCrucibleItemYaml,
  resolvePackRoot,
  suggestCrucibleItemPath,
} from '../../core/mythiccrucible/generators'
import { mergeWizardYaml } from '../../core/yaml/mergeWizardYaml'
import { CRUCIBLE_ITEM_PRESETS, emptyCrucibleItem } from '../../data/mythiccrucible/presets'
import type {
  CrucibleAugmentSlotInput,
  CrucibleConsumableMode,
  CrucibleItemGeneratorInput,
  CrucibleItemKind,
  CrucibleItemRole,
  CrucibleLevelDescRow,
  CrucibleRecipeType,
  FileRecord,
} from '../../types'
import { ColorTextField } from '../ColorTextField'
import { SkillLineBuilder } from '../SkillLineBuilder'
import { Switch } from '../Switch'
import { RemoveButton } from '../RemoveButton'
import { DialogBody, DialogFooter, DialogHeader, DialogPanel, DialogPreviewBlock, DialogShell } from '../DialogShell'
import { CrucibleStatsEditor } from './CrucibleStatsEditor'

const STEPS = ['Identity', 'Options', 'Power', 'Skills and craft'] as const

const STEP_HINTS = [
  'Choose the item kind and a preset, then set id, material, and display name.',
  'Toggle common options, durability, and item levels.',
  'Add stats, sockets, gems, or food and potion data for this item.',
  'Add skill lines, bag inventory settings if needed, and an optional recipe.',
]

const RECIPE_TYPES: { value: CrucibleRecipeType; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'SHAPED', label: 'Shaped crafting' },
  { value: 'SHAPELESS', label: 'Shapeless crafting' },
  { value: 'FURNACE', label: 'Furnace' },
  { value: 'CAMPFIRE', label: 'Campfire' },
  { value: 'BLASTING', label: 'Blast furnace' },
  { value: 'SMOKING', label: 'Smoker' },
  { value: 'STONECUTTING', label: 'Stonecutter' },
  { value: 'SMITHING', label: 'Smithing table' },
  { value: 'BREWING', label: 'Brewing stand' },
]

function isCookingRecipe(type: CrucibleRecipeType): boolean {
  return ['FURNACE', 'CAMPFIRE', 'BLASTING', 'SMOKING', 'STONECUTTING'].includes(type)
}

function isShapedRecipe(type: CrucibleRecipeType): boolean {
  return type === 'SHAPED' || type === 'SHAPELESS'
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
  loreTemplateIds: string[]
  packStatIds?: string[]
  crucibleEnabled: boolean
  initialAsBag?: boolean
  onClose: () => void
  onApply: (output: CrucibleItemWizardOutput) => void
}

function emptySlot(): CrucibleAugmentSlotInput {
  return { type: '', amount: '1', chance: '1', maxAmount: '' }
}

function emptyDescRow(): CrucibleLevelDescRow {
  return { level: '', text: '' }
}

export function CrucibleItemWizardDialog({
  files,
  packName,
  existingItemIds,
  equipmentSetIds,
  augmentTypeIds,
  loreTemplateIds,
  packStatIds = [],
  crucibleEnabled,
  initialAsBag = false,
  onClose,
  onApply,
}: CrucibleItemWizardDialogProps) {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState(() => emptyCrucibleItem(initialAsBag))
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState('')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [showUpgradeScaling, setShowUpgradeScaling] = useState(false)
  const [showBagSounds, setShowBagSounds] = useState(false)
  const [showBagFilters, setShowBagFilters] = useState(false)
  const [showRecipeExtras, setShowRecipeExtras] = useState(false)

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

  function updateSlot(index: number, partial: Partial<CrucibleAugmentSlotInput>): void {
    setInput((prev) => ({
      ...prev,
      augmentSlots: prev.augmentSlots.map((slot, i) =>
        i === index ? { ...slot, ...partial } : slot,
      ),
    }))
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
    const entry = mergeWizardYaml(files, targetPath, yaml, '# Items')
    if ('error' in entry) {
      setError(entry.error)
      return
    }
    onApply({ files: [entry] })
  }

  const showGemRole = input.itemKind !== 'BAG' && input.role !== 'consumable'
  const showConsumable =
    input.role === 'consumable' ||
    (input.itemKind !== 'BAG' && input.consumableMode !== 'none')

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
                  onChange={(e) => {
                    const itemKind = e.target.value as CrucibleItemKind
                    patch({
                      itemKind,
                      ...(itemKind === 'BAG' ? { role: 'standard' as const, consumableMode: 'none' as const } : {}),
                    })
                  }}
                >
                  <option value="ITEM">Item</option>
                  <option value="BAG">Bag</option>
                  <option value="HAT">Hat</option>
                </select>
              </label>
              {input.itemKind !== 'BAG' && (
                <label>
                  Role
                  <select
                    value={input.role}
                    onChange={(e) => {
                      const role = e.target.value as CrucibleItemRole
                      patch({
                        role,
                        ...(role === 'consumable' && input.consumableMode === 'none'
                          ? { consumableMode: 'both' as const }
                          : {}),
                      })
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="gem">Augment gem</option>
                    <option value="socket">Socket unlocker</option>
                    <option value="remover">Augment remover</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </label>
              )}
              <label>
                Lore template
                <select
                  value={input.loreTemplate}
                  onChange={(e) => patch({ loreTemplate: e.target.value })}
                >
                  <option value="">None</option>
                  {loreTemplateIds.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
              {input.loreTemplate ? (
                <ColorTextField
                  label="Description"
                  value={input.lore}
                  onChange={(lore) => patch({ lore })}
                  multiline
                />
              ) : (
                <ColorTextField
                  label="Lore"
                  value={input.lore}
                  onChange={(lore) => patch({ lore })}
                  multiline
                />
              )}
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
            </div>
          </DialogPanel>

          <DialogPanel title="Item levels">
            <div className="dialog-fields">
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
              <div className="wz-toggle">
                <span className="wz-toggle-copy">
                  <span className="wz-toggle-title">Match player level</span>
                  <span className="wz-toggle-hint">Set equip level from the player level</span>
                </span>
                <Switch
                  checked={input.setEquipLevel}
                  onChange={(setEquipLevel) => patch({ setEquipLevel })}
                  aria-label="Match player level"
                />
              </div>
              <ColorTextField
                label="Default level text"
                value={input.defaultLevelDescription}
                onChange={(defaultLevelDescription) => patch({ defaultLevelDescription })}
              />
              <ColorTextField
                label="Default upgrade text"
                value={input.defaultUpgradeDescription}
                onChange={(defaultUpgradeDescription) => patch({ defaultUpgradeDescription })}
              />
              <div className="wide">
                <p className="dialog-note">Level descriptions (optional). One row per level.</p>
                {input.levelDescriptions.map((row, i) => (
                  <div key={`ld-${i}`} className="dialog-fields" style={{ marginBottom: 8 }}>
                    <label>
                      Level
                      <input
                        value={row.level}
                        onChange={(e) => {
                          const levelDescriptions = [...input.levelDescriptions]
                          levelDescriptions[i] = { ...row, level: e.target.value }
                          patch({ levelDescriptions })
                        }}
                      />
                    </label>
                    <ColorTextField
                      label="What the player sees"
                      value={row.text}
                      onChange={(text) => {
                        const levelDescriptions = [...input.levelDescriptions]
                        levelDescriptions[i] = { ...row, text }
                        patch({ levelDescriptions })
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    patch({ levelDescriptions: [...input.levelDescriptions, emptyDescRow()] })
                  }
                >
                  Add level description
                </button>
              </div>
              <div className="wide">
                <p className="dialog-note">Upgrade descriptions (optional).</p>
                {input.upgradeDescriptions.map((row, i) => (
                  <div key={`ud-${i}`} className="dialog-fields" style={{ marginBottom: 8 }}>
                    <label>
                      Level
                      <input
                        value={row.level}
                        onChange={(e) => {
                          const upgradeDescriptions = [...input.upgradeDescriptions]
                          upgradeDescriptions[i] = { ...row, level: e.target.value }
                          patch({ upgradeDescriptions })
                        }}
                      />
                    </label>
                    <ColorTextField
                      label="What the player sees"
                      value={row.text}
                      onChange={(text) => {
                        const upgradeDescriptions = [...input.upgradeDescriptions]
                        upgradeDescriptions[i] = { ...row, text }
                        patch({ upgradeDescriptions })
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    patch({ upgradeDescriptions: [...input.upgradeDescriptions, emptyDescRow()] })
                  }
                >
                  Add upgrade description
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeScaling((v) => !v)}
              >
                {showUpgradeScaling ? 'Hide stat scaling' : 'Stat scaling'}
              </button>
              {showUpgradeScaling && (
                <label className="wide">
                  Equations{' '}
                  <span className="field-hint">
                    One per line. Example: ATTACK_DAMAGE ADDITIVE v*(1+0.05*l). v is base, l is level.
                  </span>
                  <textarea
                    rows={3}
                    value={input.upgradeEquations}
                    onChange={(e) => patch({ upgradeEquations: e.target.value })}
                    placeholder="ATTACK_DAMAGE ADDITIVE v*(1+0.05*l)"
                  />
                </label>
              )}
            </div>
          </DialogPanel>
        </DialogBody>
      )}

      {step === 2 && (
        <DialogBody>
          <DialogPanel title="Power">
            <div className="dialog-fields">
              {input.role !== 'socket' && input.role !== 'remover' && (
                <div className="wide">
                  <span className="wz-field-label">Stats</span>
                  <p className="dialog-note">Search for a stat, click to add it, then set the value.</p>
                  <CrucibleStatsEditor
                    value={input.stats}
                    onChange={(stats) => patch({ stats })}
                    packStatIds={packStatIds}
                  />
                </div>
              )}

              {input.role === 'standard' && input.itemKind !== 'BAG' && (
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
                  <div className="wide">
                    <p className="dialog-note">Each row is one socket type on this item.</p>
                    {input.augmentSlots.map((slot, i) => (
                      <div key={`slot-${i}`} className="dialog-fields" style={{ marginBottom: 8 }}>
                        <label>
                          Socket type
                          <select
                            value={slot.type}
                            onChange={(e) => updateSlot(i, { type: e.target.value })}
                          >
                            <option value="">Select…</option>
                            {augmentTypeIds.map((id) => (
                              <option key={id} value={id}>{id}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Amount
                          <input
                            value={slot.amount}
                            onChange={(e) => updateSlot(i, { amount: e.target.value })}
                          />
                        </label>
                        <label>
                          Chance
                          <input
                            value={slot.chance}
                            onChange={(e) => updateSlot(i, { chance: e.target.value })}
                          />
                        </label>
                        <label>
                          Max amount
                          <input
                            value={slot.maxAmount}
                            onChange={(e) => updateSlot(i, { maxAmount: e.target.value })}
                            placeholder="Optional"
                          />
                        </label>
                        <RemoveButton
                          aria-label={`Remove socket slot ${i + 1}`}
                          onClick={() =>
                            patch({
                              augmentSlots: input.augmentSlots.filter((_, j) => j !== i),
                            })
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        patch({ augmentSlots: [...input.augmentSlots, emptySlot()] })
                      }
                    >
                      Add slot
                    </button>
                  </div>
                </>
              )}

              {showGemRole &&
                (input.role === 'gem' || input.role === 'socket' || input.role === 'remover') && (
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

              {(input.role === 'consumable' || input.itemKind !== 'BAG') && (
                <>
                  <label>
                    Food and potion data
                    <select
                      value={input.consumableMode}
                      onChange={(e) =>
                        patch({ consumableMode: e.target.value as CrucibleConsumableMode })
                      }
                    >
                      <option value="none">None</option>
                      <option value="potion">Potion</option>
                      <option value="food">Food</option>
                      <option value="both">Potion and food</option>
                    </select>
                  </label>
                  {showConsumable && (input.consumableMode === 'potion' || input.consumableMode === 'both') && (
                    <>
                      <label>
                        Potion type
                        <input
                          value={input.potionType}
                          onChange={(e) => patch({ potionType: e.target.value })}
                        />
                      </label>
                      <label>
                        Duration (ticks)
                        <input
                          value={input.potionDuration}
                          onChange={(e) => patch({ potionDuration: e.target.value })}
                        />
                      </label>
                      <label>
                        Amplifier
                        <input
                          value={input.potionAmplifier}
                          onChange={(e) => patch({ potionAmplifier: e.target.value })}
                        />
                      </label>
                      <div className="wz-toggle">
                        <span className="wz-toggle-copy">
                          <span className="wz-toggle-title">Ambient particles</span>
                        </span>
                        <Switch
                          checked={input.potionAmbient}
                          onChange={(potionAmbient) => patch({ potionAmbient })}
                          aria-label="Ambient particles"
                        />
                      </div>
                      <div className="wz-toggle">
                        <span className="wz-toggle-copy">
                          <span className="wz-toggle-title">Show particles</span>
                        </span>
                        <Switch
                          checked={input.potionParticles}
                          onChange={(potionParticles) => patch({ potionParticles })}
                          aria-label="Show particles"
                        />
                      </div>
                    </>
                  )}
                  {showConsumable && (input.consumableMode === 'food' || input.consumableMode === 'both') && (
                    <>
                      <label>
                        Nutrition
                        <input
                          value={input.foodNutrition}
                          onChange={(e) => patch({ foodNutrition: e.target.value })}
                        />
                      </label>
                      <label>
                        Saturation
                        <input
                          value={input.foodSaturation}
                          onChange={(e) => patch({ foodSaturation: e.target.value })}
                        />
                      </label>
                      <div className="wz-toggle">
                        <span className="wz-toggle-copy">
                          <span className="wz-toggle-title">Always edible</span>
                          <span className="wz-toggle-hint">Can eat even when full</span>
                        </span>
                        <Switch
                          checked={input.foodCanAlwaysEat}
                          onChange={(foodCanAlwaysEat) => patch({ foodCanAlwaysEat })}
                          aria-label="Always edible"
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
                {input.bagAutoPickup && (
                  <div className="wz-toggle">
                    <span className="wz-toggle-copy">
                      <span className="wz-toggle-title">Only when inventory full</span>
                    </span>
                    <Switch
                      checked={input.bagAutoPickupOnlyWhenFull}
                      onChange={(bagAutoPickupOnlyWhenFull) =>
                        patch({ bagAutoPickupOnlyWhenFull })
                      }
                      aria-label="Only when inventory full"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowBagSounds((v) => !v)}
                >
                  {showBagSounds ? 'Hide sounds' : 'Sounds'}
                </button>
                {showBagSounds && (
                  <>
                    <label>
                      Open sound
                      <input
                        value={input.bagSoundOpen}
                        onChange={(e) => patch({ bagSoundOpen: e.target.value })}
                        placeholder="Plugin default if blank"
                      />
                    </label>
                    <label>
                      Close sound
                      <input
                        value={input.bagSoundClose}
                        onChange={(e) => patch({ bagSoundClose: e.target.value })}
                        placeholder="Plugin default if blank"
                      />
                    </label>
                    <label>
                      Pickup sound
                      <input
                        value={input.bagSoundPickup}
                        onChange={(e) => patch({ bagSoundPickup: e.target.value })}
                        placeholder="Plugin default if blank"
                      />
                    </label>
                    <label>
                      Volume
                      <input
                        value={input.bagSoundVolume}
                        onChange={(e) => patch({ bagSoundVolume: e.target.value })}
                      />
                    </label>
                    <label>
                      Pitch
                      <input
                        value={input.bagSoundPitch}
                        onChange={(e) => patch({ bagSoundPitch: e.target.value })}
                      />
                    </label>
                  </>
                )}
                <div className="wz-toggle">
                  <span className="wz-toggle-copy">
                    <span className="wz-toggle-title">Warn when nearly full</span>
                    <span className="wz-toggle-hint">Message when few empty slots remain</span>
                  </span>
                  <Switch
                    checked={input.bagNearlyFullEnabled}
                    onChange={(bagNearlyFullEnabled) => patch({ bagNearlyFullEnabled })}
                    aria-label="Warn when nearly full"
                  />
                </div>
                {input.bagNearlyFullEnabled && (
                  <>
                    <label>
                      Threshold (slots left)
                      <input
                        value={input.bagNearlyFullThreshold}
                        onChange={(e) => patch({ bagNearlyFullThreshold: e.target.value })}
                      />
                    </label>
                    <ColorTextField
                      label="Warning message"
                      value={input.bagNearlyFullMessage}
                      onChange={(bagNearlyFullMessage) => patch({ bagNearlyFullMessage })}
                    />
                    <p className="dialog-note">Use {'{slots}'} for remaining empty slots.</p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowBagFilters((v) => !v)}
                >
                  {showBagFilters ? 'Hide item filters' : 'Item filters'}
                </button>
                {showBagFilters && (
                  <>
                    <label className="wide">
                      Blacklisted items{' '}
                      <span className="field-hint">One material per line</span>
                      <textarea
                        rows={3}
                        value={input.bagBlacklist}
                        onChange={(e) => patch({ bagBlacklist: e.target.value })}
                      />
                    </label>
                    <label className="wide">
                      Whitelisted items{' '}
                      <span className="field-hint">One material per line</span>
                      <textarea
                        rows={3}
                        value={input.bagWhitelist}
                        onChange={(e) => patch({ bagWhitelist: e.target.value })}
                      />
                    </label>
                  </>
                )}
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
                    patch({ recipeType: e.target.value as CrucibleRecipeType })
                  }
                >
                  {RECIPE_TYPES.map((t) => (
                    <option key={t.value || 'none'} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              {input.recipeType ? (
                <label>
                  Amount crafted
                  <input
                    type="number"
                    min={1}
                    value={input.recipeAmount}
                    onChange={(e) => patch({ recipeAmount: Number(e.target.value) || 1 })}
                  />
                </label>
              ) : null}
              {isShapedRecipe(input.recipeType) && (
                <>
                  <label className="wide">
                    What goes in{' '}
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
                  <button
                    type="button"
                    onClick={() => setShowRecipeExtras((v) => !v)}
                  >
                    {showRecipeExtras ? 'Hide more options' : 'More options'}
                  </button>
                  {showRecipeExtras && (
                    <>
                      <label className="wide">
                        Leftover items{' '}
                        <span className="field-hint">IngredientsLeftover</span>
                        <textarea
                          rows={2}
                          value={input.recipeLeftover}
                          onChange={(e) => patch({ recipeLeftover: e.target.value })}
                        />
                      </label>
                      <label className="wide">
                        Conditions
                        <textarea
                          rows={2}
                          value={input.recipeConditions}
                          onChange={(e) => patch({ recipeConditions: e.target.value })}
                        />
                      </label>
                      <label className="wide">
                        Craft skills
                        <textarea
                          rows={2}
                          value={input.recipeCraftSkills}
                          onChange={(e) => patch({ recipeCraftSkills: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {isCookingRecipe(input.recipeType) && (
                <>
                  <label>
                    What goes in <span className="field-hint">Ingredient</span>
                    <input
                      value={input.recipeIngredient}
                      onChange={(e) => patch({ recipeIngredient: e.target.value })}
                    />
                  </label>
                  <label>
                    How long (ticks) <span className="field-hint">CookingTime</span>
                    <input
                      value={input.recipeCookingTime}
                      onChange={(e) => patch({ recipeCookingTime: e.target.value })}
                    />
                  </label>
                  <label>
                    XP given <span className="field-hint">Experience</span>
                    <input
                      value={input.recipeExperience}
                      onChange={(e) => patch({ recipeExperience: e.target.value })}
                    />
                  </label>
                </>
              )}
              {input.recipeType === 'SMITHING' && (
                <>
                  <label>
                    What goes in <span className="field-hint">Ingredient</span>
                    <input
                      value={input.recipeIngredient}
                      onChange={(e) => patch({ recipeIngredient: e.target.value })}
                    />
                  </label>
                  <label>
                    Template
                    <input
                      value={input.recipeSmithingTemplate}
                      onChange={(e) => patch({ recipeSmithingTemplate: e.target.value })}
                      placeholder="Optional"
                    />
                  </label>
                </>
              )}
              {input.recipeType === 'BREWING' && (
                <>
                  <label>
                    What goes in <span className="field-hint">Ingredient</span>
                    <input
                      value={input.recipeIngredient}
                      onChange={(e) => patch({ recipeIngredient: e.target.value })}
                    />
                  </label>
                  <label>
                    Bottle input <span className="field-hint">InputItem</span>
                    <input
                      value={input.recipeInputItem}
                      onChange={(e) => patch({ recipeInputItem: e.target.value })}
                    />
                  </label>
                </>
              )}
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
