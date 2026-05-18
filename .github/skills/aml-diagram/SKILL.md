---
name: aml-diagram
description: "Generate or modify an AML (Architecture Markup Language) diagram. Use when a user asks to create, update, or extend an architectural diagram — including C4 Context, C4 Container, C4 Component, sequence, process, or infrastructure views. Accepts plain English, Mermaid C4, Structurizr DSL, or PlantUML as input."
argument-hint: "<plain-English description, or paste existing Mermaid/Structurizr/PlantUML>"
mode: agent
---

# AML Diagram Skill

Generates or modifies AML YAML diagrams from plain-English descriptions or existing DSL inputs.

## Procedure

### 1 — Understand the request

Determine:
- **Diagram type**: C4 Context, C4 Container, C4 Component, Sequence, Process, Infrastructure, ArchiMate
- **Elements**: people, systems, apps, components, databases, services, boundaries
- **Relationships**: direction, label, cardinality
- **Input format**: plain English, Mermaid, Structurizr DSL, PlantUML, or existing AML to extend

If the user provides Mermaid, Structurizr, or PlantUML — convert it (see tables below). If no argument is provided, ask clarifying questions before generating.

### 2 — Generate the AML

Rules (always follow these):
- **All string values must be quoted** — including type values, tag values, and IDs
- **IDs**: alphanumeric + hyphen only, lowercase, descriptive — `"order-service"` not `"s1"`, NO underscores, NO spaces
- **Never generate `positions`** — omit entirely; the canvas auto-places nodes
- Every relationship that needs a distinct style must have a unique `id`
- `include` lists in views must only reference IDs that exist in `model.elements`
- Match types to domain: people → `person`, external systems → `system`, internal apps → `application`, data stores → `database`, deployed services → `service`
- Add `tech` labels wherever technology is mentioned
- Sequence diagrams: always list `participants` explicitly (controls left-to-right order)

### 3 — Pick the right view type

| Diagram goal | `type` |
|---|---|
| Who uses the system, what external systems exist | `c4-context` |
| Containers inside a system (apps, DBs, APIs) | `c4-container` |
| Components inside a container | `c4-component` |
| Time-ordered interactions, API flows, auth flows | `sequence` |
| Business process steps / workflow | `process` |
| Servers, VMs, cloud infrastructure | `infrastructure` |
| ArchiMate layered (business/app/tech) | `archimate-layered` |

### 4 — Output

Output a single `yaml` code block containing the **complete file** (not a fragment). Follow with a brief plain-English summary of what was generated and any assumptions made.

Then ask for a filename (suggest a sensible default like `context.arch`, `containers.arch`, `sequence.arch`) and save it.

---

## AML format reference

```yaml
workspace:
  name: "System Name"

model:
  elements:
    - id: "user"
      name: "User"
      type: person          # see type table below
      description: "End user browsing the site"
      tech: "React"         # optional
      tags: ["external"]    # optional
      parent: "boundary-1"  # optional — renders element inside parent

  relationships:
    - id: "rel-1"           # required if you want to style this edge
      from: "user"
      to: "api"
      label: "calls"
      type: uses            # see relationship type table below

views:
  - id: "context"
    name: "System Context"
    type: c4-context
    include: ["user", "api"]
    layout:
      algorithm: layered    # layered | force | grid | manual
      direction: top-down   # top-down | left-right
    styles:                 # optional
      elements:
        user:
          color: "#1565C0"
          background: "#E3F2FD"
          icon: "mdi:account"
      relationships:
        rel-1:
          lineStyle: dashed
          arrowEnd: open
          color: "#888888"
```

### Element types

| `type` | Use for |
|---|---|
| `person` | Human actor / persona |
| `system` | Software system (C4 L1) |
| `application` | App or container (C4 L2) |
| `component` | Code component (C4 L3) |
| `database` | Data store |
| `service` | Deployed / external service |
| `process` | Business process step |
| `boundary` | Grouping box (dashed border) |
| `annotation` | Free-text note |
| `node` | Physical/virtual infrastructure node |
| `device` | Hardware device |

### Relationship types

| `type` | Meaning |
|---|---|
| `uses` | General dependency / call |
| `flows-to` | Data flows toward |
| `triggers` | Event triggers |
| `realizes` | Implements / fulfils |
| `serves` | Provides service to |
| `accesses` | Reads/writes |
| `assigned-to` | Role or actor assignment |
| `composed-of` | Parent-child composition |
| `association` | Generic link |

### Sequence view syntax

```yaml
  - id: "checkout"
    type: sequence
    participants: ["customer", "api", "db"]
    steps:
      - from: "customer"
        to: "api"
        label: "POST /checkout"
        type: sync            # sync | async | return | create | destroy
      - fragment: alt         # alt | loop | par | opt | critical | break
        condition: "payment ok"
        steps:
          - from: "api"
            to: "db"
            label: "insert order"
            type: sync
```

### Style values

| Property | Options |
|---|---|
| `lineStyle` | `solid` · `dashed` · `dotted` |
| `arrowEnd` | `open` · `filled` · `none` · `diamond` · `odiamond` |
| `arrowStart` | same as arrowEnd |
| `bendStyle` | `straight` · `curved` · `orthogonal` · `elbow` |
| `icon` | Iconify ID: `mdi:account` · `aws:lambda` · `azure:app-service` · `gcp:bigquery` |
| `shape` | `default` · `person` · `cylinder` · `cloud` · `hexagon` · `diamond` · `sticky-note` |

---

## Mermaid C4 → AML

| Mermaid | AML |
|---|---|
| `Person(id, "name", "desc")` | `type: person` |
| `System(id, "name", "desc")` | `type: system` |
| `System_Ext(id, "name", "desc")` | `type: system`, `tags: ["external"]` |
| `Container(id, "name", "tech", "desc")` | `type: application`, `tech: "..."` |
| `ContainerDb(id, "name", "tech", "desc")` | `type: database`, `tech: "..."` |
| `Rel(a, b, "label")` | relationship `from/to/label`, `type: uses` |
| `UpdateRelStyle(...)` | `views[].styles.relationships` |
| `C4Context` | view `type: c4-context` |
| `C4Container` | view `type: c4-container` |
| `C4Component` | view `type: c4-component` |

## Structurizr DSL → AML

| Structurizr | AML |
|---|---|
| `person "name"` | `type: person` |
| `softwareSystem "name"` | `type: system` |
| `container "name" { technology "..." }` | `type: application`, `tech: "..."` |
| `component "name"` | `type: component` |
| `-> "label"` | `type: uses` |
| `delivers` | `type: serves` |
| `systemContext` view | `type: c4-context` |
| `container` view | `type: c4-container` |
| `component` view | `type: c4-component` |

## PlantUML → AML

| PlantUML | AML |
|---|---|
| `actor` / `person` | `type: person` |
| `component` / `rectangle` | `type: application` |
| `database` | `type: database` |
| `node` | `type: node` |
| `-->` / `->` | `type: uses` |
| `..>` | `type: uses`, `lineStyle: dashed` |
| `package` / `frame` | `type: boundary` with `parent:` on children |

---

## Example — C4 Context

```yaml
workspace:
  name: "E-Commerce Platform"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person
      description: "Shops online"
    - id: "webshop"
      name: "Web Shop"
      type: system
      description: "Handles browsing and checkout"
      tech: "React + .NET"
    - id: "payment-gateway"
      name: "Payment Gateway"
      type: system
      description: "Processes payments"
      tags: ["external"]
    - id: "email-service"
      name: "Email Service"
      type: system
      description: "Sends order confirmations"
      tags: ["external"]
      tech: "SendGrid"

  relationships:
    - id: "rel-1"
      from: "customer"
      to: "webshop"
      label: "browses and orders"
      type: uses
    - id: "rel-2"
      from: "webshop"
      to: "payment-gateway"
      label: "processes payment via"
      type: uses
    - id: "rel-3"
      from: "webshop"
      to: "email-service"
      label: "sends confirmation via"
      type: uses

views:
  - id: "context"
    name: "System Context"
    type: c4-context
    include: ["customer", "webshop", "payment-gateway", "email-service"]
    layout:
      algorithm: layered
      direction: top-down
```

## Example — Sequence with fragment

```yaml
workspace:
  name: "Checkout Flow"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person
    - id: "api"
      name: "Order API"
      type: service
      tech: "ASP.NET Core"
    - id: "db"
      name: "Orders DB"
      type: database
      tech: "PostgreSQL"
    - id: "payment"
      name: "Payment Gateway"
      type: system
      tags: ["external"]

views:
  - id: "checkout-seq"
    name: "Checkout Sequence"
    type: sequence
    participants: ["customer", "api", "db", "payment"]
    steps:
      - from: "customer"
        to: "api"
        label: "POST /checkout"
        type: sync
      - from: "api"
        to: "db"
        label: "reserve stock"
        type: sync
      - from: "api"
        to: "payment"
        label: "charge card"
        type: sync
      - fragment: alt
        condition: "payment ok"
        steps:
          - from: "api"
            to: "db"
            label: "insert order"
            type: sync
          - from: "api"
            to: "customer"
            label: "201 Created"
            type: return
```
