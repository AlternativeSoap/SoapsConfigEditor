import { describe, expect, it } from 'vitest'
import {
  parseCrucibleStatLines,
  serializeCrucibleStatLines,
} from './statLines'

describe('crucible stat lines', () => {
  it('parses and serializes item stat lines', () => {
    const raw = 'ATTACK_DAMAGE 8 ADDITIVE\nCRITICAL_STRIKE_CHANCE 0.05 ADDITIVE'
    const rows = parseCrucibleStatLines(raw)
    expect(rows).toEqual([
      { id: 'ATTACK_DAMAGE', value: '8', modifier: 'ADDITIVE' },
      { id: 'CRITICAL_STRIKE_CHANCE', value: '0.05', modifier: 'ADDITIVE' },
    ])
    expect(serializeCrucibleStatLines(rows)).toBe(raw)
  })

  it('defaults missing modifiers to ADDITIVE and keeps ranges', () => {
    const rows = parseCrucibleStatLines('HEALTH 20to30\nMOVEMENT_SPEED 0.1 ADDITIVE_MULTIPLIER')
    expect(rows[0]).toEqual({ id: 'HEALTH', value: '20to30', modifier: 'ADDITIVE' })
    expect(rows[1]).toEqual({
      id: 'MOVEMENT_SPEED',
      value: '0.1',
      modifier: 'ADDITIVE_MULTIPLIER',
    })
  })
})
