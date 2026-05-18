import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, reconnectEdge, ConnectionMode, ReactFlowProvider, useReactFlow, Panel, type Connection, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useCallback, useRef, useState } from 'react'
import type { WorkspaceModel, ElementModel, ElementType, RelationshipStyleConfig, ElementStyleConfig } from '../types/aml'
import { astToFlow, flowToAst, relStyleToEdgeVisuals } from '../sync'
import { computeLayout } from '../layout'
import { PersonNode, SystemNode, ApplicationNode, ComponentNode, DatabaseNode, ProcessNode, DecisionNode, InfraNode, AnnotationNode, BoundaryNode, GroupNode } from '../nodes'
import { CustomEdge } from '../edges'
import { ShapePalette } from './ShapePalette'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import styles from './CanvasPane.module.css'

const nodeTypes = {
  person: PersonNode,
  system: SystemNode,
  application: ApplicationNode,
  component: ComponentNode,
  database: DatabaseNode,
  process: ProcessNode,
  decision: DecisionNode,
  infra: InfraNode,
  annotation: AnnotationNode,
  boundary: BoundaryNode,
  group: GroupNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

interface Props {
  model: WorkspaceModel | null
  viewId: string
  onModelChange: (model: WorkspaceModel) => void
  triggerLayout: number
  onSelectionChange?: (elementId: string | null) => void
}

function nodeTypeForElementType(type: string): string {
  const map: Record<string, string> = {
    person: 'person', system: 'system', application: 'application',
    component: 'component', database: 'database',
    process: 'process', service: 'process', capability: 'process',
    decision: 'decision', node: 'infra', device: 'infra',
    annotation: 'annotation', 'sticky-note': 'annotation', callout: 'annotation',
    boundary: 'boundary', divider: 'annotation',
  }
  return map[type] ?? 'system'
}

function CanvasPaneInner({ model, viewId, onModelChange, triggerLayout, onSelectionChange }: Props) {
  const rfInstance = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const reconnectSucceeded = useRef(false)
  const skipNextModelSync = useRef(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)

  // Sync model → canvas when model or active view changes.
  // Skip when the change was triggered by a canvas action (reconnect/connect)
  // to avoid overwriting edge state that the canvas already applied correctly.
  useEffect(() => {
    if (!model) return
    if (skipNextModelSync.current) {
      skipNextModelSync.current = false
      return
    }
    const { nodes: n, edges: e } = astToFlow(model, viewId)
    setNodes(n)
    setEdges(e)
  }, [model, viewId, setNodes, setEdges])

  // Auto-layout when triggerLayout increments
  useEffect(() => {
    if (!model || triggerLayout === 0) return
    const view = model.views.find(v => v.id === viewId)
    const direction = view?.layout?.direction ?? 'top-down'
    computeLayout(nodes, edges, direction).then(positions => {
      const updated = nodes.map(n => {
        const pos = positions.get(n.id)
        return pos ? { ...n, position: pos } : n
      })
      setNodes(updated)
      if (model) {
        const newModel = flowToAst(model, viewId, updated)
        onModelChange(newModel)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerLayout])

  // Node drag end → write positions back to model
  const onNodeDragStop = useCallback(() => {
    if (!model) return
    const newModel = flowToAst(model, viewId, nodes)
    onModelChange(newModel)
  }, [model, viewId, nodes, onModelChange])

  // Node deletion → remove elements from model + all view includes/positions/styles
  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    if (!model) return
    const deletedIds = new Set(deletedNodes.map(n => n.id))
    const newModel: WorkspaceModel = {
      ...model,
      model: {
        ...model.model,
        elements: model.model.elements.filter(e => !deletedIds.has(e.id)),
      },
      views: model.views.map(v => {
        const positions = { ...(v.positions ?? {}) }
        const elementStyles = { ...(v.styles?.elements ?? {}) }
        deletedIds.forEach(id => { delete positions[id]; delete elementStyles[id] })
        return {
          ...v,
          include: v.include?.filter(id => !deletedIds.has(id)),
          positions,
          styles: v.styles ? { ...v.styles, elements: elementStyles } : v.styles,
        }
      }),
    }
    onModelChange(newModel)
  }, [model, onModelChange])

  // Edge deletion → remove relationships from model + view styles
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (!model) return
    const deletedIds = new Set(deletedEdges.map(e => e.id))
    const newModel: WorkspaceModel = {
      ...model,
      model: {
        ...model.model,
        relationships: model.model.relationships.filter(r => !deletedIds.has(r.id)),
      },
      views: model.views.map(v => {
        const relStyles = { ...(v.styles?.relationships ?? {}) }
        deletedIds.forEach(id => delete relStyles[id])
        return {
          ...v,
          styles: v.styles ? { ...v.styles, relationships: relStyles } : v.styles,
        }
      }),
    }
    onModelChange(newModel)
  }, [model, onModelChange])

  // Edge style patch — handles all RelationshipStyleConfig fields (bend, line, arrows, color)
  const handleEdgePatch = useCallback((edgeId: string, patch: Partial<RelationshipStyleConfig>) => {
    if (!model) return
    skipNextModelSync.current = true
    setEdges(eds => eds.map(e => {
      if (e.id !== edgeId) return e
      const current = (e.data?.style ?? {}) as RelationshipStyleConfig
      const newStyle = { ...current, ...patch }
      const { style, markerEnd, markerStart } = relStyleToEdgeVisuals(newStyle)
      return { ...e, style, markerEnd, markerStart, data: { ...e.data, style: newStyle } }
    }))
    const newModel: WorkspaceModel = {
      ...model,
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        return {
          ...v,
          styles: {
            ...v.styles,
            relationships: {
              ...v.styles?.relationships,
              [edgeId]: { ...(v.styles?.relationships?.[edgeId] ?? {}), ...patch },
            },
          },
        }
      }),
    }
    onModelChange(newModel)
    // Keep context menu in sync so active state buttons stay correct
    setContextMenu(prev =>
      prev?.type === 'edge' && prev.id === edgeId
        ? { ...prev, style: { ...prev.style, ...patch } }
        : prev
    )
  }, [model, viewId, onModelChange, setEdges])

  // Node label edited inline → update element name in model
  const handleLabelChange = useCallback((elementId: string, newName: string) => {
    if (!model) return
    skipNextModelSync.current = true
    const newModel: WorkspaceModel = {
      ...model,
      model: {
        ...model.model,
        elements: model.model.elements.map(el =>
          el.id === elementId ? { ...el, name: newName } : el
        ),
      },
    }
    setNodes(nds => nds.map(n =>
      n.id === elementId ? { ...n, data: { ...n.data, element: { ...(n.data.element as object), name: newName } } } : n
    ))
    onModelChange(newModel)
  }, [model, onModelChange, setNodes])

  // Waypoints changed by dragging a handle → persist to model
  const handleWaypointsChange = useCallback((edgeId: string, waypoints: { x: number; y: number }[]) => {
    if (!model) return
    skipNextModelSync.current = true
    setEdges(eds => eds.map(e => {
      if (e.id !== edgeId) return e
      const current = (e.data?.style ?? {}) as RelationshipStyleConfig
      const newStyle = { ...current, waypoints: waypoints.length > 0 ? waypoints : undefined }
      return { ...e, data: { ...e.data, style: newStyle } }
    }))
    const newModel: WorkspaceModel = {
      ...model,
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        return {
          ...v,
          styles: {
            ...v.styles,
            relationships: {
              ...v.styles?.relationships,
              [edgeId]: {
                ...(v.styles?.relationships?.[edgeId] ?? {}),
                waypoints: waypoints.length > 0 ? waypoints : undefined,
              },
            },
          },
        }
      }),
    }
    onModelChange(newModel)
  }, [model, viewId, onModelChange, setEdges])

  // Edge label edited inline → update relationship label in model
  const handleEdgeLabelChange = useCallback((edgeId: string, newLabel: string) => {
    if (!model) return
    skipNextModelSync.current = true
    const newModel: WorkspaceModel = {
      ...model,
      model: {
        ...model.model,
        relationships: model.model.relationships.map(r =>
          r.id === edgeId ? { ...r, label: newLabel || undefined } : r
        ),
      },
    }
    setEdges(eds => eds.map(e =>
      e.id === edgeId ? { ...e, label: newLabel || undefined } : e
    ))
    onModelChange(newModel)
  }, [model, onModelChange, setEdges])

  // New edge drawn → add to model
  const onConnect = useCallback((connection: Connection) => {
    if (!model) return
    skipNextModelSync.current = true
    const newRelId = `${connection.source}-${connection.target}`
    const newRel: import('../types/aml').RelationshipModel = {
      id: newRelId,
      from: connection.source ?? '',
      to: connection.target ?? '',
      type: 'association',
    }
    const newModel: WorkspaceModel = {
      ...model,
      model: {
        ...model.model,
        relationships: [...model.model.relationships, newRel],
      },
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        const handles: import('../types/aml').RelationshipStyleConfig = {}
        if (connection.sourceHandle) handles.sourceHandle = connection.sourceHandle
        if (connection.targetHandle) handles.targetHandle = connection.targetHandle
        if (Object.keys(handles).length === 0) return v
        return {
          ...v,
          styles: {
            ...v.styles,
            relationships: { ...v.styles?.relationships, [newRelId]: handles },
          },
        }
      }),
    }
    setEdges(eds => addEdge(connection, eds))
    onModelChange(newModel)
  }, [model, viewId, onModelChange, setEdges])

  // Reconnect start — track whether drop succeeded
  const onReconnectStart = useCallback(() => {
    reconnectSucceeded.current = false
  }, [])

  // Reconnect succeeded — update edge endpoints + handles in both canvas and model
  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    reconnectSucceeded.current = true
    skipNextModelSync.current = true
    setEdges(eds => reconnectEdge(oldEdge, newConnection, eds))
    if (!model) return
    const handlePatch: import('../types/aml').RelationshipStyleConfig = {
      sourceHandle: newConnection.sourceHandle ?? undefined,
      targetHandle: newConnection.targetHandle ?? undefined,
    }
    const newModel: WorkspaceModel = {
      ...model,
      model: {
        ...model.model,
        relationships: model.model.relationships.map(r =>
          r.id === oldEdge.id
            ? { ...r, from: newConnection.source ?? r.from, to: newConnection.target ?? r.to }
            : r
        ),
      },
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        return {
          ...v,
          styles: {
            ...v.styles,
            relationships: {
              ...v.styles?.relationships,
              [oldEdge.id]: { ...(v.styles?.relationships?.[oldEdge.id] ?? {}), ...handlePatch },
            },
          },
        }
      }),
    }
    onModelChange(newModel)
  }, [model, viewId, onModelChange, setEdges])

  // Reconnect drop on empty space — delete the edge
  const onReconnectEnd = useCallback((_: MouseEvent | TouchEvent, edge: Edge) => {
    if (!reconnectSucceeded.current) {
      setEdges(eds => eds.filter(e => e.id !== edge.id))
      if (!model) return
      const newModel: WorkspaceModel = {
        ...model,
        model: {
          ...model.model,
          relationships: model.model.relationships.filter(r => r.id !== edge.id),
        },
      }
      onModelChange(newModel)
    }
  }, [model, onModelChange, setEdges])

  // Context menu — right-click on node
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    const nodeStyle = (node.data?.style ?? {}) as ElementStyleConfig
    setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY, color: nodeStyle.color, background: nodeStyle.background, zIndex: node.zIndex ?? 1, contentAlign: nodeStyle.contentAlign, labelPlacement: nodeStyle.labelPlacement })
  }, [])

  // Context menu — right-click on edge
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY, label: (edge.label as string | undefined), style: (edge.data?.style ?? {}) as RelationshipStyleConfig })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Generic node element-style patch — updates canvas + model
  const handleNodeStylePatch = useCallback((nodeId: string, patch: Partial<ElementStyleConfig>) => {
    if (!model) return
    skipNextModelSync.current = true
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, style: { ...(n.data.style as object), ...patch } } } : n
    ))
    const newModel: WorkspaceModel = {
      ...model,
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        return {
          ...v,
          styles: {
            ...v.styles,
            elements: {
              ...v.styles?.elements,
              [nodeId]: { ...(v.styles?.elements?.[nodeId] ?? {}), ...patch },
            },
          },
        }
      }),
    }
    onModelChange(newModel)
    setContextMenu(prev =>
      prev?.type === 'node' && prev.id === nodeId ? { ...prev, ...patch } : prev
    )
  }, [model, viewId, onModelChange, setNodes])

  const handleNodeColorChange = useCallback((nodeId: string, color: string) =>
    handleNodeStylePatch(nodeId, { color })
  , [handleNodeStylePatch])

  const handleNodeBackground = useCallback((nodeId: string, background: string) =>
    handleNodeStylePatch(nodeId, { background: background || undefined })
  , [handleNodeStylePatch])

  const handleNodeContentAlign = useCallback((nodeId: string, contentAlign: import('../types/aml').ContentAlign) =>
    handleNodeStylePatch(nodeId, { contentAlign })
  , [handleNodeStylePatch])

  const handleNodeLabelPlacement = useCallback((nodeId: string, labelPlacement: import('../types/aml').LabelPlacement) =>
    handleNodeStylePatch(nodeId, { labelPlacement })
  , [handleNodeStylePatch])

  // Node z-index changed from context menu — visual only, not persisted in YAML
  const handleNodeZIndex = useCallback((nodeId: string, direction: 'front' | 'back') => {
    setNodes(nds => {
      const zValues = nds.map(n => n.zIndex ?? 1)
      const maxZ = Math.max(...zValues)
      const minZ = Math.min(...zValues)
      return nds.map(n =>
        n.id === nodeId
          ? { ...n, zIndex: direction === 'front' ? maxZ + 1 : Math.max(0, minZ - 1) }
          : n
      )
    })
  }, [setNodes])

  // Node resized → update node dimensions immediately + write to model
  const handleResizeEnd = useCallback((elementId: string, width: number, height: number) => {
    if (!model) return
    skipNextModelSync.current = true
    // Update the ReactFlow node's style (wrapper) and data.style (inner div) immediately
    setNodes(nds => nds.map(n =>
      n.id === elementId
        ? {
            ...n,
            style: { ...n.style, width, height },
            data: { ...n.data, style: { ...(n.data.style as object), width, height } },
          }
        : n
    ))
    const newModel: WorkspaceModel = {
      ...model,
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        return {
          ...v,
          styles: {
            ...v.styles,
            elements: {
              ...v.styles?.elements,
              [elementId]: { ...(v.styles?.elements?.[elementId] ?? {}), width, height },
            },
          },
        }
      }),
    }
    onModelChange(newModel)
  }, [model, viewId, onModelChange])

  // Shape palette drop — create a new element at the drop position
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const elementType = event.dataTransfer.getData('application/aml-node-type')
    if (!elementType || !model) return
    const droppedIcon = event.dataTransfer.getData('application/aml-node-icon') || undefined

    const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })

    // Generate a unique id
    const existingIds = new Set(model.model.elements.map(e => e.id))
    let counter = 1
    while (existingIds.has(`${elementType}-${counter}`)) counter++
    const newId = `${elementType}-${counter}`

    const newElement: ElementModel = {
      id: newId,
      name: `${elementType.charAt(0).toUpperCase()}${elementType.slice(1)} ${counter}`,
      type: elementType as ElementType,
    }

    const newModel: WorkspaceModel = {
      ...model,
      model: { ...model.model, elements: [...model.model.elements, newElement] },
      views: model.views.map(v => {
        if (v.id !== viewId) return v
        const existingStyles = v.styles ?? {}
        const elementStyles = { ...(existingStyles.elements ?? {}) }
        if (droppedIcon) elementStyles[newId] = { icon: droppedIcon }
        return {
          ...v,
          include: [...(v.include ?? []), newId],
          positions: { ...(v.positions ?? {}), [newId]: position },
          styles: { ...existingStyles, elements: elementStyles },
        }
      }),
    }

    const dropDefaults: Record<string, { width: number; height: number }> = {
      person: { width: 110, height: 140 }, system: { width: 160, height: 80 },
      application: { width: 150, height: 75 }, component: { width: 150, height: 75 },
      database: { width: 140, height: 100 }, process: { width: 150, height: 65 },
      decision: { width: 130, height: 78 }, infra: { width: 140, height: 75 },
      annotation: { width: 180, height: 60 }, boundary: { width: 320, height: 220 },
    }
    const nodeTypeName = nodeTypeForElementType(elementType)
    const dropSize = dropDefaults[nodeTypeName] ?? { width: 160, height: 80 }
    // Boundary/group nodes render behind all other nodes
    const dropZIndex = nodeTypeName === 'boundary' ? 0 : undefined
    skipNextModelSync.current = true
    setNodes(nds => [
      ...nds,
      {
        id: newId,
        type: nodeTypeName,
        position,
        zIndex: dropZIndex,
        style: dropSize,
        data: { element: newElement, style: droppedIcon ? { icon: droppedIcon } : {} },
      },
    ])
    onModelChange(newModel)
  }, [model, viewId, rfInstance, onModelChange, setNodes])

  return (
    <div className={styles.pane} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            onLabelChange: handleLabelChange,
            onResizeEnd: handleResizeEnd,
          },
        }))}
        edges={edges.map(e => ({ ...e, reconnectable: true, data: { ...e.data, onLabelChange: handleEdgeLabelChange, onWaypointsChange: handleWaypointsChange } }))}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneClick={closeContextMenu}
        onSelectionChange={({ nodes: sel }) =>
          onSelectionChange?.(sel.length === 1 ? sel[0].id : null)
        }
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-left">
          <ShapePalette />
        </Panel>
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={closeContextMenu}
          onNodeColor={handleNodeColorChange}
          onNodeBackground={handleNodeBackground}
          onNodeZIndex={handleNodeZIndex}
          onNodeContentAlign={handleNodeContentAlign}
          onNodeLabelPlacement={handleNodeLabelPlacement}
          onEdgeLabelChange={handleEdgeLabelChange}
          onEdgePatch={handleEdgePatch}
        />
      )}
    </div>
  )
}

export function CanvasPane(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasPaneInner {...props} />
    </ReactFlowProvider>
  )
}

