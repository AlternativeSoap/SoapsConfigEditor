import {
  generateAugmentTypeYaml,
  generateCrucibleItemYaml,
  generateEquipmentSetYaml,
} from '../../mythiccrucible/generators'
import { emptyCrucibleItem } from '../../../data/mythiccrucible/presets'
import { DEFAULT_SET_PIECE_LORE } from '../../../data/mythiccrucible/itemCompletions'
import type { FileRecord } from '../../../types'
import { exampleFile, packBase } from './helpers'

export function buildGaleboundCrucibleFiles(packName: string): FileRecord[] {
  const base = packBase(packName)

  const equipmentSet = generateEquipmentSetYaml({
    id: 'Galebound_Regalia',
    display: '<aqua>Galebound Regalia',
    enabled: true,
    lore:
      '<yellow>[2]: <gray>+8 Defense\n<yellow>[4]: <gray>Chance to retaliate with static',
    bonuses: [
      { pieces: 2, stats: 'DEFENSE 8 ADDITIVE', skills: '' },
      {
        pieces: 4,
        stats: 'CRITICAL_STRIKE_DAMAGE 0.08 ADDITIVE',
        skills: 'skill{s=Galebound_SetStatic} @trigger ~onDamaged 0.25',
      },
    ],
  })

  const augmentType = generateAugmentTypeYaml({
    id: 'STATIC_RUNE',
    display: 'Static Rune',
    enabled: true,
    emptyFormat: '<augment.icon> Empty <augment.type> Slot',
    filledFormat: '<augment.icon> <augment.type>: <augment.tooltip>',
    showEmptySlot: true,
    iconEmpty: '◇',
    iconFilled: '◆',
    iconInvalid: '✗',
  })

  const arcblade = generateCrucibleItemYaml({
    ...emptyCrucibleItem(),
    id: 'Galebound_Arcblade',
    material: 'IRON_SWORD',
    display: '<aqua>Galebound Arcblade',
    group: 'weapons',
    stats: 'ATTACK_DAMAGE 7 ADDITIVE\nCRITICAL_STRIKE_CHANCE 0.04 ADDITIVE',
    skills: 'ignite{t=40} @target ~onHit',
  })

  const helm = generateCrucibleItemYaml({
    ...emptyCrucibleItem(),
    id: 'Galebound_Regalia_Helm',
    material: 'IRON_HELMET',
    display: '<aqua>Galebound Regalia Helm',
    group: 'galebound_regalia',
    lore: DEFAULT_SET_PIECE_LORE,
    stats: 'DEFENSE 4 ADDITIVE',
    equipmentSet: 'Galebound_Regalia',
    augmentSlots: [{ type: 'STATIC_RUNE', amount: '1', chance: '1', maxAmount: '' }],
  })

  const runeShard = generateCrucibleItemYaml({
    ...emptyCrucibleItem(),
    id: 'Static_Rune_Shard',
    material: 'AMETHYST_SHARD',
    display: '<aqua>Static Rune Shard',
    group: 'gems',
    role: 'gem',
    lore: '',
    stats: 'ATTACK_SPEED 0.08 ADDITIVE',
    optionsPlaceable: false,
    augmentType: 'STATIC_RUNE',
    augmentTooltip: '<aqua>+0.08 Attack Speed',
    skills: '',
  })

  const tonic = generateCrucibleItemYaml({
    ...emptyCrucibleItem(),
    id: 'Galebound_Tonic',
    material: 'POTION',
    display: '<b>Galebound Tonic',
    group: 'consumables',
    lore: '<gray>Right-click to recover health.',
    stats: '',
    optionsPlaceable: false,
    skills:
      'skill{s=[\n  - potion{type=REGEN;duration=80;level=1}\n  - heal{a=4}\n  - consumeuseditem{amount=1} @self\n]} @self ~onUse',
  })

  return [
    exampleFile(
      `${base}/equipment-sets.yml`,
      `# Galebound Regalia — 4pc set bonus calls Galebound_SetStatic in Skills/galebound_storm.yml\n\n${equipmentSet.trim()}\n`,
      packName,
      'equipment-sets',
    ),
    exampleFile(
      `${base}/augments.yml`,
      `# Static Rune augment type — socketed on Galebound_Regalia_Helm\n\n${augmentType.trim()}\n`,
      packName,
      'augments',
    ),
    exampleFile(
      `${base}/Items/weapons.yml`,
      `# Crucible weapons\n\n${arcblade.trim()}\n`,
      packName,
      'items',
    ),
    exampleFile(
      `${base}/Items/gear.yml`,
      `# Set piece and augment gem — links equipment-sets.yml and augments.yml\n\n${helm.trim()}\n${runeShard.trim()}\n`,
      packName,
      'items',
    ),
    exampleFile(
      `${base}/Items/consumables.yml`,
      `# Server-ready consumable\n\n${tonic.trim()}\n`,
      packName,
      'items',
    ),
  ]
}
