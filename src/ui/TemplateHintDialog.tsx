import { useEffect, useMemo, useState } from 'react'
import type { FileRecord } from '../types'
import type { TemplateHint } from '../core/mythicmobs/templateHints'
import { applyTemplateHint, previewTemplateHint } from '../core/mythicmobs/templateApply'

interface TemplateHintDialogProps {
  hint: TemplateHint
  files: FileRecord[]
  onClose: () => void
  onApply: (patches: Record<string, string>, summary: string) => void
}

export function TemplateHintDialog({ hint, files, onClose, onApply }: TemplateHintDialogProps) {
  const [templateId, setTemplateId] = useState(hint.templateId)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => [...hint.keys])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const createTemplate = hint.createTemplate
  const canApply =
    hint.kind !== 'missing_template' &&
    templateId.trim().length > 0 &&
    (hint.kind === 'use_existing_template' || selectedKeys.length > 0)

  const previews = useMemo(() => {
    if (hint.kind === 'missing_template') return []
    return previewTemplateHint(files, {
      hint,
      selectedKeys:
        hint.kind === 'use_existing_template' && selectedKeys.length === 0 ? hint.keys : selectedKeys,
      templateId: templateId.trim() || hint.templateId,
      createTemplate,
    })
  }, [files, hint, selectedKeys, templateId, createTemplate])

  function toggleKey(key: string) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function confirm() {
    if (!canApply) return
    const keys =
      hint.kind === 'use_existing_template' && selectedKeys.length === 0 ? hint.keys : selectedKeys
    const result = applyTemplateHint(files, {
      hint,
      selectedKeys: keys,
      templateId: templateId.trim(),
      createTemplate,
    })
    if (Object.keys(result.patches).length === 0) {
      onClose()
      return
    }
    onApply(result.patches, result.summary)
  }

  const title =
    hint.kind === 'missing_template'
      ? 'Missing template'
      : hint.kind === 'use_existing_template'
        ? 'Use existing template'
        : 'Extract shared template'

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog template-hint-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-hint-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="template-hint-title">{title}</h2>
        <p>{hint.message}</p>

        {hint.kind === 'missing_template' ? (
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <label className="wide">
              Template id
              <input
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </label>

            {hint.keys.length > 0 && (
              <fieldset className="template-hint-keys">
                <legend>Fields to move into the template</legend>
                {hint.keys.map((key) => (
                  <label key={key} className="template-hint-key">
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(key)}
                      onChange={() => toggleKey(key)}
                    />
                    <span>{key}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="template-hint-previews">
              {previews.map((row) => (
                <div key={row.id} className="template-hint-preview">
                  <div className="template-hint-preview-id">{row.id}</div>
                  <div className="template-hint-preview-cols">
                    <pre className="template-hint-yaml" aria-label={`${row.id} before`}>
                      {row.before}
                    </pre>
                    <pre className="template-hint-yaml" aria-label={`${row.id} after`}>
                      {row.after}
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            <div className="dialog-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="primary" disabled={!canApply} onClick={confirm}>
                Apply changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
