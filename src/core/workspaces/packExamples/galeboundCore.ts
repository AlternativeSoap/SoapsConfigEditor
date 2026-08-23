import { generateDroptableYaml, generateRandomSpawnYaml } from '../../mythicmobs/generators'
import { generatePackInfoYaml } from '../../mythicmobs/packInfo'
import type { FileRecord } from '../../../types'
import type { MythicAddons } from '../mythicAddons'
import { exampleFile, packBase } from './helpers'

export function buildGaleboundCoreFiles(packName: string, addons: MythicAddons): FileRecord[] {
  const base = packBase(packName)
  const files: FileRecord[] = []

  files.push(
    exampleFile(
      `${base}/packinfo.yml`,
      generatePackInfoYaml({
        name: packName,
        author: 'Soaps Config Editor',
        description: [
          '&7Galebound Covenant example pack.',
          '&7Storm-touched mobs, items, and skills linked together.',
        ],
        headerComments: [
          'Galebound Covenant — linked example pack',
          'Storm-touched mobs and gear. Tune numbers for your server.',
        ],
      }),
      packName,
      'packinfo',
    ),
  )

  files.push(
    exampleFile(
      `${base}/Skills/ash_wisp.yml`,
      `# Ash Wisp skills — used by Mobs/ash_wisps.yml\n\nAshWisp_Flicker:\n  Skills:\n  - teleport{spreadh=1;spreadv=0} @self\n  - particles{p=ASH;amount=12;hS=0.3;vS=0.3;speed=0.02} @self\n  - sound{s=entity.enderman.teleport;v=0.6;p=1.2} @self\n\nAshWisp_EmberTouch:\n  Skills:\n  - damage{a=3} @target\n  - ignite{t=40} @target\n`,
      packName,
      'skills',
    ),
    exampleFile(
      `${base}/Skills/galebound_combat.yml`,
      `# Galebound Sentinel melee — referenced on ~onAttack\n\nGalebound_WindLunge:\n  Cooldown: 4\n  Skills:\n  - lunge{velocity=1.2;velocityY=0.1} @self\n  - delay 2\n  - damage{a=6} @EntitiesInLine{r=1.5}\n\nGalebound_MeleeSwipe:\n  Skills:\n  - damage{a=4} @target\n  - particles{p=SWEEP_ATTACK;amount=3;speed=0.01} @target\n`,
      packName,
      'skills',
    ),
    exampleFile(
      `${base}/Skills/galebound_storm.yml`,
      `# Galebound storm skills — sentinel timer skills and item ~onUse\n\nGalebound_StaticBurst:\n  Cooldown: 8\n  Skills:\n  - particles{p=ELECTRIC_SPARK;amount=24;hS=1.5;vS=0.5;speed=0.05} @self\n  - sound{s=entity.lightning_bolt.thunder;v=0.5;p=1.4} @self\n  - damage{a=5} @EntitiesInRadius{r=4}\n\nGalebound_StormCall:\n  Cooldown: 12\n  Skills:\n  - skill{s=Galebound_StormCall-Hit} @target\n\nGalebound_StormCall-Hit:\n  Skills:\n  - projectile{onTick=Galebound_StormCall-Tick;onHit=Galebound_StormCall-Impact;v=12;i=1;hR=0.5;vR=0.5;mr=20} @target\n\nGalebound_StormCall-Tick:\n  Skills:\n  - particles{p=CLOUD;amount=4;speed=0.01;hS=0.1;vS=0.1} @origin\n\nGalebound_StormCall-Impact:\n  Skills:\n  - damage{a=7} @target\n  - particles{p=ELECTRIC_SPARK;amount=10;hS=0.4;vS=0.4} @target\n\nGalebound_SetStatic:\n  Skills:\n  - particles{p=ELECTRIC_SPARK;amount=8;hS=0.6;vS=0.6} @self\n  - damage{a=3} @trigger\n`,
      packName,
      'skills',
    ),
    exampleFile(
      `${base}/Skills/galebound_meta.yml`,
      `# Sentinel spawn and death hooks\n\nGalebound_OnSpawn:\n  Skills:\n  - particles{p=ASH;amount=20;hS=1;vS=1;speed=0.03} @self\n  - sound{s=entity.wither.spawn;v=0.4;p=1.6} @self\n\nGalebound_OnDeath:\n  Skills:\n  - particles{p=SMOKE_LARGE;amount=8;hS=0.5;vS=0.5} @self\n`,
      packName,
      'skills',
    ),
  )

  files.push(
    exampleFile(
      `${base}/Mobs/ash_wisps.yml`,
      `# Fast trash mob — links to Skills/ash_wisp.yml\n\nAshWisp:\n  Type: PHANTOM\n  Display: '&7Ash Wisp'\n  Health: 40\n  Damage: 2\n  Options:\n    MovementSpeed: 0.35\n    Silent: true\n    PreventOtherDrops: true\n  AIGoalSelectors:\n  - clear\n  - randomstroll\n  - float\n  AITargetSelectors:\n  - clear\n  - players\n  Skills:\n  - skill{s=AshWisp_Flicker} @self ~onTimer:80\n  - skill{s=AshWisp_EmberTouch} @target ~onAttack\n`,
      packName,
      'mobs',
    ),
    exampleFile(
      `${base}/Mobs/galebound_sentinel.yml`,
      `# Elite mob — links to combat/storm skills, GALEBOUND_LOOT, Galebound_Charger\n\nGaleboundSentinel:\n  Type: VINDICATOR\n  Display: '&bGalebound Sentinel'\n  Health: 150\n  Damage: 6\n  Faction: Galebound\n  Armor: 8\n  Options:\n    MovementSpeed: 0.28\n    AlwaysShowName: true\n    Glowing: true\n  AIGoalSelectors:\n  - clear\n  - meleeattack\n  - randomstroll\n  AITargetSelectors:\n  - clear\n  - players\n  Equipment:\n    HAND: Galebound_Charger\n  Drops:\n  - GALEBOUND_LOOT\n  Skills:\n  - skill{s=Galebound_OnSpawn} @self ~onSpawn\n  - skill{s=Galebound_OnDeath} @self ~onDeath\n  - skill{s=Galebound_MeleeSwipe} @target ~onAttack 0.65\n  - skill{s=Galebound_WindLunge} @target ~onAttack 0.25\n  - skill{s=Galebound_StaticBurst} @self ~onTimer:100\n  - skill{s=Galebound_StormCall} @target ~onTimer:160\n`,
      packName,
      'mobs',
    ),
  )

  files.push(
    exampleFile(
      `${base}/Items/trinkets.yml`,
      `# Regular MythicMobs items — Galebound_Charger calls Galebound_StaticBurst\n\nGalebound_Charger:\n  Id: BLAZE_ROD\n  Display: '&bGalebound Charger'\n  Options:\n    PreventStacking: true\n  Lore:\n  - '&7Focuses static energy from the gale.'\n  Skills:\n  - skill{s=Galebound_StaticBurst} @self ~onUse\n\nAshWisp_Token:\n  Id: GUNPOWDER\n  Display: '&8Ash Wisp Token'\n  Lore:\n  - '&7Proof you survived the ash winds.'\n  NBT:\n    SoapsRarity: COMMON\n`,
      packName,
      'items',
    ),
  )

  const drops = [
    { type: 'item' as const, value: 'AshWisp_Token', minAmount: 1, maxAmount: 2, chance: 1 },
    { type: 'item' as const, value: 'Galebound_Charger', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]
  if (addons.crucible) {
    drops.push({
      type: 'item',
      value: 'Static_Rune_Shard',
      minAmount: 1,
      maxAmount: 1,
      chance: 0.08,
    })
  }

  files.push(
    exampleFile(
      `${base}/DropTables/galebound_loot.yml`,
      `# Drops for GaleboundSentinel — references Items/trinkets.yml\n\n${generateDroptableYaml({ id: 'GALEBOUND_LOOT', drops }).trim()}\n`,
      packName,
      'droptables',
    ),
    exampleFile(
      `${base}/randomspawns/galebound_spawns.yml`,
      `# Low-chance overworld spawn for GaleboundSentinel\n\n${generateRandomSpawnYaml({
        id: 'GaleboundSentinelSpawn',
        action: 'ADD',
        mobType: 'GaleboundSentinel',
        level: '1-3',
        chance: 0.08,
        worlds: 'world',
        biomes: 'PLAINS,FOREST',
        conditions: '',
      }).trim()}\n`,
      packName,
      'randomspawns',
    ),
  )

  return files
}
