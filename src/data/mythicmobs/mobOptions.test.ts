import { describe, expect, it } from 'vitest'
import {
  formatMobOptionValue,
  MOB_OPTION_NAMES,
  MOB_OPTIONS,
  mobOptionByName,
} from './mobOptions'
import { AI_GOAL_SELECTORS, AI_TARGET_SELECTORS } from './mobAiSelectors'

describe('mobOptions catalog', () => {
  it('has unique option names', () => {
    const names = MOB_OPTIONS.map((o) => o.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('includes core universal options', () => {
    expect(mobOptionByName('MovementSpeed')?.type).toBe('number')
    expect(mobOptionByName('AlwaysShowName')?.type).toBe('boolean')
    expect(mobOptionByName('Despawn')?.type).toBe('enum')
    expect(MOB_OPTION_NAMES).toContain('PreventOtherDrops')
  })

  it('formats values for yaml', () => {
    const speed = mobOptionByName('MovementSpeed')!
    expect(formatMobOptionValue(speed, 0.3)).toBe('0.3')
    const show = mobOptionByName('AlwaysShowName')!
    expect(formatMobOptionValue(show, true)).toBe('true')
    expect(formatMobOptionValue(show, 'false')).toBe('false')
  })
})

describe('mobAiSelectors catalog', () => {
  it('includes clear and common selectors', () => {
    expect(AI_GOAL_SELECTORS).toContain('clear')
    expect(AI_GOAL_SELECTORS).toContain('meleeattack')
    expect(AI_TARGET_SELECTORS).toContain('clear')
    expect(AI_TARGET_SELECTORS).toContain('players')
  })
})
