import type { ConditionEntry } from '../mythicmobs/conditions'

/** Crucible-only conditions. */
export const CRUCIBLE_CONDITIONS: ConditionEntry[] = [
  {
    id: 'attackoncooldown',
    type: 'entity',
    description: 'Checks if the player has an active attack cooldown',
    insertSnippet: 'attackoncooldown true',
  },
  {
    id: 'blockhardness',
    type: 'location',
    description: 'Checks the hardness of the block at the target location',
    insertSnippet: 'blockhardness{h=>1} true',
  },
  {
    id: 'containertype',
    type: 'meta',
    description: 'Checks the inventory type of the container involved in the trigger',
    insertSnippet: 'containertype{type=CHEST} true',
  },
  {
    id: 'custommodeldata',
    type: 'meta',
    description: 'Tests the custom model data of the calling item',
    insertSnippet: 'custommodeldata{model=1} true',
  },
  {
    id: 'enchantmentlevel',
    type: 'meta',
    description: 'Checks the enchantment level in the skill enchant-level variable',
    insertSnippet: 'enchantmentlevel{level=>1} true',
  },
  {
    id: 'equipslot',
    type: 'meta',
    description: 'Matches the equipment slot the skill was called from',
    insertSnippet: 'equipslot{slot=HAND} true',
  },
  {
    id: 'hasinventoryspace',
    type: 'entity',
    description: 'Checks how many empty slots the player inventory has',
    insertSnippet: 'hasinventoryspace{amount=>1} true',
  },
  {
    id: 'hasitem',
    type: 'entity',
    description: 'Checks if the player has a matching item in their inventory',
    insertSnippet: 'hasitem{item=STONE;amount=1} true',
  },
  {
    id: 'hassetpieces',
    type: 'entity',
    description: 'Checks how many pieces of an equipment set the player has equipped',
    insertSnippet: 'hassetpieces{set=MY_SET;amount=>2} true',
  },
  {
    id: 'iscrossbowcharged',
    type: 'meta',
    description: 'Checks if the triggering crossbow has charged projectiles',
    insertSnippet: 'iscrossbowcharged true',
  },
  {
    id: 'itemammo',
    type: 'entity',
    description: 'Checks the player current ammo count',
    insertSnippet: 'itemammo{amount=>1} true',
  },
  {
    id: 'itemdurability',
    type: 'meta',
    description: 'Checks the remaining durability of an item',
    insertSnippet: 'itemdurability{amount=>1} true',
  },
  {
    id: 'itemreloading',
    type: 'entity',
    description: 'Checks if the player ammo weapon is reloading',
    insertSnippet: 'itemreloading true',
  },
  {
    id: 'itemupgradelevel',
    type: 'meta',
    description: 'Checks the upgrade level of the item in the specified slot',
    insertSnippet: 'itemupgradelevel{slot=HAND;level=>1} true',
  },
  {
    id: 'matchestriggerblock',
    type: 'location',
    description: 'Checks if the trigger block matches the block at the target location',
    insertSnippet: 'matchestriggerblock true',
  },
  {
    id: 'matchestriggerblockbreakingspeed',
    type: 'location',
    description: 'Checks if the target block breaks at least as fast as the trigger block',
    insertSnippet: 'matchestriggerblockbreakingspeed true',
  },
  {
    id: 'mythickeyid',
    type: 'meta',
    description: 'Matches the key ID the skill was called from (MythicKeys)',
    insertSnippet: 'mythickeyid{id=minecraft:jump} true',
  },
  {
    id: 'furnituredirection',
    type: 'meta',
    description: 'Checks if the targeted furniture has a specific direction',
    insertSnippet: 'furnituredirection{direction=NORTH} true',
  },
  {
    id: 'isfurniture',
    type: 'meta',
    description: 'Checks if the target is furniture or furniture exists at the location',
    insertSnippet: 'isfurniture true',
  },
  {
    id: 'furniturestate',
    type: 'meta',
    description: 'Checks if the target furniture is the specified state',
    insertSnippet: 'furniturestate{state=OPEN} true',
  },
  {
    id: 'furnituretype',
    type: 'meta',
    description: 'Checks the type of furniture being targeted',
    insertSnippet: 'furnituretype{type=MyFurniture} true',
  },
]
