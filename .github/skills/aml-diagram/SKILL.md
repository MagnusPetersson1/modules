---
name: aml-diagram
description: "Generate or modify an AML (Architecture Markup Language) diagram for the Visualizer module. Use when a user asks to create, update, or extend an architectural diagram — including C4, ArchiMate, sequence, process, or infrastructure views. Accepts plain English descriptions, existing Mermaid C4 or Structurizr DSL as input."
argument-hint: "<description of the architecture to diagram>"
---

# AML Diagram Generation

Generates or modifies AML YAML for the Visualizer module based on a plain-English description or an existing Mermaid/Structurizr input.

Always follow the full AML spec in [aml.instructions.md](../instructions/aml.instructions.md).

## Procedure

### 1 — Understand the request

Determine:
- **Type of diagram**: C4 Context, C4 Container, C4 Component, ArchiMate, Sequence, Process, Infrastructure
- **Elements**: people, systems, applications, components, databases, services
- **Relationships**: direction, label, type
- **Input format**: plain English, Mermaid C4, Structurizr DSL, or existing AML to extend

If the user pastes Mermaid or Structurizr DSL, convert it to AML (see conversion rules below).

### 2 — Generate the AML

Rules:
- All string values quoted
- IDs: alphanumeric + hyphen only, lowercase, descriptive (e.g. `"order-service"` not `"s1"`)
- Do **not** invent `positions` — omit the `positions` block entirely (the canvas auto-places on first open)
- Every relationship that needs a distinct style must have a unique `id`
- Use `include` in views to list only the elements relevant to that view
- Match element types to the domain: people → `person`, external systems → `system`, internal apps → `application`, data stores → `database`, deployed services → `service`
- Add `tech` labels where the user specifies technology
- For sequence diagrams, always list `participants` explicitly

### 3 — Output format

Output a single fenced code block tagged `yaml`. Provide the complete file, not a fragment.

```yaml
workspace:
  name: "..."

model:
  elements:
    - id: "..."
      ...
  relationships:
    - id: "..."
      ...

views:
  - id: "..."
    ...
```

After the code block, add a short plain-English summary: what was generated and any assumptions made.

---

## Mermaid C4 → AML conversion

| Mermaid | AML |
|---|---|
| `Person(alias, "name", "desc")` | `type: person` |
| `System(alias, "name", "desc")` | `type: system` |
| `System_Ext(alias, "name", "desc")` | `type: system`, `tags: ["external"]` |
| `Container(alias, "name", "tech", "desc")` | `type: application`, `tech: "..."` |
| `ContainerDb(alias, "name", "tech", "desc")` | `type: database`, `tech: "..."` |
| `Rel(from, to, "label")` | relationship with `from`/`to`/`label` |
| `UpdateRelStyle(...)` | `views[].styles.relationships[id]` |

## Structurizr DSL → AML conversion

| Structurizr | AML |
|---|---|
| `person "name"` | `type: person` |
| `softwareSystem "name"` | `type: system` |
| `container "name"` | `type: application` |
| `component "name"` | `type: component` |
| `-> "label"` | relationship |
| `systemContext` view | `type: c4-context` |
| `container` view | `type: c4-container` |
| `component` view | `type: c4-component` |
| `styles { element "Person" { ... } }` | `views[].styles.elements[id]` |

---

## Example output for "e-commerce C4 context"

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
