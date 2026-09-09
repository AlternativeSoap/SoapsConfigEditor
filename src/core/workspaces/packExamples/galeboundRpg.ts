import {
  generateArchetypeYaml,
  generateManaRegenStatYaml,
  generateMaxManaStatYaml,
  generatePointsYaml,
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
      `# MythicRPG stats — referenced by Mana reagent and Galebinder InitSkills\n\n${generateMaxManaStatYaml(100).trim()}\n\n${generateManaRegenStatYaml(2).trim()}\n`,
      packName,
      'stats',
    ),
    exampleFile(`${base}/points.yml`, `# MythicRPG point types\n\n${generatePointsYaml().trim()}\n`, packName, 'points'),
    exampleFile(
      `${base}/talents.yml`,
      `# Global attribute talent tree (menus/Attributes.yml layout can reference this).\n# Class talent trees usually live inside Archetypes TalentTree blocks.\n`,
      packName,
      'talents',
    ),
  )

  const galeDart = generateSpellYaml({
    id: 'GALE_DART',
    display: '<aqua>Gale Dart',
    description: 'Launches a wind dart dealing <white><spell.mod.GALE_DART.damage.precision.1><gray> damage.',
    iconMaterial: 'FEATHER',
    castingMode: 'bound',
    clickCombo: '',
    cooldown: 3,
    upgrades: 5,
    costReagent: 'Mana',
    costAmount: 25,
    modifierKey: 'damage',
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
    display: '<white>Mist Veil',
    description: 'Shrouds you in mist, restoring <white><spell.mod.MIST_VEIL.heal.precision.1><gray> health.',
    iconMaterial: 'GLASS_BOTTLE',
    castingMode: 'bound',
    clickCombo: '',
    cooldown: 8,
    upgrades: 3,
    costReagent: 'Mana',
    costAmount: 30,
    modifierKey: 'heal',
    modifierBase: 4,
    modifierPerLevel: 1.5,
    skills: 'heal{a=<spell.mod.MIST_VEIL.heal>} @self',
    targeter: '@self',
    bindable: true,
    global: false,
  })

  const chainSpark = generateSpellYaml({
    id: 'CHAIN_SPARK',
    display: '<yellow>Chain Spark',
    description: 'Releases a burst of static dealing <white><spell.mod.CHAIN_SPARK.damage.precision.1><gray> damage nearby.',
    iconMaterial: 'LIGHTNING_ROD',
    castingMode: 'bound',
    clickCombo: '',
    cooldown: 6,
    upgrades: 4,
    costReagent: 'Mana',
    costAmount: 35,
    modifierKey: 'damage',
    modifierBase: 6,
    modifierPerLevel: 2,
    skills:
      'damage{a=<spell.mod.CHAIN_SPARK.damage>} @EntitiesInRadius{r=4}\nparticles{p=ELECTRIC_SPARK;amount=15;hS=1.5;vS=0.5} @self',
    targeter: '@self',
    bindable: true,
    global: false,
  })

  files.push(
    exampleFile(
      `${base}/Skills/player_galebinder.yml`,
      `# Galebinder player spells — bound on Archetypes/classes.yml\n\nGALE_DART-Tick:\n  Skills:\n  - particles{p=CLOUD;amount=3;speed=0.01} @origin\n\nGALE_DART-Hit:\n  Skills:\n  - damage{a=<spell.mod.GALE_DART.damage>} @target\n\n${galeDart.trim()}\n${mistVeil.trim()}\n${chainSpark.trim()}`,
      packName,
      'skills',
    ),
    exampleFile(
      `${base}/Skills/player_passives.yml`,
      `# Global systems — mana regen ticks like ExamplePack_RPG\n\nGLOBAL_MANA_REGENERATION:\n  Spell: true\n  Global: true\n  Trigger: TIMER:20\n  Targeter: '@self'\n  Skills:\n  - modifyresource{resource=Mana;stat=MANA_REGENERATION} @self\n\n${generateSpellYaml({
        id: 'STATIC_AFFINITY',
        display: '<yellow>Static Affinity',
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
      `# Galebinder class — Bindings reference Skills/player_galebinder.yml\n\n${generateArchetypeYaml({
        id: 'Galebinder',
        display: '<aqua>Galebinder',
        group: 'CLASS',
        description: 'A storm-touched caster who bends gale winds.',
        iconMaterial: 'FEATHER',
        minLevel: 1,
        maxLevel: 50,
        experienceCurve: 'RPG_LEVEL_50',
        experienceSource: 'SPELLCASTING',
        spellUnlocks: 'GALE_DART\nMIST_VEIL\nCHAIN_SPARK',
        baseStatLine: '',
        statModifierLine: 'MAX_MANA 40 ADDITIVE',
      }).trim()}\n`,
      packName,
      'archetypes',
    ),
    exampleFile(
      `${base}/Archetypes/professions.yml`,
      `# Runescribe profession — levels from MINING in experience-sources.yml\n\n${generateArchetypeYaml({
        id: 'Runescribe',
        display: '<gray>Runescribe',
        group: 'PROFESSION',
        description: 'Inscribes runes while mining rare ore.',
        iconMaterial: 'WRITABLE_BOOK',
        minLevel: 1,
        maxLevel: 50,
        experienceCurve: 'SLOW',
        experienceSource: 'MINING',
        spellUnlocks: 'STATIC_AFFINITY',
        baseStatLine: '',
        statModifierLine: 'HEALTH 1 ADDITIVE',
      }).trim()}\n`,
      packName,
      'archetypes',
    ),
  )

  files.push(
    exampleFile(
      `${base}/experience-curves.yml`,
      `# MythicRPG experience curves — referenced by archetypes\nRPG_LEVEL_50:\n  Type: FORMULA\n  Formula: '100 + x * 25 + x * x * 5'\n\nSTANDARD:\n  Type: FORMULA\n  Formula: 'x * 100'\n\nSLOW:\n  Type: FORMULA\n  Formula: 'x * 150'\n`,
      packName,
      'experience-curves',
    ),
    exampleFile(
      `${base}/experience-sources.yml`,
      `# MythicRPG experience sources — Types match ExamplePack_RPG\nRPG_COMBAT:\n  Message: '<gray>+<gold>{amount}<gray> class exp'\n  Sources:\n  - Type: KILL_ENTITY\n    Values:\n    - ZOMBIE 6\n    - SKELETON 6\n    - GaleboundSentinel 12\n    - AshWisp 8\n    Default: 4\n\nSPELLCASTING:\n  Message: '<gray>+<gold>{amount}<gray> spellcasting exp'\n  Sources:\n  - Type: CAST_SPELL\n    Default: 1\n\nMINING:\n  Message: '<gray>+<gold>{amount}<gray> mining exp'\n  Sources:\n  - Type: BLOCK_BREAK\n    Default: 1\n    Values:\n    - COAL_ORE 2\n    - IRON_ORE 4\n    - DIAMOND_ORE 10\n`,
      packName,
      'experience-sources',
    ),
  )

  return files
}
