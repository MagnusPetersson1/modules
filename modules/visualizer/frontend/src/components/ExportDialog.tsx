import { useState } from 'react'
import { exportDiagram, type ExportFormat, type ExportBackground } from '../utils/exportUtils'
import type { WorkspaceModel } from '../types/aml'
import styles from './ExportDialog.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

interface Props {
  workspaceName: string
  model: WorkspaceModel | null
  onClose: () => void
}

type AllFormats = ExportFormat | 'drawio'

const FORMATS: { value: AllFormats; label: string; desc: string }[] = [
  { value: 'png',    label: 'PNG',     desc: 'Lossless, supports transparency' },
  { value: 'jpeg',   label: 'JPEG',    desc: 'Compressed, white background' },
  { value: 'svg',    label: 'SVG',     desc: 'Vector, scalable' },
  { value: 'gif',    label: 'GIF',     desc: 'Up to 256 colours' },
  { value: 'pdf',    label: 'PDF',     desc: 'Print-ready' },
  { value: 'drawio', label: 'DrawIO',  desc: 'Editable in draw.io / diagrams.net' },
]

export function ExportDialog({ workspaceName, model, onClose }: Props) {
  const [format, setFormat] = useState<AllFormats>('png')
  const [background, setBackground] = useState<ExportBackground>('white')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDrawIo = format === 'drawio'
  // JPEG and PDF have no transparency
  const noTransparency = format === 'jpeg' || format === 'pdf' || isDrawIo

  async function handleExport() {
    setLoading(true)
    setError(null)
    try {
      if (isDrawIo) {
        await exportDrawIo()
      } else {
        await exportDiagram({
          format: format as ExportFormat,
          background: noTransparency ? 'white' : background,
          filename: workspaceName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'diagram',
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  async function exportDrawIo() {
    if (!model) throw new Error('No diagram loaded')
    const res = await fetch(`${API_BASE}/api/workspace/export/drawio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    })
    if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workspaceName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'diagram'}.drawio`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.title}>Export Diagram</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.sectionTitle}>Format</div>
          <div className={styles.formatGrid}>
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

          {!isDrawIo && (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: 18 }}>Background</div>
              <div className={styles.bgRow}>
                <button
                  className={`${styles.bgBtn} ${background === 'white' ? styles.bgBtnActive : ''}`}
                  onClick={() => setBackground('white')}
                >
                  <span className={styles.bgSwatch} style={{ background: '#ffffff', border: '1px solid #ddd' }} />
                  White
                </button>
                <button
                  className={`${styles.bgBtn} ${background === 'transparent' ? styles.bgBtnActive : ''} ${noTransparency ? styles.bgBtnDisabled : ''}`}
                  onClick={() => { if (!noTransparency) setBackground('transparent') }}
                  title={noTransparency ? `${format.toUpperCase()} does not support transparency` : undefined}
                >
                  <span className={styles.bgSwatch} style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px' }} />
                  Transparent
                </button>
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.exportBtn} onClick={handleExport} disabled={loading}>
            {loading ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}
