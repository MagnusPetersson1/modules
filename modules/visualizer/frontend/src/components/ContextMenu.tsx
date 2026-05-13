import { useEffect, useRef } from 'react'
import type { RelationshipStyleConfig, BendStyle, LineStyle, ArrowType, ElementStyleConfig, ContentAlign, LabelPlacement } from '../types/aml'
import styles from './ContextMenu.module.css'

const PRESET_COLORS = [
  '#1565C0', '#1976D2', '#2E7D32', '#6A1B9A',
  '#E65100', '#C62828', '#4E342E', '#37474F',
  '#78909C', '#000000',
]

export type ContextMenuState = {
  type: 'node'
  id: string
  x: number
  y: number
  color?: string
  background?: string
  zIndex: number
  contentAlign?: ContentAlign
  labelPlacement?: LabelPlacement
} | {
  type: 'edge'
  id: string
  x: number
  y: number
  label?: string
  style: RelationshipStyleConfig
} | null

const ALIGN_OPTIONS: { value: ContentAlign; title: string; symbol: string }[] = [
  { value: 'top-left',      title: 'Top Left',      symbol: '↖' },
  { value: 'top-center',    title: 'Top Center',    symbol: '↑' },
  { value: 'top-right',     title: 'Top Right',     symbol: '↗' },
  { value: 'center-left',   title: 'Middle Left',   symbol: '←' },
  { value: 'center',        title: 'Center',        symbol: '·' },
  { value: 'center-right',  title: 'Middle Right',  symbol: '→' },
  { value: 'bottom-left',   title: 'Bottom Left',   symbol: '↙' },
  { value: 'bottom-center', title: 'Bottom Center', symbol: '↓' },
  { value: 'bottom-right',  title: 'Bottom Right',  symbol: '↘' },
]

const LABEL_PLACEMENT_OPTIONS: { value: LabelPlacement; title: string; symbol: string }[] = [
  { value: 'top',    title: 'Label above icon',     symbol: '⬛↑' },
  { value: 'right',  title: 'Label right of icon',  symbol: '⬛→' },
  { value: 'bottom', title: 'Label below icon',     symbol: '⬛↓' },
  { value: 'left',   title: 'Label left of icon',   symbol: '←⬛' },
]

interface Props {
  state: NonNullable<ContextMenuState>
  onClose: () => void
  onNodeColor: (id: string, color: string) => void
  onNodeBackground: (id: string, background: string) => void
  onNodeZIndex: (id: string, direction: 'front' | 'back') => void
  onNodeContentAlign: (id: string, align: ContentAlign) => void
  onNodeLabelPlacement: (id: string, placement: LabelPlacement) => void
  onEdgeLabelChange: (id: string, label: string) => void
  onEdgePatch: (id: string, patch: Partial<RelationshipStyleConfig>) => void
}

export function ContextMenu({ state, onClose, onNodeColor, onNodeBackground, onNodeZIndex, onNodeContentAlign, onNodeLabelPlacement, onEdgeLabelChange, onEdgePatch }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Element)) {
        onClose()
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const menuStyle: React.CSSProperties = {
    left: Math.min(state.x, window.innerWidth - 260),
    top: Math.min(state.y, window.innerHeight - 400),
  }

  if (state.type === 'node') {
    return (
      <div ref={menuRef} className={styles.menu} style={menuStyle}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Border Color</div>
          <div className={styles.colorRow}>
            {PRESET_COLORS.map(c => (
              <div
                key={c}
                className={styles.swatch}
                style={{ background: c, outline: state.color === c ? `2px solid #333` : undefined }}
                title={c}
                onClick={() => onNodeColor(state.id, c)}
              />
            ))}
            <input
              type="color"
              className={styles.colorInput}
              defaultValue={state.color ?? '#1565C0'}
              title="Custom border color"
              onChange={e => onNodeColor(state.id, e.target.value)}
            />
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Background</div>
          <div className={styles.colorRow}>
            {PRESET_COLORS.map(c => (
              <div
                key={c}
                className={styles.swatch}
                style={{ background: c, outline: state.background === c ? `2px solid #333` : undefined }}
                title={c}
                onClick={() => onNodeBackground(state.id, c)}
              />
            ))}
            <div
              className={styles.swatch}
              style={{ background: 'transparent', border: '2px dashed #aaa', outline: !state.background ? '2px solid #333' : undefined }}
              title="No background"
              onClick={() => onNodeBackground(state.id, '')}
            />
            <input
              type="color"
              className={styles.colorInput}
              defaultValue={state.background ?? '#ffffff'}
              title="Custom background"
              onChange={e => onNodeBackground(state.id, e.target.value)}
            />
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.section}>
          <div className={styles.alignRow}>
            <div>
              <div className={styles.sectionTitle}>Alignment</div>
              <div className={styles.alignGrid}>
                {ALIGN_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.alignBtn} ${(state.contentAlign ?? 'center') === opt.value ? styles.alignBtnActive : ''}`}
                    title={opt.title}
                    onClick={() => onNodeContentAlign(state.id, opt.value)}
                  >
                    {opt.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.sectionTitle}>Label</div>
              <div className={styles.labelPlacementGrid}>
                {LABEL_PLACEMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.alignBtn} ${(state.labelPlacement ?? 'bottom') === opt.value ? styles.alignBtnActive : ''}`}
                    title={opt.title}
                    onClick={() => onNodeLabelPlacement(state.id, opt.value)}
                  >
                    {opt.symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Layer</div>
          <div className={styles.btnGroup}>
            <button className={styles.btn} onClick={() => { onNodeZIndex(state.id, 'front'); onClose() }}>
              ↑ Bring to Front
            </button>
            <button className={styles.btn} onClick={() => { onNodeZIndex(state.id, 'back'); onClose() }}>
              ↓ Send to Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const s = state.style
  return (
    <div ref={menuRef} className={styles.menu} style={menuStyle}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Label</div>
        <input
          className={styles.labelInput}
          type="text"
          placeholder="Add label…"
          defaultValue={state.label ?? ''}
          onBlur={e => onEdgeLabelChange(state.id, e.target.value.trim())}
          onKeyDown={e => {
            if (e.key === 'Enter') { onEdgeLabelChange(state.id, (e.target as HTMLInputElement).value.trim()); onClose() }
            if (e.key === 'Escape') onClose()
            e.stopPropagation()
          }}
        />
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Path</div>
        <div className={styles.btnGroup}>
          {(['curved', 'straight', 'orthogonal'] as BendStyle[]).map(b => (
            <button
              key={b}
              className={`${styles.btn} ${(s.bendStyle ?? 'curved') === b ? styles.btnActive : ''}`}
              onClick={() => onEdgePatch(state.id, { bendStyle: b })}
            >
              {b === 'curved' ? '⌒ Curved' : b === 'straight' ? '— Straight' : '⌐ Orthogonal'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Line</div>
        <div className={styles.btnGroup}>
          {(['solid', 'dashed', 'dotted'] as LineStyle[]).map(l => (
            <button
              key={l}
              className={`${styles.btn} ${(s.lineStyle ?? 'solid') === l ? styles.btnActive : ''}`}
              onClick={() => onEdgePatch(state.id, { lineStyle: l })}
            >
              {l === 'solid' ? '── Solid' : l === 'dashed' ? '- - Dashed' : '··· Dotted'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Arrow End →</div>
        <div className={styles.btnGroup}>
          {(['filled', 'open', 'none'] as ArrowType[]).map(a => (
            <button
              key={a}
              className={`${styles.btn} ${(s.arrowEnd ?? 'filled') === a ? styles.btnActive : ''}`}
              onClick={() => onEdgePatch(state.id, { arrowEnd: a })}
            >
              {a === 'filled' ? '▶ Filled' : a === 'open' ? '→ Open' : '— None'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Arrow Start ←</div>
        <div className={styles.btnGroup}>
          {(['none', 'filled', 'open'] as ArrowType[]).map(a => (
            <button
              key={a}
              className={`${styles.btn} ${(s.arrowStart ?? 'none') === a ? styles.btnActive : ''}`}
              onClick={() => onEdgePatch(state.id, { arrowStart: a })}
            >
              {a === 'filled' ? '◀ Filled' : a === 'open' ? '← Open' : '— None'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Color</div>
        <div className={styles.colorRow}>
          {PRESET_COLORS.map(c => (
            <div
              key={c}
              className={styles.swatch}
              style={{ background: c, outline: s.color === c ? `2px solid #333` : undefined }}
              title={c}
              onClick={() => onEdgePatch(state.id, { color: c })}
            />
          ))}
          <input
            type="color"
            className={styles.colorInput}
            defaultValue={s.color ?? '#888888'}
            title="Custom color"
            onChange={e => onEdgePatch(state.id, { color: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

// re-export so CanvasPane only needs one import
export type { ElementStyleConfig }
