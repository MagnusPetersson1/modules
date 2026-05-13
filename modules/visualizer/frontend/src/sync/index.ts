import { type Node, type Edge, MarkerType } from '@xyflow/react'
import type { WorkspaceModel, ViewModel, ElementModel, RelationshipModel, ParseError, ParseResponse, FormatResponse, PositionModel, RelationshipStyleConfig } from '../types/aml'

const API_BASE = (import.meta as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? 'http://localhost:5000'

// ── API calls ─────────────────────────────────────────────────────────────────

export interface SuggestResponse {
  layout: { algorithm: string; direction: string }
  suggestions: string[]
}

export async function suggestForWorkspace(model: WorkspaceModel): Promise<SuggestResponse> {
  const res = await fetch(`${API_BASE}/api/workspace/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model),
  })
  if (!res.ok) throw new Error(`Suggest failed: ${res.status}`)
  return res.json()
}

export async function dslToAst(dsl: string): Promise<{ model: WorkspaceModel | null; errors: ParseError[] }> {
  const res = await fetch(`${API_BASE}/api/workspace/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dsl }),
  })
  if (!res.ok) throw new Error(`Parse failed: ${res.status}`)
  const data: ParseResponse = await res.json()
  return { model: data.model, errors: data.errors }
}

export async function astToDsl(model: WorkspaceModel): Promise<string> {
  const res = await fetch(`${API_BASE}/api/workspace/format`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model),
  })
  if (!res.ok) throw new Error(`Format failed: ${res.status}`)
  const data: FormatResponse = await res.json()
  return data.dsl
}

// ── AST → ReactFlow ───────────────────────────────────────────────────────────
// Pure mapping — no API call needed.

export function astToFlow(
  model: WorkspaceModel,
  viewId: string
): { nodes: Node[]; edges: Edge[] } {
  const view = model.views.find(v => v.id === viewId)
  if (!view) return { nodes: [], edges: [] }

  const includedIds = resolveIncluded(view, model)
  const elementMap = new Map(model.model.elements.map(e => [e.id, e]))

  const nodes: Node[] = includedIds
    .map(id => elementMap.get(id))
    .filter((e): e is ElementModel => e !== null && e !== undefined)
    .map((e, idx) => elementToNode(e, view, idx))

  const edges: Edge[] = model.model.relationships
    .filter(r => includedIds.includes(r.from) && includedIds.includes(r.to))
    .map(r => relationshipToEdge(r, view))

  return { nodes, edges }
}

function resolveIncluded(view: ViewModel, model: WorkspaceModel): string[] {
  if (view.include && view.include.length > 0) return view.include
  return model.model.elements.map(e => e.id)
}

// Default wrapper dimensions ensure every node always has an explicit size
// so inner `width/height: 100%` resolves correctly even before first resize.
const DEFAULT_WRAPPER_SIZES: Record<string, { width: number; height: number }> = {
  person:      { width: 110, height: 140 },
  system:      { width: 160, height: 80  },
  application: { width: 150, height: 75  },
  component:   { width: 150, height: 75  },
  database:    { width: 140, height: 100 },
  process:     { width: 150, height: 65  },
  decision:    { width: 130, height: 78  },
  infra:       { width: 140, height: 75  },
  annotation:  { width: 180, height: 60  },
  boundary:    { width: 300, height: 200 },
  group:       { width: 300, height: 200 },
}

function gridFallbackPosition(idx: number): { x: number; y: number } {
  const cols = 4
  const colW = 230
  const rowH = 190
  const marginX = 60
  const marginY = 60
  return {
    x: marginX + (idx % cols) * colW,
    y: marginY + Math.floor(idx / cols) * rowH,
  }
}

function elementToNode(e: ElementModel, view: ViewModel, fallbackIndex = 0): Node {
  const style = view.styles?.elements?.[e.id]
  const position = view.positions?.[e.id] ?? gridFallbackPosition(fallbackIndex)
  const typeName = nodeTypeFor(e.type)
  const defaults = DEFAULT_WRAPPER_SIZES[typeName] ?? { width: 160, height: 80 }

  const w = style?.width  ?? defaults.width
  const h = style?.height ?? defaults.height

  // Boundary/group nodes sit behind all other nodes unless explicitly in a display layer
  const isContainer = typeName === 'boundary' || typeName === 'group'
  const layerZ = zIndexFor(e.id, view)
  const zIndex = isContainer && layerZ === 1 ? 0 : layerZ

  return {
    id: e.id,
    type: typeName,
    position,
    parentId: e.parent,
    extent: e.parent ? 'parent' : undefined,
    zIndex,
    data: { element: e, style: style ?? {} },
    style: { width: w, height: h },
  }
}

function nodeTypeFor(type: string): string {
  const map: Record<string, string> = {
    person: 'person',
    system: 'system',
    application: 'application',
    component: 'component',
    database: 'database',
    service: 'process',
    process: 'process',
    capability: 'process',
    decision: 'decision',
    node: 'infra',
    device: 'infra',
    annotation: 'annotation',
    'sticky-note': 'annotation',
    callout: 'annotation',
    boundary: 'boundary',
    divider: 'annotation',
  }
  return map[type] ?? 'system'
}

function zIndexFor(id: string, view: ViewModel): number {
  const layer = view.displayLayers?.find(dl => dl.elements?.includes(id))
  return layer?.zIndex ?? 1
}

function relationshipToEdge(r: RelationshipModel, view: ViewModel): Edge {
  const relStyle = view.styles?.relationships?.[r.id] ?? {}
  const { style, markerEnd, markerStart } = relStyleToEdgeVisuals(relStyle)
  return {
    id: r.id,
    source: r.from,
    target: r.to,
    sourceHandle: relStyle.sourceHandle,
    targetHandle: relStyle.targetHandle,
    label: r.label,
    type: 'custom',
    style,
    markerEnd,
    markerStart,
    data: { relationship: r, style: relStyle },
  }
}

/** Compute ReactFlow edge visual props from a RelationshipStyleConfig.
 *  Exported so CanvasPane can update edge visuals immediately after a style patch. */
export function relStyleToEdgeVisuals(relStyle: RelationshipStyleConfig): {
  style: { stroke: string; strokeWidth: number; strokeDasharray?: string }
  markerEnd: Edge['markerEnd']
  markerStart: Edge['markerStart']
} {
  const stroke = relStyle.color ?? '#888'
  const strokeWidth = relStyle.thickness ?? 1.5
  const strokeDasharray =
    relStyle.lineStyle === 'dashed' ? '6 3' :
    relStyle.lineStyle === 'dotted' ? '2 3' :
    undefined

  const arrowEnd = relStyle.arrowEnd ?? 'filled'
  const markerEnd = arrowEnd === 'none'
    ? undefined
    : { type: arrowEnd === 'open' ? MarkerType.Arrow : MarkerType.ArrowClosed, color: stroke, width: 18, height: 18 }

  const arrowStart = relStyle.arrowStart
  const markerStart = !arrowStart || arrowStart === 'none'
    ? undefined
    : { type: arrowStart === 'open' ? MarkerType.Arrow : MarkerType.ArrowClosed, color: stroke, width: 18, height: 18 }

  return {
    style: { stroke, strokeWidth, strokeDasharray },
    markerEnd: markerEnd as Edge['markerEnd'],
    markerStart: markerStart as Edge['markerStart'],
  }
}

// ── ReactFlow → AST (positions only) ─────────────────────────────────────────
// Called when user drags nodes. Only updates positions — does not touch semantics.

export function flowToAst(
  model: WorkspaceModel,
  viewId: string,
  nodes: Node[]
): WorkspaceModel {
  const views = model.views.map(v => {
    if (v.id !== viewId) return v
    const positions: Record<string, PositionModel> = {}
    for (const node of nodes) {
      positions[node.id] = { x: node.position.x, y: node.position.y }
    }
    return { ...v, positions }
  })
  return { ...model, views }
}
