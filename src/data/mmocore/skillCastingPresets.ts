/** Skill-casting mode presets for MMOCore/config.yml (Phoenix templates, trimmed). */

export type SkillCastingMode = 'KEY_COMBOS' | 'SKILL_BAR' | 'SKILL_SCROLLER' | 'NONE'

export const SKILL_CASTING_PRESETS: {
  mode: SkillCastingMode
  label: string
  hint: string
  yaml: string
}[] = [
  {
    mode: 'NONE',
    label: 'None',
    hint: 'Disable skill casting. Use commands only.',
    yaml: `skill-casting:
  mode: NONE
`,
  },
  {
    mode: 'KEY_COMBOS',
    label: 'Key combos',
    hint: 'Cast with click sequences bound to skill slots.',
    yaml: `skill-casting:
  mode: KEY_COMBOS
  stay-in: false
  allowed-keys:
  - LEFT_CLICK
  - RIGHT_CLICK
  - DROP
  - SWAP_HANDS
  - CROUCH
  combos:
    '1':
      - LEFT_CLICK
      - RIGHT_CLICK
    '2':
      - LEFT_CLICK
      - LEFT_CLICK
    '3':
      - RIGHT_CLICK
      - LEFT_CLICK
    '4':
      - RIGHT_CLICK
      - RIGHT_CLICK
    '5':
      - LEFT_CLICK
      - DROP
    '6':
      - RIGHT_CLICK
      - DROP
`,
  },
  {
    mode: 'SKILL_BAR',
    label: 'Skill bar',
    hint: 'Enter casting mode, then press 1–6 to cast.',
    yaml: `skill-casting:
  mode: SKILL_BAR
  open: SWAP_HANDS
  ignore-sneak: false
  use-lowest-keybinds: true
`,
  },
  {
    mode: 'SKILL_SCROLLER',
    label: 'Skill scroller',
    hint: 'Enter casting mode, scroll to select, then cast.',
    yaml: `skill-casting:
  mode: SKILL_SCROLLER
  quit-on-cast: false
  enter-key: SWAP_HANDS
  cast-key: LEFT_CLICK
`,
  },
]
