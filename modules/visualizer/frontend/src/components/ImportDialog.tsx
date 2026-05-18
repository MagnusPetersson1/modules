import { useState } from 'react'
import type { WorkspaceModel } from '../types/aml'
import styles from './ExportDialog.module.css'
import importStyles from './ImportDialog.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

type ImportFormat = 'mermaid' | 'structurizr'

interface Props {
  onImport: (model: WorkspaceModel, dsl: string) => void
  onClose: () => void
}

const FORMATS: { value: ImportFormat; label: string; desc: string; placeholder: string }[] = [
  {
    value: 'mermaid',
    label: 'Mermaid',
    desc: 'C4Context / C4Container / flowchart',
    placeholder: `C4Context
  title "My System"
  Person(user, "User", "An end user")
  System(webapp, "Web App", "The main system")
  Rel(user, webapp, "uses")`,
  },
  {
    value: 'structurizr',
    label: 'Structurizr',
    desc: 'Structurizr DSL workspace',
    placeholder: `workspace "My System" {
  model {
    user = person "User" "An end user"
    webapp = softwareSystem "Web App" "The main system"
    user -> webapp "uses"
  }
  views {
    systemContext webapp "Context" {
      include *
    }
  }
}`,
  },
]

export function ImportDialog({ onImport, onClose }: Props) {
  const [format, setFormat]   = useState<ImportFormat>('mermaid')
  const [dsl, setDsl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const placeholder = FORMATS.find(f => f.value === format)?.placeholder ?? ''

  async function handleImport() {
    if (!dsl.trim()) { setError('Paste some DSL first'); return }
    setLoading(true)
    setError(null)
    setWarnings([])
    try {
      const res = await fetch(`${API_BASE}/api/workspace/import/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dsl }),
      })
      if (!res.ok) throw new Error(`Import failed: ${res.statusText}`)
      const { model, warnings: w } = await res.json()
      if (w?.length) {
        setWarnings(w)
        // Still show warnings but proceed after user sees them
      }
      // Convert model to AML DSL via format endpoint then hand back
      const fmtRes = await fetch(`${API_BASE}/api/workspace/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model),
      })
      if (!fmtRes.ok) throw new Error('Failed to format imported model')
      const { dsl: amlDsl } = await fmtRes.json()
      onImport(model, amlDsl)
      if (!w?.length) onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`${styles.dialog} ${importStyles.dialog}`}>
        <div className={styles.header}>
          <span className={styles.title}>Import Diagram</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.sectionTitle}>Format</div>
          <div className={importStyles.formatRow}>
            {FORMATS.map(f => (
              <button
                key={f.value}
                className={`${styles.formatBtn} ${format === f.value ? styles.formatBtnActive : ''}`}
                onClick={() => setFormat(f.value)}
              >
                <span className={styles.formatLabel}>{f.label}</span>
                <span className={styles.formatDesc}>{f.desc}</span>
              </button>
            ))}
          </div>

          <div className={styles.sectionTitle} style={{ marginTop: 16 }}>Paste DSL</div>
          <textarea
            className={importStyles.textarea}
            value={dsl}
            onChange={e => setDsl(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
          />

          {warnings.length > 0 && (
            <div className={importStyles.warnings}>
              <div className={importStyles.warningsTitle}>⚠ Import warnings (diagram loaded with approximations)</div>
              {warnings.map((w, i) => <div key={i} className={importStyles.warningItem}>{w}</div>)}
              <button className={importStyles.dismissBtn} onClick={onClose}>Close</button>
            </div>
          )}

          {error && <div className={importStyles.error}>{error}</div>}
        </div>

        <div className={importStyles.footer}>
          <button className={importStyles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={importStyles.importBtn} onClick={handleImport} disabled={loading || !dsl.trim()}>
            {loading ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
