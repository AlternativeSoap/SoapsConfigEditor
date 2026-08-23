import {
  generateArchetypeYaml,
  generateMaxManaStatYaml,
  generateReagentYaml,
  generateSpellYaml,
} from '../../mythicrpg/generators'
import { REAGENT_PRESETS } from '../../../data/mythicrpg/presets'
import type { FileRecord } from '../../../types'
import { exampleFile, packBase } from './helpers'

export function buildGaleboundRpgFiles(packName: string): FileRecord[] {
  const base = packBase(packName)
  const files: FileRecord[] = []

  files.push(
    exampleFile(
      `${base}/reagents.yml`,
      `# MythicRPG reagents — Mana caps against stats.yml MAX_MANA\n\n${generateReagentYaml(REAGENT_PRESETS[0]!.apply()).trim()}\n`,
      packName,
      'reagents',
    ),
    exampleFile(
      `${base}/stats.yml`,
      `# MythicRPG stats — referenced by Mana reagent and Galebinder BaseStats\n\n${generateMaxManaStatYaml(1000).trim()}\n`,
      packName,
      'other',
    ),
  )

  const galeDart = generateSpellYaml({
    id: 'GALE_DART',
    display: 'Gale Dart',
    description: 'Launches a wind dart dealing {GALE} damage.',
    iconMaterial: 'FEATHER',
    castingMode: 'bound',
    clickCombo: '',
    cooldown: 3,
    upgrades: 5,
    costReagent: 'mana',
    costAmount: 25,
    modifierKey: 'GALE',
    modifierBase: 5,
    modifierPerLevel: 2,
    skills:
      'projectile{onTick=GALE_DART-Tick;onHit=GALE_DART-Hit;v=14;i=1;hR=0.4;vR=0.4;mr=24} @forward',
    targeter: '@forward',
    bindable: true,
    global: false,
  })

  const mistVeil = generateSpellYaml({
    id: 'MIST_VEIL',
    display: 'Mist Veil',
    description: 'Shrouds you in mist, restoring {HEAL} health.',
    iconMaterial: 'GLASS_BOTTLE',
    castingMode: 'bound',
    clickCombo: '',
    cooldown: 8,
    upgrades: 3,
    costReagent: 'mana',
    costAmount: 30,
    modifierKey: 'HEAL',
    modifierBase: 4,
    modifierPerLevel: 1.5,
    skills: 'heal{a=<spell.modifier.HEAL>} @self',
    targeter: '@self',
    bindable: true,
    global: false,
  })

  const chainSpark = generateSpellYaml({
    id: 'CHAIN_SPARK',
    display: 'Chain Spark',
    description: 'Releases a burst of static dealing {SPARK} damage nearby.',
    iconMaterial: 'LIGHTNING_ROD',
    castingMode: 'bound',
    clickCombo: '',
    cooldown: 6,
    upgrades: 4,
    costReagent: 'mana',
    costAmount: 35,
    modifierKey: 'SPARK',
    modifierBase: 6,
    modifierPerLevel: 2,
    skills:
      'damage{a=<spell.modifier.SPARK>} @EntitiesInRadius{r=4}\nparticles{p=ELECTRIC_SPARK;amount=15;hS=1.5;vS=0.5} @self',
    targeter: '@self',
    bindable: true,
    global: false,
  })

  files.push(
    exampleFile(
      `${base}/Skills/player_galebinder.yml`,
      `# Galebinder player spells — unlocks in Archetypes/classes.yml\n\nGALE_DART-Tick:\n  Skills:\n  - particles{p=CLOUD;amount=3;speed=0.01} @origin\n\nGALE_DART-Hit:\n  Skills:\n  - damage{a=<spell.modifier.GALE>} @target\n\n${galeDart.trim()}\n${mistVeil.trim()}\n${chainSpark.trim()}`,
      packName,
      'skills',
    ),
    exampleFile(
      `${base}/Skills/player_passives.yml`,
      `# Global passive — optional third unlock\n\n${generateSpellYaml({
        id: 'STATIC_AFFINITY',
        display: 'Static Affinity',
        description: 'Passive bonus health while this spell is known.',
        iconMaterial: 'YELLOW_DYE',
        castingMode: 'passive',
        clickCombo: '',
        cooldown: 0,
        upgrades: 3,
        costReagent: '',
        costAmount: 0,
        modifierKey: '',
        modifierBase: 0,
        modifierPerLevel: 0,
        skills: '',
        targeter: '@self',
        bindable: false,
        global: true,
        passiveStatKey: 'HEALTH',
        passiveStatBase: 1,
        passiveStatPerLevel: 1,
        passiveStatMax: 3,
      }).trim()}\n`,
      packName,
      'skills',
    ),
  )

  files.push(
    exampleFile(
      `${base}/Archetypes/classes.yml`,
      `# Galebinder class — SpellUnlocks reference Skills/player_galebinder.yml\n\n${generateArchetypeYaml({
        id: 'Galebinder',
        display: '&bGalebinder',
        group: 'CLASS',
        description: 'A storm-touched caster who bends gale winds.',
        iconMaterial: 'FEATHER',
        minLevel: 1,
        maxLevel: 50,
        experienceCurve: 'STANDARD',
        experienceSource: 'SPELLCASTING',
        spellUnlocks: 'GALE_DART\nMIST_VEIL',
        baseStatLine: "MAX_MANA '40 + 4*L'",
        statModifierLine: '',
      }).trim()}\n`,
      packName,
      'archetypes',
    ),
    exampleFile(
      `${base}/Archetypes/professions.yml`,
      `# Runescribe profession — levels from MINING in experience-sources.yml\n\n${generateArchetypeYaml({
        id: 'Runescribe',
        display: '&7Runescribe',
        group: 'PROFESSION',
        description: 'Inscribes runes while mining rare ore.',
        iconMaterial: 'WRITABLE_BOOK',
        minLevel: 1,
        maxLevel: 50,
        experienceCurve: 'SLOW',
        experienceSource: 'MINING',
        spellUnlocks: 'STATIC_AFFINITY',
        baseStatLine: '',
        statModifierLine: 'MAX_HEALTH 1',
      }).trim()}\n`,
      packName,
      'archetypes',
    ),
  )

  files.push(
    exampleFile(
      `${base}/experience-curves.yml`,
      `# MythicRPG experience curves — referenced by archetypes\nSTANDARD:\n  Type: FORMULA\n  Formula: 'x * 100'\n\nSLOW:\n  Type: FORMULA\n  Formula: 'x * 150'\n`,
      packName,
      'other',
    ),
    exampleFile(
      `${base}/experience-sources.yml`,
      `# MythicRPG experience sources — COMBAT includes example mob types\nCOMBAT:\n  Sources:\n  - Type: killEntity\n    Default: 1\n    Values:\n    - ZOMBIE 1to2\n    - SKELETON 1to2\n    - GaleboundSentinel 3to5\n    - AshWisp 1to2\n\nSPELLCASTING:\n  Sources:\n  - Type: castSpell\n    Default: 1\n\nMINING:\n  Sources:\n  - Type: blockBreak\n    Default: 1\n    Values:\n    - COAL_ORE 2\n    - IRON_ORE 4\n    - DIAMOND_ORE 10\n`,
      packName,
      'other',
    ),
  )

  return files
}
