import type { TriggerEntry } from '../mythicmobs/triggers'

/**
 * Crucible-only triggers (ids not already in base MythicMobs triggers).
 * Shared names like onAttack / onTimer stay on the base catalog.
 */
export const CRUCIBLE_TRIGGERS: TriggerEntry[] = [
  // Item
  { id: 'onBreak', description: 'When the player holding or equipping the item breaks it', insertSnippet: '~onBreak' },
  { id: 'onCancelUse', description: 'When the player stops using the item', insertSnippet: '~onCancelUse' },
  { id: 'onConsume', description: 'When the item is eaten', insertSnippet: '~onConsume' },
  { id: 'onCrouch', description: 'When the player crouches', insertSnippet: '~onCrouch' },
  { id: 'onUnCrouch', description: 'When the player stops crouching', insertSnippet: '~onUnCrouch' },
  { id: 'onEquip', description: 'When a player equips an armor piece', insertSnippet: '~onEquip' },
  { id: 'onUnEquip', description: 'When a player unequips an armor piece', insertSnippet: '~onUnEquip' },
  { id: 'onItemDrop', description: 'When the player drops an item', insertSnippet: '~onItemDrop' },
  { id: 'onItemPickup', description: 'When the player picks up an item', insertSnippet: '~onItemPickup' },
  { id: 'onPotionSplash', description: 'When a potion item is thrown and splashes', insertSnippet: '~onPotionSplash' },
  { id: 'onRightClick', description: 'When the player right-clicks', insertSnippet: '~onRightClick' },
  { id: 'onSwing', description: 'When the player left-clicks', insertSnippet: '~onSwing' },
  { id: 'onUse', description: 'When the player right-clicks while holding the item', insertSnippet: '~onUse' },
  { id: 'onFish', description: 'When a player casts a fishing line', insertSnippet: '~onFish' },
  { id: 'onFishBite', description: 'When there is a bite ready to reel in', insertSnippet: '~onFishBite' },
  { id: 'onFishCatch', description: 'When a player successfully catches a fish', insertSnippet: '~onFishCatch' },
  { id: 'onFishGrab', description: 'When a player catches an entity on the hook', insertSnippet: '~onFishGrab' },
  { id: 'onFishGround', description: 'When a bobber is stuck in the ground', insertSnippet: '~onFishGround' },
  { id: 'onFishReel', description: 'When a player reels in without a bite', insertSnippet: '~onFishReel' },
  { id: 'onFishFail', description: 'When a player fails to catch a bite', insertSnippet: '~onFishFail' },
  {
    id: 'onPressQ',
    description: 'When a player presses Q to drop the item',
    notes: 'Requires ProtocolLib',
    insertSnippet: '~onPressQ',
  },
  {
    id: 'onPressCtrlQ',
    description: 'When a player presses Ctrl+Q to drop the item',
    notes: 'Requires ProtocolLib',
    insertSnippet: '~onPressCtrlQ',
  },
  { id: 'onPressF', description: 'When a player presses F to swap the item', insertSnippet: '~onPressF' },
  {
    id: 'onPressF_HAND',
    description: 'When F-swap ends with the item in the main hand',
    insertSnippet: '~onPressF_HAND',
  },
  {
    id: 'onPressF_OFFHAND',
    description: 'When F-swap ends with the item in the offhand',
    insertSnippet: '~onPressF_OFFHAND',
  },
  {
    id: 'onPress',
    description: 'When a player presses a key',
    notes: 'Requires MythicKeys plugin and client mod',
    insertSnippet: '~onPress',
  },
  {
    id: 'onRelease',
    description: 'When a player releases a key',
    notes: 'Requires MythicKeys plugin and client mod',
    insertSnippet: '~onRelease',
  },
  { id: 'onJoin', description: 'When a player joins the server', insertSnippet: '~onJoin' },
  { id: 'onRespawn', description: 'When a player respawns', insertSnippet: '~onRespawn' },
  { id: 'onPickup', description: 'When a player picks up this Crucible item', insertSnippet: '~onPickup' },
  { id: 'onHold', description: 'When the player holds the item', insertSnippet: '~onHold' },
  { id: 'onUnHeld', description: 'When the player switches the item off the hotbar', insertSnippet: '~onUnHeld' },
  { id: 'onJump', description: 'When the player jumps', insertSnippet: '~onJump' },
  { id: 'onPaint', description: 'When a paintbrush paints furniture', insertSnippet: '~onPaint' },
  { id: 'onKill', description: 'When the player kills an entity', insertSnippet: '~onKill' },
  { id: 'onKillPlayer', description: 'When the player kills another player', insertSnippet: '~onKillPlayer' },
  { id: 'onProjectileThrow', description: 'When a special projectile is thrown', insertSnippet: '~onProjectileThrow' },
  {
    id: 'onStartDestroyBlock',
    description: 'When the player starts destroying a block',
    insertSnippet: '~onStartDestroyBlock',
  },
  {
    id: 'onStopDestroyBlock',
    description: 'When the player stops destroying a block',
    insertSnippet: '~onStopDestroyBlock',
  },
  // Custom blocks / furniture (also usable from item skills in many packs)
  { id: 'onBlockBreak', description: 'When a custom block or furniture is broken', insertSnippet: '~onBlockBreak' },
  { id: 'onBlockPlace', description: 'When a custom block or furniture is placed', insertSnippet: '~onBlockPlace' },
  { id: 'onBlockRotate', description: 'When furniture is rotated', insertSnippet: '~onBlockRotate' },
  { id: 'onBlockSit', description: 'When a player sits on furniture', insertSnippet: '~onBlockSit' },
  {
    id: 'onFurnitureStateChange',
    description: 'When furniture state changes via FurnitureState',
    insertSnippet: '~onFurnitureStateChange',
  },
  {
    id: 'onFurnitureInventoryOpen',
    description: 'When a furniture inventory is opened',
    insertSnippet: '~onFurnitureInventoryOpen',
  },
  {
    id: 'onFurnitureInventoryClose',
    description: 'When a furniture inventory is closed',
    insertSnippet: '~onFurnitureInventoryClose',
  },
]
