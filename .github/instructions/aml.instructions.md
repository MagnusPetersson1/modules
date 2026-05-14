---
applyTo: "**/*.arch"
---

# AML — Architecture Markup Language

AML is the canonical DSL for the Visualizer module. It is a strict YAML subset — all string values quoted, IDs alphanumeric + hyphen only.

## Top-level structure

```yaml
workspace:
  name: "My System"
  version: "1.0"          # optional

model:
  elements: [...]
  relationships: [...]

views: [...]
```

## Elements

```yaml
model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person          # see types below
      description: "End user of the system"
      tags: ["external"]
      layer: business       # business | application | technology | infrastructure | motivation | strategy
      tech: "React"         # optional technology label shown on node
      parent: "platform"    # containment — renders node inside parent GroupNode
      text: "Some note"     # for annotation/sticky-note/callout types only
```

### Element types

| type | rendered as |
|---|---|
| `person` | PersonNode — stick figure |
| `system` | SystemNode — rounded box |
| `application` | ApplicationNode — box |
| `component` | ComponentNode — component box |
| `database` | DatabaseNode — cylinder |
| `service` | ProcessNode |
| `process` | ProcessNode |
| `capability` | ProcessNode |
| `decision` | decision diamond |
| `node` | InfraNode |
| `device` | InfraNode |
| `annotation` | AnnotationNode — text only |
| `sticky-note` | AnnotationNode |
| `callout` | AnnotationNode |
| `boundary` | BoundaryNode — dashed container |
| `divider` | AnnotationNode |

## Relationships

```yaml
model:
  relationships:
    - id: "rel-1"           # explicit id required for per-relationship styling
      from: "customer"
      to: "webshop"
      label: "browses"
      type: uses            # uses | realizes | triggers | flows-to | assigned-to
                            # composed-of | serves | accesses | association
```

## Views

```yaml
views:
  - id: "context"
    name: "System Context"
    type: c4-context        # c4-context | c4-container | c4-component
                            # archimate-layered | sequence | process | infrastructure
    include: ["customer", "webshop"]

    layout:
      algorithm: layered    # layered | force | grid | manual
      direction: top-down   # top-down | left-right

    positions:              # written by sync engine on node drag; read on load
      customer: { x: 100, y: 50 }

    styles:
      elements:
        customer:
          color: "#4CAF50"          # border/text color
          background: "#E8F5E9"     # fill color
          icon: "mdi:account"       # iconify id
          shape: person             # default | person | cylinder | cloud | hexagon
                                    # diamond | sticky-note | callout | boundary
          fontSize: 13
          width: 160
          height: 80
          contentAlign: center      # top-left | top-center | top-right
                                    # center-left | center | center-right
                                    # bottom-left | bottom-center | bottom-right
          labelPlacement: bottom    # top | bottom | left | right (icon vs label)
      relationships:
        rel-1:
          lineStyle: dashed         # solid | dashed | dotted | double
          arrowEnd: open            # open | filled | none | diamond | odiamond
          arrowStart: none
          color: "#888888"
          thickness: 2
          bendStyle: orthogonal     # straight | curved | orthogonal | elbow
          labelPosition: center     # center | source | target
          sourceHandle: "right"
          targetHandle: "left"

    displayLayers:                  # z-order toggle layers (like Figma)
      - id: "bg"
        zIndex: 0
        visible: true
        elements: ["boundary1"]
      - id: "main"
        zIndex: 1
        visible: true
        elements: ["customer", "webshop"]

    theme: default          # default | dark | blueprint | corporate | archimate
```

## Sequence views

```yaml
views:
  - id: "checkout-flow"
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

## ArchiMate layered views

```yaml
views:
  - id: "archimate"
    type: archimate-layered
    layers:
      - id: "business"
        name: "Business"
        color: "#FFFACD"
        include: ["actor1", "bp1"]
      - id: "application"
        name: "Application"
        color: "#DAE8FC"
        include: ["app1", "db1"]
```

## Icons

Use Iconify icon IDs. Examples:
- `mdi:account` — person
- `mdi:server` — server
- `mdi:database` — database
- `aws:lambda` — AWS Lambda
- `aws:s3` — AWS S3
- `azure:app-service` — Azure App Service
- `azure:sql-database` — Azure SQL
- `gcp:compute-engine` — GCP Compute Engine

## Key rules

- All string values must be **quoted**
- IDs must be **alphanumeric + hyphen** only (no spaces, no special chars)
- `positions` are written automatically when nodes are dragged — do not invent positions for new elements
- Every relationship that needs styling must have an explicit `id`
- `include` in a view lists element IDs to show; omit to show all model elements
- `parent` on an element causes it to render inside the parent node (GroupNode)
