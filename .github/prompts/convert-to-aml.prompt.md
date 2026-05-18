---
name: "Convert to AML"
description: "Convert an existing diagram in another format to AML. Supports Mermaid C4/flowchart, Structurizr DSL, PlantUML, hand-written descriptions, and pasted table/list inputs."
argument-hint: "<paste your existing diagram or description here>"
mode: agent
---

Use the `/aml-diagram` skill to **convert an existing diagram to AML**.

## Supported input formats

| Source format | What to paste |
|---|---|
| **Mermaid C4** | `C4Context`, `C4Container`, `C4Component` blocks |
| **Mermaid flowchart** | `graph TD` or `flowchart TD` blocks |
| **Structurizr DSL** | `workspace { ... }` blocks |
| **PlantUML** | `@startuml ... @enduml` |
| **Plain English** | "We have a React frontend, an API, and a Postgres database..." |
| **Table/list** | Paste a list of components and how they connect |

## Conversion rules

| Source concept | AML equivalent |
|---|---|
| Person / Actor / User | `type: person` |
| System (C4 L1) | `type: system` |
| Container / App / Service (C4 L2) | `type: application` or `type: service` |
| Component (C4 L3) | `type: component` |
| Database / Store | `type: database` |
| External system | `type: system`, `tags: ["external"]` |
| Boundary / Group | `type: boundary` (with child elements using `parent:`) |
| Mermaid `-->` / `->` | `type: uses` |
| Mermaid `-.->` | `type: uses` with `styles.relationships.<id>.lineStyle: dashed` |
| Structurizr `uses` | `type: uses` |
| Structurizr `delivers` | `type: serves` |
| PlantUML `-->` | `type: uses` |
| PlantUML `..>` | `type: uses`, `lineStyle: dashed` |

## Steps

1. Read the pasted input.
2. Identify all actors, systems, and components → map to AML element types.
3. Identify all relationships → map to AML relationship types.
4. Determine the best view type:
   - If source is C4Context → `type: c4-context`
   - If source is C4Container → `type: c4-container`
   - If source is C4Component → `type: c4-component`
   - If source is a flowchart or process → `type: process`
   - If source is a sequence → `type: sequence`
   - Otherwise → `type: c4-context`
5. Generate complete AML YAML — all strings quoted, IDs alphanumeric+hyphen only.
6. If the conversion is lossy (e.g. Mermaid shape types have no AML equivalent), note what was approximated.
7. Ask for a filename (default: `diagram.arch`) and save.

## Mermaid C4 example

**Input:**
```
C4Context
  title "System Context for Internet Banking"
  Person(customer, "Customer", "A personal banking customer")
  System(banking, "Internet Banking System", "Allows customers to manage their accounts")
  System_Ext(mainframe, "Mainframe Banking", "Stores all core data")
  Rel(customer, banking, "Uses")
  Rel(banking, mainframe, "Gets data from")
```

**Output:**
```yaml
workspace:
  name: "System Context for Internet Banking"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person
      description: "A personal banking customer"
    - id: "banking"
      name: "Internet Banking System"
      type: system
      description: "Allows customers to manage their accounts"
    - id: "mainframe"
      name: "Mainframe Banking"
      type: system
      description: "Stores all core data"
      tags: ["external"]

  relationships:
    - id: "rel-1"
      from: "customer"
      to: "banking"
      label: "Uses"
      type: uses
    - id: "rel-2"
      from: "banking"
      to: "mainframe"
      label: "Gets data from"
      type: uses

views:
  - id: "context"
    name: "System Context for Internet Banking"
    type: c4-context
    include: ["customer", "banking", "mainframe"]
    layout:
      algorithm: layered
      direction: top-down
```

## Structurizr DSL example

**Input:**
```
workspace "Big Bank" {
  model {
    customer = person "Customer"
    banking = softwareSystem "Internet Banking" {
      spa = container "SPA" { technology "React" }
      api = container "API" { technology "Spring Boot" }
    }
    customer -> banking "Uses"
    spa -> api "Calls"
  }
}
```

**Output:**
```yaml
workspace:
  name: "Big Bank"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person
    - id: "spa"
      name: "SPA"
      type: application
      tech: "React"
    - id: "api"
      name: "API"
      type: application
      tech: "Spring Boot"

  relationships:
    - id: "rel-1"
      from: "customer"
      to: "spa"
      label: "Uses"
      type: uses
    - id: "rel-2"
      from: "spa"
      to: "api"
      label: "Calls"
      type: uses

views:
  - id: "containers"
    name: "Big Bank Containers"
    type: c4-container
    include: ["customer", "spa", "api"]
    layout:
      algorithm: layered
      direction: top-down
```
