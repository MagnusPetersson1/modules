import { useState, useRef } from 'react'
import {
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import type { RelationshipStyleConfig } from '../types/aml'

type Waypoint = { x: number; y: number }

/** Draggable handle rendered at each existing waypoint. Double-click removes it. */
function WaypointHandle({
  x, y, index,
  onMove, onCommit, onRemove,
}: {
  x: number; y: number; index: number
  onMove: (i: number, x: number, y: number) => void
  onCommit: (i: number, x: number, y: number) => void
  onRemove: (i: number) => void
}) {
  const { screenToFlowPosition } = useReactFlow()
  const active = useRef(false)
  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
        width: 12, height: 12,
        borderRadius: '50%',
        background: '#1565C0',
        border: '2px solid white',
        cursor: 'grab',
        pointerEvents: 'all',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        zIndex: 10,
      }}
      title="Drag to move · Double-click to remove"
      onPointerDown={e => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        active.current = true
      }}
      onPointerMove={e => {
        if (!active.current) return
        e.stopPropagation()
        const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        onMove(index, p.x, p.y)
      }}
      onPointerUp={e => {
        e.stopPropagation()
        active.current = false
        const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        onCommit(index, p.x, p.y)
      }}
      onDoubleClick={e => { e.stopPropagation(); onRemove(index) }}
    />
  )
}

/** Ghost handle rendered at segment midpoints when edge is selected — click/drag to add a waypoint. */
function AddWaypointHandle({
  x, y, insertIndex,
  onAdd,
}: {
  x: number; y: number; insertIndex: number
  onAdd: (i: number, x: number, y: number) => void
}) {
  const { screenToFlowPosition } = useReactFlow()
  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
        width: 10, height: 10,
        borderRadius: '50%',
        background: 'white',
        border: '2px solid #1565C0',
        cursor: 'crosshair',
        pointerEvents: 'all',
        opacity: 0.65,
        zIndex: 9,
      }}
      title="Click to add waypoint"
      onPointerDown={e => {
        e.stopPropagation()
        const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        onAdd(insertIndex, p.x, p.y)
      }}
    />
  )
}

/** Build an SVG path string through source → waypoints → target as straight segments. */
function waypointPath(sx: number, sy: number, tx: number, ty: number, wps: Waypoint[]): string {
  const pts = [{ x: sx, y: sy }, ...wps, { x: tx, y: ty }]
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function EditableEdgeLabel({
  edgeId,
  label,
  labelX,
  labelY,
  onLabelChange,
}: {
  edgeId: string
  label: string
  labelX: number
  labelY: number
  onLabelChange: (id: string, label: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)

  function commit() {
    setEditing(false)
    const trimmed = value.trim()
    onLabelChange(edgeId, trimmed)
    if (!trimmed) setValue('')
  }

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
    fontSize: 11,
    pointerEvents: 'all',
  }

  if (editing) {
    return (
      <EdgeLabelRenderer>
        <input
          autoFocus
          style={{
            ...baseStyle,
            padding: '1px 5px',
            border: '1px solid #90caf9',
            borderRadius: 3,
            background: 'white',
            color: '#333',
            outline: 'none',
            width: Math.max((value.length + 2) * 8, 80),
          }}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setValue(label); setEditing(false) }
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
        />
      </EdgeLabelRenderer>
    )
  }

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          ...baseStyle,
          padding: '1px 5px',
          background: 'white',
          border: value ? '1px solid #e0e0e0' : '1px dashed #ccc',
          borderRadius: 3,
          color: value ? '#555' : '#bbb',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          cursor: 'text',
          minWidth: 20,
          textAlign: 'center',
        }}
        onDoubleClick={e => { e.stopPropagation(); setValue(label); setEditing(true) }}
        title="Double-click to edit label"
      >
        {value || '+'}
      </div>
    </EdgeLabelRenderer>
  )
}

export function CustomEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  style, markerEnd, markerStart, label,
  selected,
}: EdgeProps) {
  const relStyle = (data?.style ?? {}) as RelationshipStyleConfig
  const bendStyle = relStyle.bendStyle
  const onLabelChange = data?.onLabelChange as ((id: string, label: string) => void) | undefined
  const onWaypointsChange = data?.onWaypointsChange as ((id: string, wps: Waypoint[]) => void) | undefined

  // Local waypoints state for smooth dragging (committed to model on pointer up)
  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>(() => relStyle.waypoints ?? [])

  // Keep local state in sync when model changes (e.g. DSL edit)
  const prevStyleWaypoints = useRef<Waypoint[] | undefined>(undefined)
  if (relStyle.waypoints !== prevStyleWaypoints.current) {
    prevStyleWaypoints.current = relStyle.waypoints
    setLocalWaypoints(relStyle.waypoints ?? [])
  }

  // Build SVG path
  let path = '', labelX = 0, labelY = 0

  if (localWaypoints.length > 0) {
    path = waypointPath(sourceX, sourceY, targetX, targetY, localWaypoints)
    // label at midpoint of full path: midpoint between first and last waypoint
    const all = [{ x: sourceX, y: sourceY }, ...localWaypoints, { x: targetX, y: targetY }]
    const mid = Math.floor(all.length / 2)
    labelX = (all[mid - 1].x + all[mid].x) / 2
    labelY = (all[mid - 1].y + all[mid].y) / 2
  } else if (bendStyle === 'straight') {
    ;[path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  } else if (bendStyle === 'orthogonal' || bendStyle === 'elbow') {
    ;[path, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: bendStyle === 'orthogonal' ? 8 : 0,
    })
  } else {
    ;[path, labelX, labelY] = getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
    })
  }

  const baseStyle = style as React.CSSProperties
  const baseStrokeWidth = (baseStyle?.strokeWidth as number) ?? 1.5
  const activeStyle: React.CSSProperties = selected
    ? {
        ...baseStyle,
        stroke: '#1565C0',
        strokeWidth: Math.max(baseStrokeWidth + 1.5, 3),
        filter: 'drop-shadow(0 0 4px rgba(21, 101, 192, 0.5))',
      }
    : baseStyle

  // Segment midpoints for "add waypoint" handles (shown only when selected)
  const segmentMidpoints = selected
    ? (() => {
        const pts = [{ x: sourceX, y: sourceY }, ...localWaypoints, { x: targetX, y: targetY }]
        return pts.slice(0, -1).map((p, i) => ({
          x: (p.x + pts[i + 1].x) / 2,
          y: (p.y + pts[i + 1].y) / 2,
          insertIndex: i + 1,
        }))
      })()
    : []

  function handleMove(i: number, x: number, y: number) {
    setLocalWaypoints(wps => wps.map((w, idx) => idx === i ? { x, y } : w))
  }

  function handleCommit(i: number, x: number, y: number) {
    const updated = localWaypoints.map((w, idx) => idx === i ? { x, y } : w)
    setLocalWaypoints(updated)
    onWaypointsChange?.(id, updated)
  }

  function handleRemove(i: number) {
    const updated = localWaypoints.filter((_, idx) => idx !== i)
    setLocalWaypoints(updated)
    onWaypointsChange?.(id, updated)
  }

  function handleAdd(insertIndex: number, x: number, y: number) {
    const updated = [
      ...localWaypoints.slice(0, insertIndex),
      { x, y },
      ...localWaypoints.slice(insertIndex),
    ]
    setLocalWaypoints(updated)
    onWaypointsChange?.(id, updated)
  }

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={activeStyle}
      />
      {onLabelChange && (
        <EditableEdgeLabel
          edgeId={id}
          label={(label as string) ?? ''}
          labelX={labelX}
          labelY={labelY}
          onLabelChange={onLabelChange}
        />
      )}
      <EdgeLabelRenderer>
        {/* Existing waypoint handles */}
        {localWaypoints.map((wp, i) => (
          <WaypointHandle
            key={i}
            x={wp.x} y={wp.y} index={i}
            onMove={handleMove}
            onCommit={handleCommit}
            onRemove={handleRemove}
          />
        ))}
        {/* Add-waypoint handles at segment midpoints — only when selected */}
        {segmentMidpoints.map((mp, i) => (
          <AddWaypointHandle
            key={`add-${i}`}
            x={mp.x} y={mp.y}
            insertIndex={mp.insertIndex}
            onAdd={handleAdd}
          />
        ))}
      </EdgeLabelRenderer>
    </>
  )
}
