/** Skill-line presets grouped by cast pattern (direct fire, scatter, linked effects, and so on). */

import { parseSkillLineParts } from '../../core/mythicmobs/skillLineParts'

export type PresetCategory = 'plain' | 'direct' | 'scatter' | 'combo' | 'field' | 'shoot'

export interface CompanionSkill {
  id: string
  lines: string[]
}

export interface SkillPreset {
  id: string
  label: string
  /** Top-level metaskill id for the cast (used in full YAML export). */
  castSkillId: string
  category: PresetCategory
  description: string
  /** Primary skill line (mechanic + targeter). */
  mainLine: string
  /** Extra lines inside the cast metaskill, after mainLine. */
  extraCastLines?: string[]
  companions: CompanionSkill[]
  tips: string[]
}

export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  plain: 'Plain projectiles',
  direct: 'Directed fire',
  scatter: 'Scatter & rain',
  combo: 'Linked effects',
  field: 'Fields & anchors',
  shoot: 'Built-in shoot',
}

export const SKILL_PRESETS: SkillPreset[] = [
  {
    id: 'prism-pin',
    label: 'Prism Pin',
    castSkillId: 'PRISM_PIN',
    category: 'direct',
    description: 'Single-target bolt with a quartz item bullet and nearest-enemy targeting.',
    mainLine:
      'projectile{bulletType=ITEM;material=QUARTZ;onStart=PRISM_PIN-Start;onTick=PRISM_PIN-Tick;onHit=PRISM_PIN-Hit;v=10;i=1;hR=1;vR=1;tyo=1.5;sfo=0.2;syo=0.8;mr=24;hp=true;hnp=true} @EIR{r=24;limit=1;sort=NEAREST;target=players,monsters}',
    companions: [
      { id: 'PRISM_PIN-Start', lines: ['- sound{s=entity.blaze.shoot;v=0.8;p=1.2} @self'] },
      { id: 'PRISM_PIN-Tick', lines: ['- particle{p=end_rod;amount=4;speed=0.02;hS=0.1;vS=0.1} @origin'] },
      { id: 'PRISM_PIN-Hit', lines: ['- damage{amount=6}', '- particle{p=crit;amount=12;speed=0.1;hS=0.3;vS=0.3} @origin'] },
    ],
    tips: ['onTick effects use @origin.', 'Swap mr and @EIR radius to match your desired range.'],
  },
  {
    id: 'volt-hound',
    label: 'Volt Hound',
    castSkillId: 'VOLT_HOUND',
    category: 'direct',
    description: 'Homing missile salvo that prefers high-health targets.',
    mainLine:
      'missile{onStart=VOLT_HOUND-Start;onTick=VOLT_HOUND-Tick;onHit=VOLT_HOUND-Hit;v=28;i=1;hR=1;vR=1;in=8;tyo=1.5;sfo=0.2;syo=0.8;mr=22;hp=true;hnp=true;repeat=2;repeatinterval=3} @EIR{r=22;limit=1;sort=HIGHEST_HEALTH;target=players,monsters}',
    companions: [
      { id: 'VOLT_HOUND-Start', lines: ['- sound{s=entity.lightning_bolt.thunder;v=0.5;p=1.6} @self'] },
      { id: 'VOLT_HOUND-Tick', lines: ['- particle{p=electric_spark;amount=6;speed=0.05;hS=0.15;vS=0.15} @origin'] },
      { id: 'VOLT_HOUND-Hit', lines: ['- damage{amount=5;ignorearmor=true}', '- particle{p=flash;amount=1;speed=0} @origin'] },
    ],
    tips: ['in is homing spread. repeat fires extra missiles per cast.'],
  },
  {
    id: 'ash-ribbon',
    label: 'Ash Ribbon',
    castSkillId: 'ASH_RIBBON',
    category: 'direct',
    description: 'Short-range flamethrower that pierces entities.',
    mainLine:
      'projectile{onStart=ASH_RIBBON-Start;onTick=ASH_RIBBON-Tick;onHit=ASH_RIBBON-Hit;v=6;i=1;hR=1.2;vR=1;tyo=1.5;sfo=0.2;syo=0.8;mr=14;hp=true;hnp=true;sE=false} @EIR{r=14;limit=1;sort=NEAREST;target=players,monsters}',
    companions: [
      { id: 'ASH_RIBBON-Start', lines: ['- sound{s=item.firecharge.use;v=0.7;p=0.9} @self'] },
      { id: 'ASH_RIBBON-Tick', lines: ['- particle{p=flame;amount=8;speed=0.03;hS=0.2;vS=0.2} @origin'] },
      { id: 'ASH_RIBBON-Hit', lines: ['- damage{amount=3}', '- ignite{ticks=40}'] },
    ],
    tips: ['sE=false lets the jet pass through enemies.'],
  },
  {
    id: 'gossamer-snap',
    label: 'Gossamer Snap',
    castSkillId: 'GOSSAMER_SNAP',
    category: 'direct',
    description: 'Arcing cobweb shot that snares an area on landing.',
    mainLine:
      'projectile{bulletType=ITEM;material=COBWEB;onStart=GOSSAMER_SNAP-Start;onTick=GOSSAMER_SNAP-Tick;onEnd=GOSSAMER_SNAP-End;v=6;i=1;g=0.3;mr=18;hp=true;hnp=true;sE=false} @EIR{r=18;limit=2;sort=RANDOM;target=players,monsters}',
    companions: [
      { id: 'GOSSAMER_SNAP-Start', lines: ['- sound{s=entity.spider.ambient;v=0.4;p=1.3} @self'] },
      { id: 'GOSSAMER_SNAP-Tick', lines: ['- particle{p=item_slime;amount=2;speed=0} @origin'] },
      { id: 'GOSSAMER_SNAP-End', lines: ['- potion{type=SLOW;duration=80;level=2} @ENO{r=3}', '- particle{p=cloud;amount=15;speed=0.05;hS=1;vS=0.2} @origin'] },
    ],
    tips: ['onEnd runs when the shot lands or expires without a direct hit stop.'],
  },
  {
    id: 'skylith-slab',
    label: 'Skylith Slab',
    castSkillId: 'SKYLITH_SLAB',
    category: 'scatter',
    description: 'Meteor block that falls from above and detonates on end.',
    mainLine:
      'projectile{Type=METEOR;bulletType=BLOCK;material=STONE;onStart=SKYLITH_SLAB-Start;onTick=SKYLITH_SLAB-Tick;onHit=SKYLITH_SLAB-Hit;onEnd=SKYLITH_SLAB-End;v=4;i=1;hfs=16;g=0.3;hnp=true;sE=false} @RandomLocationsNearCaster{a=1;r=12;minr=4}',
    companions: [
      { id: 'SKYLITH_SLAB-Start', lines: ['- sound{s=entity.ender_dragon.flap;v=0.6;p=0.7} @origin'] },
      { id: 'SKYLITH_SLAB-Tick', lines: ['- particle{p=cloud;amount=3;speed=0.02;hS=0.2;vS=0.1} @origin'] },
      { id: 'SKYLITH_SLAB-Hit', lines: ['- damage{amount=8}'] },
      { id: 'SKYLITH_SLAB-End', lines: ['- particlesphere{p=explosion;radius=2;amount=1} @origin', '- damage{amount=10} @ENO{r=3}'] },
    ],
    tips: ['Type=METEOR spawns above the target, not at the caster.'],
  },
  {
    id: 'spokeflare-ring',
    label: 'Spokeflare Ring',
    castSkillId: 'SPOKEFLARE_RING',
    category: 'scatter',
    description: 'Ring of display bolts fired outward from the caster.',
    mainLine:
      'projectile{bulletType=DISPLAY;material=REDSTONE;scale=0.4,0.4,0.4;onTick=SPOKEFLARE_RING-Tick;onHit=SPOKEFLARE_RING-Hit;v=10;i=1;tyo=0.3;syo=0.8;mr=20;hp=true;hnp=true;g=0.05} @Ring{r=16;p=8}',
    companions: [
      { id: 'SPOKEFLARE_RING-Tick', lines: ['- particle{p=reddust;color=#ff4466;amount=3;speed=0} @origin'] },
      { id: 'SPOKEFLARE_RING-Hit', lines: ['- damage{amount=5}'] },
    ],
    tips: ['@Ring{p=N} picks N evenly spaced directions around the caster.'],
  },
  {
    id: 'voidfall-shower',
    label: 'Voidfall Shower',
    castSkillId: 'VOIDFALL_SHOWER',
    category: 'scatter',
    description: 'Meteor shower at random points near the caster.',
    mainLine:
      'projectile{Type=METEOR;onTick=VOIDFALL_SHOWER-Tick;onHit=VOIDFALL_SHOWER-Hit;v=14;i=1;hfs=32;g=0.35;mr=40;hnp=true} @RandomLocationsNearCaster{a=4;r=18;minr=3}',
    extraCastLines: [
      'projectile{Type=METEOR;onTick=VOIDFALL_SHOWER-Tick;onHit=VOIDFALL_SHOWER-Hit;v=14;i=1;hfs=32;g=0.35;mr=40;hnp=true} @RandomLocationsNearCaster{a=3;r=18;minr=3}',
    ],
    companions: [
      { id: 'VOIDFALL_SHOWER-Tick', lines: ['- particle{p=dripping_obsidian_tear;amount=2;speed=0.05} @origin'] },
      { id: 'VOIDFALL_SHOWER-Hit', lines: ['- damage{amount=6}', '- potion{type=WITHER;duration=60;level=0}'] },
    ],
    tips: ['Duplicate cast lines with higher a= for heavier volleys.'],
  },
  {
    id: 'rumble-toss',
    label: 'Rumble Toss',
    castSkillId: 'RUMBLE_TOSS',
    category: 'combo',
    description: 'Arcing cobble toss with a shock on landing.',
    mainLine:
      'projectile{bulletType=ITEM;material=COBBLESTONE;onTick=RUMBLE_TOSS-Tick;onEnd=RUMBLE_TOSS-End;v=8;i=1;g=0.25;sfo=0.5;syo=1;tyo=1.6;hp=true;hnp=true;sE=false} @targetLocation',
    companions: [
      { id: 'RUMBLE_TOSS-Tick', lines: ['- particle{p=block_crack;material=COBBLESTONE;amount=4;speed=0.05} @origin'] },
      { id: 'RUMBLE_TOSS-End', lines: ['- particle{p=explosion;amount=1;speed=0} @origin', '- damage{amount=7} @ENO{r=2.5}', '- throw{v=6;vy=4}'] },
    ],
    tips: ['Use onEnd for area effects when the toss lands.'],
  },
  {
    id: 'zephyr-fan',
    label: 'Zephyr Fan',
    castSkillId: 'ZEPHYR_FAN',
    category: 'combo',
    description: 'Low-gravity bolt. Add matching lines with hO=120 and hO=240 for a three-way fan.',
    mainLine:
      'projectile{onTick=ZEPHYR_FAN-Tick;onHit=ZEPHYR_FAN-Hit;v=14;i=1;hR=1;mr=14;md=80;g=0;hO=0;hp=true;hnp=true;sE=false} @targetLocation',
    extraCastLines: [
      'projectile{onTick=ZEPHYR_FAN-Tick;onHit=ZEPHYR_FAN-Hit;v=14;i=1;hR=1;mr=14;md=80;g=0;hO=120;hp=true;hnp=true;sE=false} @targetLocation',
      'projectile{onTick=ZEPHYR_FAN-Tick;onHit=ZEPHYR_FAN-Hit;v=14;i=1;hR=1;mr=14;md=80;g=0;hO=240;hp=true;hnp=true;sE=false} @targetLocation',
    ],
    companions: [
      { id: 'ZEPHYR_FAN-Tick', lines: ['- particle{p=cloud;amount=6;speed=0.04;hS=0.25;vS=0.1} @origin'] },
      { id: 'ZEPHYR_FAN-Hit', lines: ['- damage{amount=4}', '- throw{v=4;vy=1}'] },
    ],
    tips: ['Stack many hO offsets on extra cast lines for full-circle bursts.'],
  },
  {
    id: 'sepulchral-chain',
    label: 'Sepulchral Chain',
    castSkillId: 'SEPULCHRAL_CHAIN',
    category: 'combo',
    description: 'Chain lightning style bounce between nearby foes.',
    mainLine:
      'chain{skill=SEPULCHRAL_CHAIN-Hit;bounces=4;bounceRadius=8;bounceDelay=6;hitSelf=false;hitPlayers=true;hitNonPlayers=true} @EIR{r=10;limit=1;sort=NEAREST}',
    companions: [
      { id: 'SEPULCHRAL_CHAIN-Hit', lines: ['- damage{amount=5}', '- stun{d=20}', '- particle{p=soul;amount=10;speed=0.1;hS=0.3;vS=0.3} @self'] },
    ],
    tips: ['chain runs the same metaskill on each bounce target.'],
  },
  {
    id: 'morrow-stitch',
    label: 'Morrow Stitch',
    castSkillId: 'MORROW_STITCH',
    category: 'combo',
    description: 'Damaging bolt that sends a healing wisp back to the caster.',
    mainLine:
      'projectile{onStart=MORROW_STITCH-Start;onTick=MORROW_STITCH-Tick;onHit=MORROW_STITCH-Hit;v=10;i=1;mr=20;hp=true;hnp=true;sB=false;sE=false} @target',
    companions: [
      { id: 'MORROW_STITCH-Start', lines: ['- sound{s=entity.wither.shoot;v=0.5;p=1.4} @self'] },
      { id: 'MORROW_STITCH-Tick', lines: ['- particle{p=spell_witch;amount=4;speed=0.02} @origin'] },
      {
        id: 'MORROW_STITCH-Hit',
        lines: [
          '- damage{amount=7}',
          '- missile{onTick=MORROW_STITCH-Return-Tick;onHit=MORROW_STITCH-Return-Hit;v=12;i=1;in=6;mr=16;hp=true;hnp=false;sB=false;sE=false} @owner',
        ],
      },
      { id: 'MORROW_STITCH-Return-Tick', lines: ['- particle{p=heart;amount=2;speed=0} @origin'] },
      { id: 'MORROW_STITCH-Return-Hit', lines: ['- heal{amount=4} @owner'] },
    ],
    tips: ['Fire a return missile from onHit toward @owner for drain effects.'],
  },
  {
    id: 'wisp-carousel',
    label: 'Wisp Carousel',
    castSkillId: 'WISP_CAROUSEL',
    category: 'combo',
    description: 'Orbiting wisp that damages anything it touches.',
    mainLine: 'orbital{onTick=WISP_CAROUSEL-Tick;onHit=WISP_CAROUSEL-Hit;duration=120;interval=4;i=4} @self',
    companions: [
      { id: 'WISP_CAROUSEL-Tick', lines: ['- particle{p=end_rod;amount=3;speed=0.01;hS=0.1;vS=0.1} @origin'] },
      { id: 'WISP_CAROUSEL-Hit', lines: ['- damage{amount=3}'] },
    ],
    tips: ['Orbital inherits projectile attrs for bulletType and range.'],
  },
  {
    id: 'mire-pylon',
    label: 'Mire Pylon',
    castSkillId: 'MIRE_PYLON',
    category: 'field',
    description: 'Ground totem that slows and ticks damage.',
    mainLine: 'totem{ch=12;i=2;md=100;onTick=MIRE_PYLON-Tick;onHit=MIRE_PYLON-Hit;yo=0.2} @selflocation',
    companions: [
      { id: 'MIRE_PYLON-Tick', lines: ['- particle{p=slime;amount=8;speed=0.02;hS=0.5;vS=0.1} @origin'] },
      { id: 'MIRE_PYLON-Hit', lines: ['- damage{amount=2}', '- potion{type=SLOW;duration=40;level=1}'] },
    ],
    tips: ['ch is hit charges before the totem expires.'],
  },
  {
    id: 'riftsurge-ripple',
    label: 'Riftsurge Ripple',
    castSkillId: 'RIFTSURGE_RIPPLE',
    category: 'field',
    description: 'Ground-hugging wave that hits many targets in a radius.',
    mainLine:
      'projectile{onTick=RIFTSURGE_RIPPLE-Tick;onHit=RIFTSURGE_RIPPLE-Hit;v=6;i=1;hR=1;vR=1;mr=15;hs=true;hfs=0.4;hnp=true;hp=true} @EIR{r=15;target=players,monsters;limit=8}',
    companions: [
      { id: 'RIFTSURGE_RIPPLE-Tick', lines: ['- particle{p=block_crack;material=DIRT;amount=5;speed=0.02} @origin'] },
      { id: 'RIFTSURGE_RIPPLE-Hit', lines: ['- damage{amount=4}', '- throw{v=3;vy=2}'] },
    ],
    tips: ['hs=true keeps the projectile near the ground.'],
  },
  {
    id: 'maelstrom-seed',
    label: 'Maelstrom Seed',
    castSkillId: 'MAELSTROM_SEED',
    category: 'field',
    description: 'Mob-bullet vortex launched toward a ring of targets.',
    mainLine:
      'projectile{b=MOB;mob=MAELSTROM_SEED_DUMMY;onStart=MAELSTROM_SEED-Start;onTick=MAELSTROM_SEED-Tick;onHit=MAELSTROM_SEED-Hit;v=5;i=1;hR=1.5;vR=1;hnp=false;sE=false;mr=20} @ring{r=16;p=3}',
    companions: [
      { id: 'MAELSTROM_SEED-Start', lines: ['- sound{s=entity.wither.ambient;v=0.5;p=0.8} @self'] },
      { id: 'MAELSTROM_SEED-Tick', lines: ['- particle{p=portal;amount=8;speed=0.05;hS=0.4;vS=0.2} @origin'] },
      { id: 'MAELSTROM_SEED-Hit', lines: ['- damage{amount=5}', '- potion{type=CONFUSION;duration=60;level=0}'] },
    ],
    tips: ['Replace MAELSTROM_SEED_DUMMY with a small invisible MythicMob id.', 'b=MOB keeps the mob skills while flying.'],
  },
  {
    id: 'kindle-arc',
    label: 'Kindle Arc',
    castSkillId: 'KINDLE_ARC',
    category: 'scatter',
    description: 'High-arc TNT toss that explodes on end. Does not stop on entities.',
    mainLine:
      'projectile{bulletType=ITEM;bmd=true;material=TNT;onStart=KINDLE_ARC-Start;onTick=KINDLE_ARC-Tick;onEnd=KINDLE_ARC-End;v=6;i=1;hR=1;vR=1;tyo=18;sfo=0;syo=0.8;mr=28;g=0.18;hp=false;hnp=false;sE=false} @EIR{r=22;limit=1;sort=RANDOM;target=players,monsters}',
    companions: [
      { id: 'KINDLE_ARC-Start', lines: ['- sound{s=entity.ghast.shoot;v=0.8;p=0.9} @self'] },
      { id: 'KINDLE_ARC-Tick', lines: ['- particle{p=smoke;amount=4;speed=0.02;hS=0.1;vS=0.05} @origin'] },
      { id: 'KINDLE_ARC-End', lines: ['- particlesphere{p=explosion;radius=3;amount=1} @origin', '- damage{amount=12} @ENO{r=4}', '- throw{v=8;vy=5} @ENO{r=4}'] },
    ],
    tips: ['hp=false and sE=false so the bomb flies over crowds until it lands.', 'tyo=18 gives a high arc.'],
  },
  {
    id: 'prong-volley',
    label: 'Prong Volley',
    castSkillId: 'PRONG_VOLLEY',
    category: 'direct',
    description: 'Triple bolt with side offsets using endoffset spread.',
    mainLine:
      'projectile{bulletType=ITEM;bmd=true;enchanted=true;material=IRON_NUGGET;onStart=PRONG_VOLLEY-Start;onTick=PRONG_VOLLEY-Tick;onHit=PRONG_VOLLEY-Hit;v=10;i=1;hR=1;vR=1;tyo=1.5;sfo=0.2;syo=0.8;mr=22;endoffset=1.2;hp=true;hnp=true} @EIR{r=22;limit=1;sort=NEAREST;target=players,monsters}',
    extraCastLines: [
      'projectile{bulletType=ITEM;bmd=true;enchanted=true;material=IRON_NUGGET;onStart=PRONG_VOLLEY-Start;onTick=PRONG_VOLLEY-Tick;onHit=PRONG_VOLLEY-Hit;v=10;i=1;hR=1;vR=1;tyo=1.5;sfo=0.2;syo=0.8;mr=22;hp=true;hnp=true} @EIR{r=22;limit=1;sort=NEAREST;target=players,monsters}',
      'projectile{bulletType=ITEM;bmd=true;enchanted=true;material=IRON_NUGGET;onStart=PRONG_VOLLEY-Start;onTick=PRONG_VOLLEY-Tick;onHit=PRONG_VOLLEY-Hit;v=10;i=1;hR=1;vR=1;tyo=1.5;sfo=0.2;syo=0.8;mr=22;endoffset=-1.2;hp=true;hnp=true} @EIR{r=22;limit=1;sort=NEAREST;target=players,monsters}',
    ],
    companions: [
      { id: 'PRONG_VOLLEY-Start', lines: ['- sound{s=entity.blaze.shoot;v=0.9;p=1.1} @self'] },
      { id: 'PRONG_VOLLEY-Tick', lines: ['- particle{p=crit;amount=3;speed=0.05;hS=0.1;vS=0.1} @origin'] },
      { id: 'PRONG_VOLLEY-Hit', lines: ['- damage{amount=5}'] },
    ],
    tips: ['endoffset shifts impact left/right for spread without changing targeter.'],
  },
  {
    id: 'chill-pip',
    label: 'Chill Pip',
    castSkillId: 'CHILL_PIP',
    category: 'plain',
    description: 'Fast snowball projectile at the current target. One cast line, one hit skill.',
    mainLine:
      'projectile{bulletType=ITEM;material=SNOWBALL;onHit=CHILL_PIP-Hit;v=12;i=1;mr=20;hp=true;hnp=true} @target',
    companions: [{ id: 'CHILL_PIP-Hit', lines: ['- damage{amount=4}'] }],
    tips: ['Plain presets keep companion skills to a single onHit damage line.', 'Add onTick for trails when you need them.'],
  },
  {
    id: 'shard-lance',
    label: 'Shard Lance',
    castSkillId: 'SHARD_LANCE',
    category: 'plain',
    description: 'Piercing bolt that passes through entities without stopping.',
    mainLine:
      'projectile{onHit=SHARD_LANCE-Hit;v=16;i=1;mr=18;hp=false;hnp=true;sE=false} @target',
    companions: [{ id: 'SHARD_LANCE-Hit', lines: ['- damage{amount=3}'] }],
    tips: ['hp=false and sE=false let the bolt pierce multiple targets along its path.'],
  },
  {
    id: 'spark-waft',
    label: 'Spark Waft',
    castSkillId: 'SPARK_WAFT',
    category: 'plain',
    description: 'Short-range fire bolt with a light flame trail.',
    mainLine:
      'projectile{onTick=SPARK_WAFT-Tick;onHit=SPARK_WAFT-Hit;v=8;i=1;mr=12;hp=true;hnp=true} @target',
    companions: [
      { id: 'SPARK_WAFT-Tick', lines: ['- particle{p=flame;amount=3;speed=0.02;hS=0.08;vS=0.08} @origin'] },
      { id: 'SPARK_WAFT-Hit', lines: ['- damage{amount=4}', '- ignite{ticks=30}'] },
    ],
    tips: ['Keep mr low for close-range flick attacks.'],
  },
  {
    id: 'brine-needle',
    label: 'Brine Needle',
    castSkillId: 'BRINE_NEEDLE',
    category: 'plain',
    description: 'Thin display bolt with high velocity and long range.',
    mainLine:
      'projectile{bulletType=DISPLAY;material=QUARTZ;scale=0.2,0.2,0.8;onHit=BRINE_NEEDLE-Hit;v=22;i=1;mr=28;hp=true;hnp=true} @target',
    companions: [{ id: 'BRINE_NEEDLE-Hit', lines: ['- damage{amount=6}'] }],
    tips: ['DISPLAY bullets are good for custom shapes without item models.'],
  },
  {
    id: 'gloam-sphere',
    label: 'Gloam Sphere',
    castSkillId: 'GLOAM_SPHERE',
    category: 'plain',
    description: 'Slow, wide orb for readable telegraphed shots.',
    mainLine:
      'projectile{onTick=GLOAM_SPHERE-Tick;onHit=GLOAM_SPHERE-Hit;v=4;i=1;hR=0.9;vR=0.9;mr=16;hp=true;hnp=true} @target',
    companions: [
      { id: 'GLOAM_SPHERE-Tick', lines: ['- particle{p=witch;amount=4;speed=0.01;hS=0.15;vS=0.15} @origin'] },
      { id: 'GLOAM_SPHERE-Hit', lines: ['- damage{amount=5}'] },
    ],
    tips: ['Lower v and larger hR/vR make the shot easier to dodge.'],
  },
  {
    id: 'jolt-answer',
    label: 'Jolt Answer',
    castSkillId: 'JOLT_ANSWER',
    category: 'plain',
    description: 'Projectile fired at the entity that triggered the skill.',
    mainLine:
      'projectile{onHit=JOLT_ANSWER-Hit;v=14;i=1;mr=24;hp=true;hnp=true} @Trigger',
    companions: [{ id: 'JOLT_ANSWER-Hit', lines: ['- damage{amount=5}', '- stun{d=15}'] }],
    tips: ['Pair with ~onDamaged or ~onAttack triggers on the mob skill list.'],
  },
  {
    id: 'vane-spray',
    label: 'Vane Spray',
    castSkillId: 'VANE_SPRAY',
    category: 'plain',
    description: 'Fan of identical projectiles through a cone targeter.',
    mainLine:
      'projectile{onHit=VANE_SPRAY-Hit;v=10;i=1;mr=16;hp=true;hnp=true} @Cone{angle=45;length=12;points=5}',
    companions: [{ id: 'VANE_SPRAY-Hit', lines: ['- damage{amount=3}'] }],
    tips: ['Raise points= for denser fans. Each cone point fires its own projectile.'],
  },
  {
    id: 'starlit-sliver',
    label: 'Starlit Sliver',
    castSkillId: 'STARLIT_SLIVER',
    category: 'plain',
    description: 'Amethyst shard shot with a subtle sparkle trail.',
    mainLine:
      'projectile{bulletType=ITEM;material=AMETHYST_SHARD;onTick=STARLIT_SLIVER-Tick;onHit=STARLIT_SLIVER-Hit;v=11;i=1;mr=22;hp=true;hnp=true} @target',
    companions: [
      { id: 'STARLIT_SLIVER-Tick', lines: ['- particle{p=enchant;amount=2;speed=0.02} @origin'] },
      { id: 'STARLIT_SLIVER-Hit', lines: ['- damage{amount=5}'] },
    ],
    tips: ['Swap material= for other item bullets without changing the cast pattern.'],
  },
  {
    id: 'haze-spindle',
    label: 'Haze Spindle',
    castSkillId: 'HAZE_SPINDLE',
    category: 'plain',
    description: 'Homing missile with minimal tuning. No start or tick companions.',
    mainLine:
      'missile{onHit=HAZE_SPINDLE-Hit;v=15;i=1;in=4;mr=18;hp=true;hnp=true} @target',
    companions: [{ id: 'HAZE_SPINDLE-Hit', lines: ['- damage{amount=4}'] }],
    tips: ['in controls homing spread. Raise it for wider correction arcs.'],
  },
  {
    id: 'grit-arc',
    label: 'Grit Arc',
    castSkillId: 'GRIT_ARC',
    category: 'plain',
    description: 'Light arcing toss toward a ground point.',
    mainLine:
      'projectile{bulletType=ITEM;material=COBBLESTONE;onHit=GRIT_ARC-Hit;v=9;i=1;g=0.2;mr=20;hp=true;hnp=true;sE=false} @targetLocation',
    companions: [{ id: 'GRIT_ARC-Hit', lines: ['- damage{amount=4}'] }],
    tips: ['Use @targetLocation for ground-targeted lobs. Add onEnd for landing splash damage.'],
  },
  {
    id: 'fletch-shot',
    label: 'Fletch Shot',
    castSkillId: 'FLETCH_SHOT',
    category: 'shoot',
    description: 'Simple arrow via the shoot mechanic. Real projectile physics, no companion skills.',
    mainLine: 'shoot{type=ARROW;velocity=5;damage=8} @target',
    companions: [],
    tips: ['Use shoot for simple arrows. Use Prism Pin for custom trails and hit logic.'],
  },
]

export function parsePresetLine(line: string): { mechanic: string; targeter: string; trigger: string } {
  const { mechanic, targeter, trigger } = parseSkillLineParts(line)
  return { mechanic, targeter, trigger }
}

export function presetCastLines(preset: SkillPreset): string[] {
  return [preset.mainLine, ...(preset.extraCastLines ?? [])]
}

/** Companion metaskills only (for pasting after the cast skill). */
export function presetToYaml(preset: SkillPreset): string {
  if (preset.companions.length === 0) return ''
  return preset.companions
    .map((c) => `${c.id}:\n  Skills:\n${c.lines.map((l) => `  ${l}`).join('\n')}`)
    .join('\n\n')
}

/** Full skills-file block: cast metaskill plus every companion. */
export function presetToFullYaml(preset: SkillPreset): string {
  const castLines = presetCastLines(preset).map((l) => `  - ${l}`)
  const blocks: string[] = [
    `${preset.castSkillId}:\n  Skills:\n${castLines.join('\n')}`,
  ]
  for (const c of preset.companions) {
    blocks.push(`${c.id}:\n  Skills:\n${c.lines.map((l) => `  ${l}`).join('\n')}`)
  }
  return blocks.join('\n\n')
}

export function mobSkillReference(preset: SkillPreset): string {
  return `skill{s=${preset.castSkillId}} @target ~onTimer:100`
}
