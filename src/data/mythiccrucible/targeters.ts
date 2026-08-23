import type { TargeterEntry } from '../mythicmobs/targeters'

/** Crucible-only targeters. */
export const CRUCIBLE_TARGETERS: TargeterEntry[] = [
  {
    id: 'FurnitureInRadius',
    shorthand: ['@FIR'],
    kind: 'entity',
    description: 'Targets furniture in a radius',
    insertSnippet: '@FurnitureInRadius{r=5}',
  },
  {
    id: 'FurnitureNearOrigin',
    shorthand: ['@FNO'],
    kind: 'entity',
    description: 'Targets furniture in a radius around the origin',
    insertSnippet: '@FurnitureNearOrigin{r=5}',
  },
  {
    id: 'MuzzleLocation',
    shorthand: ['@Muzzle'],
    kind: 'location',
    description: 'Targets the muzzle location of the held item',
    insertSnippet: '@MuzzleLocation',
  },
  {
    id: 'Furniture',
    shorthand: [],
    kind: 'meta',
    description: 'Targets furniture found at the inherited locations',
    insertSnippet: '@Furniture',
  },
]
