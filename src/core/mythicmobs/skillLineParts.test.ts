import { describe, expect, it } from 'vitest'
import {
  parseSkillLineParts,
  serializeSkillLineParts,
  stripSkillLineListPrefix,
} from './skillLineParts'

describe('skillLineParts', () => {
  it('strips YAML list prefix', () => {
    expect(stripSkillLineListPrefix('  - damage{amount=5}')).toBe('damage{amount=5}')
    expect(stripSkillLineListPrefix('damage{amount=5}')).toBe('damage{amount=5}')
  })

  it('parses mechanic, targeter, trigger, and inline conditions', () => {
    const parts = parseSkillLineParts(
      '  - damage{amount=5} @NearestPlayer{r=10} ~onAttack ?day !night',
    )
    expect(parts.mechanic).toBe('damage{amount=5}')
    expect(parts.targeter).toBe('@NearestPlayer{r=10}')
    expect(parts.trigger).toBe('~onAttack')
    expect(parts.conditions).toEqual([
      { id: 'day', invert: false },
      { id: 'night', invert: true },
    ])
  })

  it('parses chance, health, and health percent fields', () => {
    const parts = parseSkillLineParts(
      'skill{s=X} ?chance{chance=0.25} ?health{h=10} ?healthpercent{p=<50%}',
    )
    expect(parts.chance).toBe('0.25')
    expect(parts.health).toBe('10')
    expect(parts.healthPercent).toBe('<50%')
  })

  it('round-trips a full skill line', () => {
    const line = 'damage{amount=5} @target ~onAttack ?day !night ?chance{chance=0.3}'
    const parts = parseSkillLineParts(line)
    expect(serializeSkillLineParts(parts)).toBe(line)
  })

  it('adds percent suffix when serializing bare health percent numbers', () => {
    const parts = parseSkillLineParts('damage{amount=1}')
    parts.healthPercent = '50'
    expect(serializeSkillLineParts(parts)).toBe('damage{amount=1} ?healthpercent{p=50%}')
  })
})
