/** Parsed pieces of a MythicMobs inline skill line (without YAML list prefix). */

export interface SkillLineCondition {
  id: string
  invert: boolean
}

export interface SkillLineParts {
  mechanic: string
  targeter: string
  trigger: string
  conditions: SkillLineCondition[]
  chance: string
  health: string
  healthPercent: string
}

export const EMPTY_SKILL_LINE_PARTS: SkillLineParts = {
  mechanic: '',
  targeter: '',
  trigger: '',
  conditions: [],
  chance: '',
  health: '',
  healthPercent: '',
}

/** Remove optional YAML list prefix (`  - `) from a skill line. */
export function stripSkillLineListPrefix(line: string): string {
  return line.replace(/^\s+-\s+/, '')
}

export function parseSkillLineParts(line: string): SkillLineParts {
  const body = stripSkillLineListPrefix(line)
  const tokens = body.trim().split(/\s+/).filter(Boolean)
  let mechanic = ''
  let targeter = ''
  let trigger = ''
  const conditions: SkillLineCondition[] = []
  let chance = ''
  let health = ''
  let healthPercent = ''

  for (const tok of tokens) {
    if (tok.startsWith('@')) {
      targeter = tok
    } else if (/^\??chance\{/i.test(tok)) {
      const m = tok.match(/chance\s*=\s*([^}]+)/i) || tok.match(/\bc\s*=\s*([^}]+)/i)
      chance = m?.[1]?.trim() ?? ''
    } else if (/^\??healthpercent\{/i.test(tok)) {
      const m =
        tok.match(/\bp\s*=\s*([^}]+)/i) ||
        tok.match(/healthpercent\s*=\s*([^}]+)/i) ||
        tok.match(/\bhp\s*=\s*([^}]+)/i)
      healthPercent = m?.[1]?.trim() ?? ''
    } else if (/^\??health\{/i.test(tok)) {
      const m =
        tok.match(/\bh\s*=\s*([^}]+)/i) ||
        tok.match(/health\s*=\s*([^}]+)/i) ||
        tok.match(/\bamount\s*=\s*([^}]+)/i) ||
        tok.match(/\ba\s*=\s*([^}]+)/i)
      health = m?.[1]?.trim() ?? ''
    } else if (tok.startsWith('~chance:')) {
      chance = tok.slice(8)
    } else if (tok.startsWith('~health:')) {
      health = tok.slice(8)
    } else if (tok.startsWith('~')) {
      trigger = tok
    } else if (tok.startsWith('!') || tok.startsWith('?')) {
      conditions.push({ id: tok.slice(1), invert: tok.startsWith('!') })
    } else if (tok.includes('{') || (!targeter && !trigger && !mechanic)) {
      mechanic = tok
    } else {
      conditions.push({ id: tok, invert: false })
    }
  }

  return { mechanic, targeter, trigger, conditions, chance, health, healthPercent }
}

export function serializeSkillLineParts(parts: SkillLineParts): string {
  const out: string[] = []
  if (parts.mechanic) out.push(parts.mechanic)
  if (parts.targeter) {
    out.push(parts.targeter.startsWith('@') ? parts.targeter : `@${parts.targeter}`)
  }
  if (parts.trigger) {
    out.push(parts.trigger.startsWith('~') ? parts.trigger : `~${parts.trigger}`)
  }
  for (const c of parts.conditions) {
    const raw = c.id.replace(/^[!?]/, '')
    out.push(`${c.invert ? '!' : '?'}${raw}`)
  }
  if (parts.chance.trim()) {
    out.push(`?chance{chance=${parts.chance.trim()}}`)
  }
  if (parts.health.trim()) {
    out.push(`?health{h=${parts.health.trim()}}`)
  }
  if (parts.healthPercent.trim()) {
    let p = parts.healthPercent.trim()
    if (/^[<>]=?\d+(?:\.\d+)?$/.test(p) || /^\d+(?:\.\d+)?$/.test(p)) {
      p = `${p}%`
    }
    out.push(`?healthpercent{p=${p}}`)
  }
  return out.join(' ')
}
