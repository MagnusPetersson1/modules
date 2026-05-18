---
applyTo: "**"
---

# AML — Architecture Markup Language

This workspace uses **AML** — a strict-YAML DSL for architectural diagrams. Diagrams live in `.arch` files and are visualized in the Visualizer module.

## When a user asks about architecture, systems, or diagrams

- Generate AML YAML (see format below), not Mermaid or Structurizr
- Save output to a `.arch` file
- Use the `/aml-diagram` skill for full generation or conversion tasks
- Use the `new-diagram`, `c4-context`, `c4-container`, `sequence-diagram`, or `convert-to-aml` prompts for interactive workflows

## AML quick reference

```yaml
workspace:
  name: "System Name"

model:
  elements:
    - id: "user"          # alphanumeric + hyphen only, lowercase
      name: "User"
      type: person        # person | system | application | component | database
                          # service | process | node | device | boundary | annotation
      description: "..."
      tech: "React"       # optional technology label
      tags: ["external"]  # optional
      parent: "boundary1" # optional containment

  relationships:
    - id: "rel-1"         # required for styling
      from: "user"
      to: "api"
      label: "calls"
      type: uses          # uses | realizes | triggers | flows-to | assigned-to
                          # composed-of | serves | accesses | association

views:
  - id: "context"
    name: "System Context"
    type: c4-context      # c4-context | c4-container | c4-component
                          # sequence | process | infrastructure | archimate-layered
    include: ["user", "api"]
    layout:
      algorithm: layered  # layered | force | grid | manual
      direction: top-down # top-down | left-right
```

## Rules

- All string values **must be quoted**
- IDs: alphanumeric + hyphen only — NO spaces, NO underscores, NO special characters
- Never generate `positions` — the canvas places nodes automatically
- Every relationship that needs styling must have an explicit `id`
- `include` lists only element IDs that exist in `model.elements`

## Style syntax (optional)

```yaml
    styles:
      elements:
        user:
          color: "#1565C0"
          background: "#E3F2FD"
          icon: "mdi:account"   # iconify id: mdi:*, aws:*, azure:*, gcp:*
      relationships:
        rel-1:
          lineStyle: dashed     # solid | dashed | dotted
          arrowEnd: open        # open | filled | none | diamond
          color: "#888888"
```
