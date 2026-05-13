import { useState } from 'react'
import { exportDiagram, type ExportFormat, type ExportBackground } from '../utils/exportUtils'
import styles from './ExportDialog.module.css'

interface Props {
  workspaceName: string
  onClose: () => void
}

const FORMATS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: 'png',  label: 'PNG',  desc: 'Lossless, supports transparency' },
  { value: 'jpeg', label: 'JPEG', desc: 'Compressed, white background' },
  { value: 'svg',  label: 'SVG',  desc: 'Vector, scalable' },
  { value: 'gif',  label: 'GIF',  desc: 'Up to 256 colours' },
  { value: 'pdf',  label: 'PDF',  desc: 'Print-ready' },
]

export function ExportDialog({ workspaceName, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [background, setBackground] = useState<ExportBackground>('white')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // JPEG and PDF have no transparency
  const noTransparency = format === 'jpeg' || format === 'pdf'

  async function handleExport() {
    setLoading(true)
    setError(null)
    try {
      await exportDiagram({
        format,
        background: noTransparency ? 'white' : background,
        filename: workspaceName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'diagram',
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
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
