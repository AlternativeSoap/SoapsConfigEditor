interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Accessible name when there is no visible label tied to this control */
  'aria-label'?: string
  /** Optional size for dense rows */
  size?: 'md' | 'sm'
  disabled?: boolean
  className?: string
}

/** On/off switch used instead of checkboxes for boolean settings. */
export function Switch({
  checked,
  onChange,
  'aria-label': ariaLabel,
  size = 'md',
  disabled,
  className,
}: SwitchProps) {
  const classes = [
    'switch',
    checked ? 'on' : '',
    size === 'sm' ? 'switch-sm' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}
