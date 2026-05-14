---
applyTo: "**/*.arch"
---

You are editing an AML (Architecture Markup Language) file for the Visualizer module.

Follow the full AML specification in [aml.instructions.md](./aml.instructions.md).

## Editing rules

- **Never invent `positions`** — omit or leave the existing `positions` block unchanged. Positions are managed by the canvas drag-and-drop.
- **IDs must be unique** across the entire file and match `[a-z0-9-]+`
- **Every relationship that needs styling** requires an explicit `id` field
- **`include` lists** in views must only reference element IDs that exist in `model.elements`
- **`parent` references** must point to an element with type `boundary` or that renders as a GroupNode
- Removing an element requires removing it from: `model.elements`, all `relationships` referencing it, and all `views[].include` lists

## Inline completion hints

When completing inside `model.elements`, suggest the correct field set for the element `type`.
When completing inside `views[].styles.elements`, suggest valid `ElementStyleConfig` fields.
When completing inside `views[].styles.relationships`, suggest valid `RelationshipStyleConfig` fields.
When completing inside `views[].steps`, suggest valid sequence step fields.

## Common patterns

**Add a person:**
```yaml
- id: "user"
  name: "User"
  type: person
  description: "..."
```

**Add a system with tech:**
```yaml
- id: "api"
  name: "API"
  type: application
  tech: ".NET 9"
```

**Add a relationship:**
```yaml
- id: "rel-api-db"
  from: "api"
  to: "db"
  label: "reads/writes"
  type: uses
```

**Style a node:**
```yaml
styles:
  elements:
    api:
      color: "#1565C0"
      background: "#E3F2FD"
      icon: "mdi:server"
```

**Style an edge:**
```yaml
styles:
  relationships:
    rel-api-db:
      lineStyle: dashed
      arrowEnd: open
      color: "#888888"
```
