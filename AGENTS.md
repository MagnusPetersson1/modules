# Modules — Agent Instructions

This repository is a **tool chest** of self-contained, portable modules for data conversion, visualization, and analysis.

## Core Principle: Portable Modules

Each module lives under `modules/<name>/` and is **fully self-contained** — it must be copy-paste movable to any other project with no changes. This means:

- No cross-module imports or shared runtime code
- Each module carries its own dependencies (`package.json`, `.csproj`, etc.)
- No root-level shared `node_modules` that modules depend on

## Module Structure

```
modules/<name>/
├── frontend/        # React + TypeScript (Vite)
│   ├── src/
│   │   └── __tests__/   # Vitest unit/component tests
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/         # .NET Core
│   ├── Controllers/
│   ├── Models/
│   ├── Tests/           # xUnit integration/unit tests
│   ├── Program.cs
│   └── <Name>.csproj
└── docs/
    └── index.md         # User-facing documentation for this module
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite |
| Backend/Logic | .NET Core (C#) |
| Styling | CSS Modules or Tailwind (per module) |

## Conventions

- **Frontend entry**: `modules/<name>/frontend/src/main.tsx`
- **Backend entry**: `modules/<name>/backend/Program.cs`
- Module names are `kebab-case` (e.g., `data-converter`, `chart-viewer`)
- Frontend communicates with backend via REST API on a configurable base URL
- No shared types between frontend and backend — each side defines its own contracts

## Creating a New Module

1. Copy an existing module or scaffold from scratch under `modules/<new-name>/`
2. Ensure the module contains both `frontend/` and `backend/` (or just one if the module warrants it)
3. The module must run in isolation with its own `npm install` and `dotnet run`
4. Add tests for new behaviour — frontend with Vitest, backend with xUnit
5. Keep `docs/index.md` up to date with user-facing usage instructions

---

## Module: Visualizer

**Purpose:** An architectural diagramming tool. Users describe architecture in a YAML text format (AML) and see an interactive visual canvas — and vice versa. Used for C4, ArchiMate, sequence, process, and infrastructure diagrams.

### AML — Architecture Markup Language

AML is a strict-YAML-subset DSL designed for this module. Key design principles:

- **Model/view separation**: `model` is the semantic truth (elements + relationships). `views` are projections with their own layout, positions, and styles. The same element can appear in many views with different styling.
- **Positions in DSL**: When a user drags a node, its `x/y` is written back into `views[].positions` in the YAML — enabling full bidirectional sync without any separate state store.
- **YAML chosen over custom DSL**: Battle-tested parsers in every language (YamlDotNet/.NET, js-yaml/TS), Monaco YAML highlighting out of the box, LLMs generate valid YAML reliably. Strict subset used: all string values quoted, IDs alphanumeric+hyphen only (avoids YAML coercion bugs like `id: NO` → `false`).
- **Iconify for icons**: `icon: "mdi:account"`, `icon: "aws:lambda"`, `icon: "azure:app-service"` — on-demand icon loading, no bundle bloat.
- **ElkJS for layout**: Runs browser-side (WASM), backend stays stateless. "Auto-layout" button computes positions via ELK and writes them back to DSL.

#### AML Format Reference

```yaml
workspace:
  name: "E-Commerce Platform"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person          # person | system | application | component | database
                            # service | process | capability | node | device
                            # annotation | sticky-note | callout | boundary | divider
      description: "End user"
      tags: [external]
      layer: business       # business | application | technology | infrastructure
                            # motivation | strategy
      tech: "React"         # optional technology label
      parent: "platform"    # containment — renders as child inside parent GroupNode

  relationships:
    - id: "rel-1"           # explicit id required for per-relationship styling
      from: "customer"
      to: "webshop"
      label: "browses"
      type: uses            # uses | realizes | triggers | flows-to | assigned-to
                            # composed-of | serves | accesses | association

views:
  - id: "context"
    name: "System Context"
    type: c4-context        # c4-context | c4-container | c4-component
                            # archimate-layered | sequence | process | infrastructure
    include: ["customer", "webshop", "note1", "boundary1"]

    # ArchiMate layer bands (only for type: archimate-layered)
    # Rendered as auto-sized horizontal swimlane bands; canvas is unrestricted
    layers:
      - id: "business"
        name: "Business"
        color: "#FFFACD"
        include: ["bp1", "actor1"]
      - id: "application"
        name: "Application"
        color: "#DAE8FC"
        include: ["app1", "db1"]

    # Z-order display layers — toggled in Layers panel (like Figma)
    displayLayers:
      - id: "bg"
        zIndex: 0
        visible: true
        elements: ["boundary1"]
      - id: "main"
        zIndex: 1
        visible: true
        elements: ["customer", "webshop"]
      - id: "notes"
        zIndex: 2
        visible: true
        elements: ["note1"]

    layout:
      algorithm: layered    # layered | force | grid | manual
      direction: top-down   # top-down | left-right

    # Written by sync engine when user drags nodes; read on load
    positions:
      customer: { x: 100, y: 50 }

    styles:
      elements:
        customer:
          color: "#4CAF50"
          icon: "mdi:account"   # iconify id
          shape: person         # default | person | cylinder | cloud | hexagon | diamond
                                # sticky-note | callout | boundary
          fontSize: 13
          width: 160
      relationships:
        rel-1:
          lineStyle: dashed     # solid | dashed | dotted | double
          arrowEnd: open        # open | filled | none | diamond | odiamond
          arrowStart: none
          color: "#888"
          thickness: 2
          bendStyle: orthogonal # straight | curved | orthogonal | elbow
          labelPosition: center # center | source | target

    theme: default          # default | dark | blueprint | corporate | archimate

  # Sequence view — separate renderer (not ReactFlow), deterministic layout
  - id: "checkout"
    type: sequence
    participants: ["customer", "webshop", "orderService", "db"]
    steps:
      - from: "customer"
        to: "webshop"
        label: "POST /checkout"
        type: sync            # sync | async | return | create | destroy
      - fragment: alt         # alt | loop | par | opt | critical | break
        condition: "payment ok"
        steps:
          - from: "webshop"
            to: "orderService"
            label: "createOrder()"
```

### Architecture

```
DSL string (Monaco)  ←→  WorkspaceAst (TypeScript)  ←→  ReactFlow nodes/edges
                              ↕
                    POST /api/workspace/parse
                    POST /api/workspace/format
                    POST /api/workspace/layout   (positions only)
                    POST /api/workspace/import/* (ArchiMate, DrawIO, BPMN)
                    POST /api/workspace/export/* (SVG server-side, PDF, DrawIO XML)
```

**Sync flow:**
- DSL edit → debounce 400ms → `parse` → update AST → `astToFlow` → ReactFlow re-renders
- Node drag end → `flowToAst` (positions only) → `format` → Monaco updates (no re-parse)
- Edge drawn → add relationship to AST → `format` → Monaco updates
- Style panel change → update AST styles → `format` → Monaco updates

### Key Files

```
modules/visualizer/
├── frontend/src/
│   ├── types/aml.ts              # TypeScript mirror of WorkspaceModel
│   ├── sync/index.ts             # dslToAst, astToDsl, astToFlow, flowToAst
│   ├── layout/index.ts           # ElkJS integration
│   ├── nodes/                    # One ReactFlow node component per element type
│   │   ├── PersonNode.tsx
│   │   ├── SystemNode.tsx
│   │   ├── DatabaseNode.tsx
│   │   ├── ApplicationNode.tsx
│   │   ├── ComponentNode.tsx
│   │   ├── InfraNode.tsx
│   │   ├── AnnotationNode.tsx
│   │   ├── BoundaryNode.tsx
│   │   └── GroupNode.tsx
│   ├── edges/                    # One ReactFlow edge component per relationship type
│   ├── views/SequenceView.tsx    # Sequence diagram SVG renderer (not ReactFlow)
│   └── components/
│       ├── DslPane.tsx           # Monaco editor
│       ├── CanvasPane.tsx        # ReactFlow canvas
│       ├── ViewTabs.tsx          # Tab per view
│       ├── Toolbar.tsx           # Auto-layout, import/export, theme
│       ├── StylePanel.tsx        # Slides in on node select
│       ├── LayersPanel.tsx       # Toggle display layers
│       └── ImportExportDialog.tsx
├── backend/
│   ├── Models/WorkspaceModel.cs  # C# records mirroring AML
│   ├── Services/
│   │   ├── AmlParser.cs          # YamlDotNet: YAML string → WorkspaceModel
│   │   ├── AmlFormatter.cs       # WorkspaceModel → normalized YAML
│   │   ├── AmlValidator.cs       # Returns ParseError[]
│   │   ├── LayoutService.cs      # (deferred — ElkJS runs client-side)
│   │   ├── Import/
│   │   │   ├── ArchiMateImporter.cs
│   │   │   ├── DrawIoImporter.cs
│   │   │   └── BpmnImporter.cs
│   │   └── Export/
│   │       ├── DrawIoExporter.cs
│   │       ├── ArchiMateExporter.cs
│   │       └── PdfExporter.cs    # QuestPDF
│   └── Controllers/
│       └── WorkspaceController.cs
└── docs/index.md
```

### Frontend Dependencies (visualizer-specific)

| Package | Purpose |
|---|---|
| `@monaco-editor/react` | DSL text editor with YAML mode |
| `@xyflow/react` | Interactive node/edge canvas |
| `elkjs` | Browser-side auto-layout (WASM) |
| `@iconify/react` | On-demand icons (mdi, aws, azure, etc.) |
| `yaml` | YAML parse/stringify (js-yaml compatible) |

### Backend Dependencies (visualizer-specific)

| Package | Purpose |
|---|---|
| `YamlDotNet` | YAML parsing/serialization |
| `QuestPDF` | PDF export |

### Import/Export Formats

| Format | Direction | Notes |
|---|---|---|
| `.arch` (AML YAML) | in/out | Native format |
| ArchiMate Exchange XML | in/out | High fidelity |
| DrawIO XML | in/out | Lossy — shapes approximated |
| BPMN 2.0 XML | in | Maps to `process` view |
| SVG | out | Reconstructed from canvas state |
| PNG | out | `html2canvas` on SVG |
| PDF | out | Backend: QuestPDF |

Imports always succeed. Lossy mappings shown as a dismissible warnings banner.
