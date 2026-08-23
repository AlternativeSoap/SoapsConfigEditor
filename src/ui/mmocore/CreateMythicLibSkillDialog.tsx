import { useMemo, useState } from 'react'
import {
  defaultMythicLibSkillLore,
  generateMythicLibSkillYaml,
  generateMythicMobsSkillShell,
  suggestMythicLibSkillPath,
  suggestMythicMobsSkillPath,
} from '../../core/mmocore/generators'
import { DAMAGE_TYPE_CHIPS, DEFAULT_ELEMENT_IDS } from '../../data/mmocore/triggers'
import { extractTopLevelIds, parseYaml } from '../../core/yaml/parseYaml'
import type { FileRecord, SkillModifierValues } from '../../types'
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPreviewBlock,
  DialogShell,
} from '../DialogShell'

export interface SkillStubOutput {
  files: { path: string; content: string; mode: 'create' | 'append' }[]
}

interface CreateMythicLibSkillDialogProps {
  files: FileRecord[]
  packName: string
  existingSkillIds: string[]
  defaultCategory?: string
  manaName?: string
  onClose: () => void
  onApply: (output: SkillStubOutput) => void
}

export function CreateMythicLibSkillDialog({
  files,
  packName,
  existingSkillIds,
  defaultCategory = 'STORM',
  manaName = 'Charge',
  onClose,
  onApply,
}: CreateMythicLibSkillDialogProps) {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('BOOK')
  const [categories, setCategories] = useState(defaultCategory)
  const [damage, setDamage] = useState(10)
  const [damagePer, setDamagePer] = useState(0.5)
  const [duration, setDuration] = useState(0)
  const [durationPer, setDurationPer] = useState(0)
  const [itemScaling, setItemScaling] = useState(10)
  const [damageTypes, setDamageTypes] = useState('SKILL,MAGIC')
  const [damageElement, setDamageElement] = useState(defaultCategory)
  const [error, setError] = useState('')

  const skillId = id.trim().toUpperCase().replace(/\s+/g, '_')
  const modifiers: Record<string, SkillModifierValues> = useMemo(() => {
    const mods: Record<string, SkillModifierValues> = {
      damage: { base: damage, perLevel: damagePer, max: damage + damagePer * 20 },
    }
    if (duration > 0) {
      mods.duration = { base: duration, perLevel: durationPer }
    }
    return mods
  }, [damage, damagePer, duration, durationPer])

  const cats = useMemo(
    () =>
      categories
        .split(/[,\s]+/)
        .map((c) => c.trim())
        .filter(Boolean),
    [categories],
  )

  const preview = useMemo(() => {
    if (!skillId) return ''
    return generateMythicLibSkillYaml({
      id: skillId,
      name: name.trim() || skillId,
      icon,
      categories: cats.length ? cats : [defaultCategory],
      lore: defaultMythicLibSkillLore(skillId, manaName, Object.keys(modifiers)),
      modifiers,
      manaName,
      itemScaling,
    })
  }, [skillId, name, icon, cats, modifiers, manaName, defaultCategory, itemScaling])

  function submit(): void {
    if (!skillId) {
      setError('Skill id is required.')
      return
    }
    if (existingSkillIds.includes(skillId)) {
      setError(`Skill ${skillId} already exists.`)
      return
    }
    const resolvedCats = cats.length ? cats : [defaultCategory]
    const types = damageTypes
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
    const classHint = resolvedCats[0]?.toLowerCase() || 'custom'
    const mlPath = suggestMythicLibSkillPath(classHint)
    const mmPath = suggestMythicMobsSkillPath(packName, classHint)

    const existingMl = files.find((f) => f.path === mlPath)
    const existingMm = files.find((f) => f.path === mmPath)

    const mlIds = new Set(
      existingMl ? extractTopLevelIds(parseYaml(existingMl.content).data) : [],
    )
    const mmIds = new Set(
      existingMm ? extractTopLevelIds(parseYaml(existingMm.content).data) : [],
    )
    if (mlIds.has(skillId) || mmIds.has(skillId)) {
      setError(`Skill ${skillId} is already in the target YAML file.`)
      return
    }

    const packsRoot = `MythicMobs/Packs/${packName}/`
    const hasPackFolder = files.some((f) => f.path.replace(/\\/g, '/').startsWith(packsRoot))
    if (!existingMm && !hasPackFolder && files.some((f) => /MythicMobs/i.test(f.path))) {
      setError(
        `No MythicMobs pack folder at ${packsRoot}. Open a workspace with that pack, or start a Class Pack workspace first.`,
      )
      return
    }

    const mlYaml = generateMythicLibSkillYaml({
      id: skillId,
      name: name.trim() || skillId,
      icon,
      categories: resolvedCats,
      lore: defaultMythicLibSkillLore(skillId, manaName, Object.keys(modifiers)),
      modifiers,
      manaName,
      itemScaling,
    })
    const mmYaml = generateMythicMobsSkillShell(skillId, modifiers, {
      damageTypes: types,
      damageElement: damageElement.trim() || resolvedCats[0],
    })

    onApply({
      files: [
        {
          path: mlPath,
          content: existingMl ? `${existingMl.content.trimEnd()}\n\n${mlYaml}` : mlYaml,
          mode: existingMl ? 'append' : 'create',
        },
        {
          path: mmPath,
          content: existingMm ? `${existingMm.content.trimEnd()}\n\n${mmYaml}` : mmYaml,
          mode: existingMm ? 'append' : 'create',
        },
      ],
    })
  }

  return (
    <DialogShell size="lg" labelledBy="ml-skill-title" onClose={onClose}>
      <DialogHeader
        title="New MythicLib skill"
        titleId="ml-skill-title"
        onClose={onClose}
        lead="Registers a MythicLib skill with source mythicmobs:ID and a castable MythicMobs stub using typed elemental damage."
      />

      <DialogBody>
        <DialogPanel title="Identity">
          <div className="dialog-fields">
            <label>
              Skill id
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="STORM_BOLT" />
            </label>
            <label>
              Display name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Categories
              <input value={categories} onChange={(e) => setCategories(e.target.value)} />
            </label>
            <label>
              Icon
              <input value={icon} onChange={(e) => setIcon(e.target.value)} />
            </label>
          </div>
        </DialogPanel>

        <DialogPanel title="Modifiers">
          <div className="dialog-fields">
            <label>
              Damage base
              <input
                type="number"
                value={damage}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setDamage(n)
                  setItemScaling(n)
                }}
              />
            </label>
            <label>
              Per level
              <input
                type="number"
                step="any"
                value={damagePer}
                onChange={(e) => setDamagePer(Number(e.target.value))}
              />
            </label>
            <label>
              Duration base
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <label>
              Duration per level
              <input
                type="number"
                step="any"
                value={durationPer}
                onChange={(e) => setDurationPer(Number(e.target.value))}
              />
            </label>
            <label>
              Item scaling
              <input
                type="number"
                step="any"
                value={itemScaling}
                onChange={(e) => setItemScaling(Number(e.target.value))}
              />
            </label>
          </div>
        </DialogPanel>

        <DialogPanel title="Damage">
          <div className="dialog-fields">
            <label>
              Damage types
              <input value={damageTypes} onChange={(e) => setDamageTypes(e.target.value)} />
            </label>
            <label>
              Damage element
              <input
                list="ml-dmg-el"
                value={damageElement}
                onChange={(e) => setDamageElement(e.target.value)}
              />
              <datalist id="ml-dmg-el">
                {DEFAULT_ELEMENT_IDS.map((el) => (
                  <option key={el} value={el} />
                ))}
              </datalist>
            </label>
            <div className="attr-picker">
              {DAMAGE_TYPE_CHIPS.map((t) => {
                const active = damageTypes
                  .split(/[,\s]+/)
                  .map((x) => x.trim().toUpperCase())
                  .filter(Boolean)
                  .includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    className={active ? 'chip active' : 'chip'}
                    onClick={() => {
                      const cur = new Set(
                        damageTypes
                          .split(/[,\s]+/)
                          .map((x) => x.trim().toUpperCase())
                          .filter(Boolean),
                      )
                      if (cur.has(t)) cur.delete(t)
                      else cur.add(t)
                      setDamageTypes([...cur].join(','))
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        </DialogPanel>

        {error ? <p className="error-copy">{error}</p> : null}
        <DialogPreviewBlock code={preview} />
      </DialogBody>

      <DialogFooter>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={submit}>
          Create skill files
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
