import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { RemoveButton } from './RemoveButton'
import { Switch } from './Switch'

export function useDialogEscape(onClose: () => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

type DialogSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: 'dialog-sm',
  md: 'dialog-md',
  lg: 'dialog-lg',
  xl: 'dialog-xl',
}

interface DialogShellProps {
  size?: DialogSize
  className?: string
  labelledBy?: string
  onClose: () => void
  children: ReactNode
}

export function DialogShell({
  size = 'md',
  className = '',
  labelledBy,
  onClose,
  children,
}: DialogShellProps) {
  useDialogEscape(onClose)
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className={['dialog', SIZE_CLASS[size], className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

interface DialogHeaderProps {
  title: string
  titleId: string
  lead?: string
  onClose?: () => void
  children?: ReactNode
}

export function DialogHeader({ title, titleId, lead, onClose, children }: DialogHeaderProps) {
  return (
    <header className="dialog-header">
      <div className="dialog-header-row">
        <div className="dialog-header-copy">
          <h2 id={titleId}>{title}</h2>
          {lead ? <p className="dialog-lead">{lead}</p> : null}
          {children}
        </div>
        {onClose ? <DialogCloseButton onClick={onClose} /> : null}
      </div>
    </header>
  )
}

export function DialogCloseButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="dialog-close" aria-label="Close" {...props}>
      ×
    </button>
  )
}

export function DialogBody({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={['dialog-body', className].filter(Boolean).join(' ')}>{children}</div>
}

export function DialogPanel({
  title,
  className = '',
  children,
}: {
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={['dialog-panel', className].filter(Boolean).join(' ')}>
      {title ? <h3 className="dialog-section-title">{title}</h3> : null}
      {children}
    </section>
  )
}

export function DialogFooter({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <footer className={['dialog-actions', className].filter(Boolean).join(' ')}>{children}</footer>
  )
}

export function DialogOptionGrid({
  label,
  children,
  className = '',
}: {
  label?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={['dialog-option-grid', className].filter(Boolean).join(' ')}
      role={label ? 'radiogroup' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  )
}

interface DialogOptionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  title: string
  description?: string
}

export function DialogOption({
  selected,
  title,
  description,
  className = '',
  ...props
}: DialogOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={['dialog-option', selected ? 'selected' : '', className].filter(Boolean).join(' ')}
      {...props}
    >
      <span className="dialog-option-title">{title}</span>
      {description ? <span className="dialog-option-desc">{description}</span> : null}
    </button>
  )
}

export function DialogPreviewBlock({
  title = 'Preview',
  path,
  code,
  note,
}: {
  title?: string
  path?: string
  code: string
  note?: string
}) {
  if (!code.trim()) return null
  return (
    <section className="dialog-preview-block">
      <div className="dialog-preview-head">
        <h3 className="dialog-section-title">{title}</h3>
        {path ? <span className="dialog-preview-path">{path}</span> : null}
      </div>
      <pre className="dialog-preview-code">{code}</pre>
      {note ? <p className="dialog-note">{note}</p> : null}
    </section>
  )
}

export function DialogCard({
  title,
  onRemove,
  removeLabel,
  children,
}: {
  title: string
  onRemove: () => void
  removeLabel: string
  children: ReactNode
}) {
  return (
    <article className="dialog-card">
      <div className="dialog-card-head">
        <strong>{title}</strong>
        <RemoveButton aria-label={removeLabel} onClick={onRemove} />
      </div>
      {children}
    </article>
  )
}

export function DialogAddButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="dialog-add-btn" {...props}>
      {children}
    </button>
  )
}

export function DialogSwitchRow({
  title,
  hint,
  checked,
  onChange,
  ariaLabel,
}: {
  title: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
}) {
  return (
    <div className="dialog-switch-row">
      <div className="dialog-switch-copy">
        <span className="dialog-switch-title">{title}</span>
        {hint ? <span className="dialog-switch-hint">{hint}</span> : null}
      </div>
      <Switch checked={checked} onChange={onChange} aria-label={ariaLabel} />
    </div>
  )
}
