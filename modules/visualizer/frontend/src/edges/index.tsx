import { useState } from 'react'
import {
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from '@xyflow/react'
import type { RelationshipStyleConfig } from '../types/aml'

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
}: EdgeProps) {
  const relStyle = (data?.style ?? {}) as RelationshipStyleConfig
  const bendStyle = relStyle.bendStyle
  const onLabelChange = data?.onLabelChange as ((id: string, label: string) => void) | undefined

  let path = '', labelX = 0, labelY = 0

  if (bendStyle === 'straight') {
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

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
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
    </>
  )
}
