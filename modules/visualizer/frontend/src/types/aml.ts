// TypeScript mirror of the AML WorkspaceModel (backend/Models/WorkspaceModel.cs)
// All values use camelCase to match JSON serialization from .NET.

export interface WorkspaceModel {
  workspace: WorkspaceMeta
  model: ModelSection
  views: ViewModel[]
}

export interface WorkspaceMeta {
  name: string
  version?: string
  context?: WorkspaceContext
}

export interface WorkspaceContext {
  domain?: string       // e.g. "E-Commerce", "Banking"
  perspective?: string  // e.g. "System Context", "Container"
  scope?: string        // what is included / excluded
  audience?: string     // e.g. "Engineering leads"
  notes?: string        // free-form, read by AI
}

export interface ModelSection {
  elements: ElementModel[]
  relationships: RelationshipModel[]
}

export type ElementType =
  | 'person' | 'system' | 'application' | 'component' | 'database'
  | 'service' | 'process' | 'capability' | 'decision' | 'node' | 'device'
  | 'annotation' | 'sticky-note' | 'callout' | 'boundary' | 'divider'

export type LayerType = 'business' | 'application' | 'technology' | 'infrastructure' | 'motivation' | 'strategy'

export type RelationshipType =
  | 'uses' | 'realizes' | 'triggers' | 'flows-to' | 'assigned-to'
  | 'composed-of' | 'serves' | 'accesses' | 'association'

export interface ElementModel {
  id: string
  name: string
  type: ElementType
  description?: string
  tags?: string[]
  layer?: LayerType
  tech?: string
  parent?: string
  text?: string
}

export interface RelationshipModel {
  id: string
  from: string
  to: string
  label?: string
  type?: RelationshipType
}

export type ViewType =
  | 'c4-context' | 'c4-container' | 'c4-component'
  | 'archimate-layered' | 'sequence' | 'process' | 'infrastructure'

export type LayoutAlgorithm = 'layered' | 'force' | 'grid' | 'manual'
export type LayoutDirection = 'top-down' | 'left-right'

export interface LayoutConfig {
  algorithm: LayoutAlgorithm
  direction: LayoutDirection
}

export interface PositionModel {
  x: number
  y: number
}

export type ShapeType =
  | 'default' | 'person' | 'cylinder' | 'cloud' | 'hexagon' | 'diamond'
  | 'sticky-note' | 'callout' | 'boundary'

export type ContentAlign =
  | 'top-left'    | 'top-center'    | 'top-right'
  | 'center-left' | 'center'        | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export type LabelPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface ElementStyleConfig {
  color?: string
  background?: string
  icon?: string
  shape?: ShapeType
  fontSize?: number
  width?: number
  height?: number
  contentAlign?: ContentAlign
  labelPlacement?: LabelPlacement
}

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'double'
export type ArrowType = 'open' | 'filled' | 'none' | 'diamond' | 'odiamond'
export type BendStyle = 'straight' | 'curved' | 'orthogonal' | 'elbow'
export type LabelPosition = 'center' | 'source' | 'target'

export interface RelationshipStyleConfig {
  lineStyle?: LineStyle
  arrowEnd?: ArrowType
  arrowStart?: ArrowType
  color?: string
  thickness?: number
  bendStyle?: BendStyle
  labelPosition?: LabelPosition
  sourceHandle?: string
  targetHandle?: string
  waypoints?: { x: number; y: number }[]
}

export interface ViewStyles {
  elements?: Record<string, ElementStyleConfig>
  relationships?: Record<string, RelationshipStyleConfig>
}

export interface LayerBand {
  id: string
  name?: string
  color?: string
  include?: string[]
}

export interface DisplayLayer {
  id: string
  zIndex: number
  visible: boolean
  elements?: string[]
}

export type SequenceStepType = 'sync' | 'async' | 'return' | 'create' | 'destroy'
export type FragmentType = 'alt' | 'loop' | 'par' | 'opt' | 'critical' | 'break'

export interface SequenceStep {
  from?: string
  to?: string
  label?: string
  type?: SequenceStepType
  fragment?: FragmentType
  condition?: string
  steps?: SequenceStep[]
}

export interface ViewModel {
  id: string
  name?: string
  type: ViewType
  include?: string[]
  layers?: LayerBand[]
  displayLayers?: DisplayLayer[]
  layout?: LayoutConfig
  positions?: Record<string, PositionModel>
  styles?: ViewStyles
  theme?: string
  // sequence-specific
  participants?: string[]
  steps?: SequenceStep[]
}

// ── Parse API types ───────────────────────────────────────────────────────────

export interface ParseError {
  message: string
  severity: 'error' | 'warning' | 'info'
  line?: number
  column?: number
}

export interface ParseResponse {
  model: WorkspaceModel | null
  errors: ParseError[]
}

export interface FormatResponse {
  dsl: string
}
