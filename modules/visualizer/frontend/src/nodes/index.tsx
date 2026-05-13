import { Handle, Position, NodeResizer } from '@xyflow/react'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import type { ElementModel, ElementStyleConfig, ContentAlign, LabelPlacement } from '../types/aml'
import styles from './nodes.module.css'

interface NodeData {
  element: ElementModel
  style: ElementStyleConfig
  onLabelChange?: (id: string, name: string) => void
  onResizeEnd?: (id: string, width: number, height: number) => void
}

interface NodeProps {
  data: NodeData
  selected?: boolean
}

/** One handle per side. ConnectionMode.Loose in CanvasPane lets any handle act as both source and target. */
function AllHandles() {
  return (
    <>
      <Handle className={styles.handle} type="source" position={Position.Top}    id="top"    />
      <Handle className={styles.handle} type="source" position={Position.Bottom} id="bottom" />
      <Handle className={styles.handle} type="source" position={Position.Left}   id="left"   />
      <Handle className={styles.handle} type="source" position={Position.Right}  id="right"  />
    </>
  )
}

/** Inline-editable label. Double-click to edit, Enter/blur to confirm. */
function EditableLabel({ id, name, onLabelChange, className }: {
  id: string
  name: string
  onLabelChange?: (id: string, name: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  function commit() {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onLabelChange?.(id, trimmed)
    else setValue(name) // revert if empty or unchanged
  }

  if (editing) {
    return (
      <input
        className={styles.labelInput}
        value={value}
        autoFocus
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setValue(name); setEditing(false) }
          e.stopPropagation() // prevent ReactFlow from handling arrow keys
        }}
        onClick={e => e.stopPropagation()}
        style={{ width: Math.max(value.length * 8, 60) }}
      />
    )
  }

  return (
    <div
      className={className ?? styles.label}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      title="Double-click to edit"
    >
      {name}
    </div>
  )
}

/** Maps a ContentAlign value to flex CSS properties for the node container. */
function alignStyle(a: ContentAlign | undefined): React.CSSProperties {
  if (!a) return {}
  const [v, h] = a.split('-') as [string, string | undefined]
  // flex-direction: column → justify-content = vertical (main), align-items = horizontal (cross)
  const justifyContent = v === 'top'  ? 'flex-start' : v === 'bottom' ? 'flex-end' : 'center'
  const alignItems     = h === 'left' ? 'flex-start' : h === 'right'  ? 'flex-end' : 'center'
  return { justifyContent, alignItems }
}

/** Flex style for the icon+label wrapper based on where the label should sit relative to the icon. */
function iconLabelStyle(p: LabelPlacement | undefined): React.CSSProperties {
  const isRow = p === 'left' || p === 'right'
  return {
    display: 'flex',
    flexDirection: p === 'top' ? 'column-reverse' : p === 'left' ? 'row-reverse' : p === 'right' ? 'row' : 'column',
    alignItems: 'center',
    gap: isRow ? 6 : 2,
  }
}

/** Renders either a local SVG (icon starts with '/') or an Iconify icon. */
function NodeIcon({ s, defaultIcon, defaultColor, size = 24 }: {
  s: ElementStyleConfig
  defaultIcon?: string
  defaultColor?: string
  size?: number
}) {
  const iconVal = s.icon ?? defaultIcon
  if (!iconVal) return null
  if (iconVal.startsWith('/')) {
    return <img src={iconVal} width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} alt="" />
  }
  return <Icon icon={iconVal} width={size} color={s.color ?? defaultColor} />
}

// ── Person (SVG silhouette — C4 style) ────────────────────────────────────────

export function PersonNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  const color = s.color ?? '#1565C0'
  return (
    <div className={styles.personNode} style={{ fontSize: s.fontSize }}>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={90} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      {/* SVG fills available flex space so the silhouette scales when node is resized */}
      <svg
        style={{ flex: 1, minHeight: 0, width: '100%' }}
        viewBox="0 0 48 54"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <circle cx="24" cy="13" r="11" fill={color} />
        <path d="M6 54 Q5 36 24 33 Q43 36 42 54 Z" fill={color} />
      </svg>
      <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      {e.description && <div className={styles.description}>{e.description}</div>}
      {e.tech && <div className={styles.tech}>{e.tech}</div>}
    </div>
  )
}

// ── System (rounded rect, C4 style) ──────────────────────────────────────────

export function SystemNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.system} style={{ borderColor: s.color, background: s.background, fontSize: s.fontSize, ...alignStyle(s.contentAlign) }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <div style={iconLabelStyle(s.labelPlacement)}>
        <NodeIcon s={s} size={24} defaultColor="#1565C0" />
        <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      </div>
      {e.tech && <div className={styles.tech}>[{e.tech}]</div>}
      {e.description && <div className={styles.description}>{e.description}</div>}
    </div>
  )
}

// ── Application ───────────────────────────────────────────────────────────────

export function ApplicationNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.application} style={{ borderColor: s.color, background: s.background, fontSize: s.fontSize, ...alignStyle(s.contentAlign) }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <div style={iconLabelStyle(s.labelPlacement)}>
        <NodeIcon s={s} defaultIcon="mdi:application" defaultColor="#1976D2" size={20} />
        <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      </div>
      {e.tech && <div className={styles.tech}>[{e.tech}]</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ComponentNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.component} style={{ borderColor: s.color, background: s.background, fontSize: s.fontSize }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <div className={styles.componentHeader}>
        <Icon icon={s.icon ?? 'mdi:puzzle'} width={16} />
        <span className={styles.componentTag}>«component»</span>
      </div>
      <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
    </div>
  )
}

// ── Database (SVG cylinder) ───────────────────────────────────────────────────

export function DatabaseNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  const color = s.color ?? '#2E7D32'
  const fill = s.background ?? '#E8F5E9'
  return (
    <div className={styles.databaseNode} style={{ fontSize: s.fontSize }}>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={90} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      {/* SVG fills available flex space, scales via viewBox */}
      <svg
        viewBox="0 0 120 76"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', flex: 1, minHeight: 0 }}
      >
        <rect x="1" y="13" width="118" height="50" fill={fill} stroke={color} strokeWidth="2" />
        <ellipse cx="60" cy="63" rx="59" ry="13" fill={fill} stroke={color} strokeWidth="2" />
        <ellipse cx="60" cy="13" rx="59" ry="13" fill={fill} stroke={color} strokeWidth="2" />
      </svg>
      <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      {e.tech && <div className={styles.tech}>[{e.tech}]</div>}
    </div>
  )
}

// ── Process (rounded rect — flowchart step) ───────────────────────────────────

export function ProcessNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.processNode} style={{ borderColor: s.color, background: s.background, fontSize: s.fontSize, ...alignStyle(s.contentAlign) }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={50} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <div style={iconLabelStyle(s.icon ? s.labelPlacement : undefined)}>
        {s.icon && <NodeIcon s={s} size={20} defaultColor="#E65100" />}
        <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      </div>
      {e.description && <div className={styles.description}>{e.description}</div>}
    </div>
  )
}

// ── Decision (SVG diamond) ────────────────────────────────────────────────────

export function DecisionNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  const color = s.color ?? '#6A1B9A'
  const fill = s.background ?? '#F3E5F5'
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontSize: s.fontSize }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      {/* SVG absolutely fills the wrapper and scales via viewBox */}
      <svg width="100%" height="100%" viewBox="0 0 130 78" preserveAspectRatio="none"
           style={{ display: 'block', position: 'absolute', inset: 0 }}>
        <polygon points="65,2 128,39 65,76 2,39" fill={fill} stroke={color} strokeWidth="2" />
      </svg>
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 20px',
          fontWeight: 600, fontSize: 12,
          pointerEvents: 'none',
        }}
      >
        <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      </div>
    </div>
  )
}

// ── Infra (node/device) ───────────────────────────────────────────────────────

export function InfraNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.infra} style={{ borderColor: s.color, background: s.background, fontSize: s.fontSize, ...alignStyle(s.contentAlign) }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <div style={iconLabelStyle(s.labelPlacement)}>
        <NodeIcon s={s} defaultIcon="mdi:server" defaultColor="#4E342E" size={24} />
        <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} />
      </div>
      {e.tech && <div className={styles.tech}>[{e.tech}]</div>}
    </div>
  )
}

// ── Annotation / Sticky-note ──────────────────────────────────────────────────

export function AnnotationNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  const isSticky = e.type === 'sticky-note'
  return (
    <div
      className={isSticky ? styles.stickyNote : styles.annotation}
      style={{
        background: s.color ?? (isSticky ? '#FFFF88' : 'transparent'),
        fontSize: s.fontSize,
      }}
    >
      <NodeResizer isVisible={selected} minWidth={80} minHeight={40} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <EditableLabel id={e.id} name={e.text ?? e.name} onLabelChange={onLabelChange} className={styles.annotationText} />
    </div>
  )
}

// ── Boundary ──────────────────────────────────────────────────────────────────

export function BoundaryNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.boundary} style={{ borderColor: s.color ?? '#999', background: s.background }}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={80} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} className={styles.boundaryLabel} />
    </div>
  )
}

// ── Group (parent containment) ────────────────────────────────────────────────

export function GroupNode({ data, selected }: NodeProps) {
  const { element: e, style: s, onLabelChange, onResizeEnd } = data
  return (
    <div className={styles.group} style={{ borderColor: s.color, background: s.background }}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={80} onResizeEnd={(_, p) => onResizeEnd?.(e.id, p.width, p.height)} />
      <AllHandles />
      <EditableLabel id={e.id} name={e.name} onLabelChange={onLabelChange} className={styles.groupLabel} />
    </div>
  )
}


