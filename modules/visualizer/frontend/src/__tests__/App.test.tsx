import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Stub heavy deps so unit tests don't require a real browser canvas
vi.mock('@monaco-editor/react', () => ({ default: () => <textarea data-testid="monaco" /> }))
vi.mock('@xyflow/react', () => ({
  ReactFlow: () => <div data-testid="canvas" />,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useNodesState: () => [[], () => {}, () => {}],
  useEdgesState: () => [[], () => {}, () => {}],
  addEdge: (_: unknown, eds: unknown) => eds,
}))
vi.mock('../sync', () => ({
  dslToAst: vi.fn(),
  astToDsl: vi.fn(),
  astToFlow: vi.fn(() => ({ nodes: [], edges: [] })),
  flowToAst: vi.fn((m: unknown) => m),
}))
vi.mock('../layout', () => ({ computeLayout: vi.fn() }))

import App from '../App'

describe('App', () => {
  it('renders the toolbar brand', () => {
    render(<App />)
    expect(screen.getByText('Visualizer')).toBeInTheDocument()
  })

  it('renders the Monaco editor', () => {
    render(<App />)
    expect(screen.getByTestId('monaco')).toBeInTheDocument()
  })

  it('renders the canvas', () => {
    render(<App />)
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })
})
