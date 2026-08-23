import { useEffect } from 'react'
import { DialogFooter, DialogShell } from './DialogShell'

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
    <DialogShell
      size="sm"
      className={`alert-modal alert-${tone}`}
      labelledBy="alert-modal-title"
      onClose={onClose}
    >
      <div className="alert-modal-icon" aria-hidden="true">
        {tone === 'error' ? '!' : tone === 'info' ? 'i' : '⚠'}
      </div>
      <h2 id="alert-modal-title">{title}</h2>
      <p id="alert-modal-body">{message}</p>
      {detail ? <p className="alert-modal-detail">{detail}</p> : null}
      <DialogFooter>
        <button type="button" className="primary" onClick={onClose} autoFocus>
          {confirmLabel}
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
