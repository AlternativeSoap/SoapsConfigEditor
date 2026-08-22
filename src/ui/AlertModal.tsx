import { useEffect } from 'react'

export interface AlertModalProps {
  title: string
  message: string
  detail?: string
  tone?: 'warning' | 'error' | 'info'
  confirmLabel?: string
  onClose: () => void
}

export function AlertModal({
  title,
  message,
  detail,
  tone = 'warning',
  confirmLabel = 'Close',
  onClose,
}: AlertModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`dialog dialog-sm alert-modal alert-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        aria-describedby="alert-modal-body"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alert-modal-icon" aria-hidden="true">
          {tone === 'error' ? '!' : tone === 'info' ? 'i' : '⚠'}
        </div>
        <h2 id="alert-modal-title">{title}</h2>
        <p id="alert-modal-body">{message}</p>
        {detail ? <p className="alert-modal-detail">{detail}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="primary" onClick={onClose} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
