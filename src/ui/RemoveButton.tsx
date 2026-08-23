interface RemoveButtonProps {
  onClick: () => void
  'aria-label': string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm'
}

export function RemoveButton({
  onClick,
  'aria-label': ariaLabel,
  disabled,
  className,
  size = 'default',
}: RemoveButtonProps) {
  return (
    <button
      type="button"
      className={['remove-btn', size === 'sm' ? 'remove-btn--sm' : '', className]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      ×
    </button>
  )
}
