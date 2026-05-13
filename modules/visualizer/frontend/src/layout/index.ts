import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from '@xyflow/react'

const elk = new ELK()

export async function computeLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'top-down' | 'left-right' = 'top-down'
): Promise<Map<string, { x: number; y: number }>> {
  const elkDirection = direction === 'top-down' ? 'DOWN' : 'RIGHT'

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection,
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode': '60',
    },
    children: nodes
      .filter(n => !n.parentId)
      .map(n => ({
        id: n.id,
        width: (n.style?.width as number) ?? 160,
        height: (n.style?.height as number) ?? 80,
      })),
    edges: edges.map(e => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  }

  const layouted = await elk.layout(elkGraph)

  const positions = new Map<string, { x: number; y: number }>()
  for (const child of layouted.children ?? []) {
    if (child.x !== undefined && child.y !== undefined) {
      positions.set(child.id, { x: child.x, y: child.y })
    }
  }
  return positions
}
