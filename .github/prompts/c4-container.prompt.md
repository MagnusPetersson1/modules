---
name: "C4 Container Diagram"
description: "Generate a C4 Level 2 Container diagram in AML. Zooms into a software system to show its applications, databases, and services. Use after a C4 Context diagram exists."
argument-hint: "<system name, its containers, and how they connect>"
mode: agent
---

Use the `/aml-diagram` skill to generate a **C4 Container diagram** (Level 2).

## What to include in a C4 Container diagram

- The **containers** inside the primary system: web apps, APIs, databases, message queues, etc.
  - Web/mobile apps → `type: application`
  - APIs, services → `type: application` or `type: service`
  - Databases, stores → `type: database`
  - Message queues → `type: service`, `tags: ["queue"]`
- **Users** (persons) that interact with containers directly
- **External systems** at the boundary (summarised, not decomposed)
- A `c4-container` view

## What NOT to include

- Code-level components (those belong in a C4 Component diagram)
- Internal implementation details of containers

## Technology labels

Always add `tech` labels — they're the primary value of a container diagram:
- `tech: "React 18"`
- `tech: "ASP.NET Core 9"`
- `tech: "PostgreSQL 16"`
- `tech: "Redis"`

## Steps

1. If no argument provided, ask: what system are we zooming into, what containers does it have (list apps, APIs, DBs), and what technology does each use?
2. Generate AML. Include the primary system's containers as elements.
3. External systems appear as `type: system` with `tags: ["external"]` — do NOT decompose them.
4. Ask for a filename (default: `containers.arch`) and save.
5. Remind the user to open it in the Visualizer.

## Example

```yaml
workspace:
  name: "Internet Banking — Containers"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person
      description: "Personal banking customer"
    - id: "web-app"
      name: "Web Application"
      type: application
      description: "Delivers the SPA to the customer's browser"
      tech: "ASP.NET Core + React"
    - id: "spa"
      name: "Single-Page App"
      type: application
      description: "Provides banking functionality in the browser"
      tech: "React 18"
    - id: "api"
      name: "API Application"
      type: application
      description: "Provides banking functionality via REST API"
      tech: "ASP.NET Core 9"
    - id: "db"
      name: "Database"
      type: database
      description: "Stores user accounts, transactions"
      tech: "PostgreSQL 16"
    - id: "mainframe"
      name: "Mainframe Banking System"
      type: system
      description: "Stores all core banking data"
      tags: ["external"]

  relationships:
    - id: "rel-1"
      from: "customer"
      to: "web-app"
      label: "visits"
      type: uses
    - id: "rel-2"
      from: "web-app"
      to: "spa"
      label: "delivers"
      type: uses
    - id: "rel-3"
      from: "spa"
      to: "api"
      label: "calls"
      type: uses
    - id: "rel-4"
      from: "api"
      to: "db"
      label: "reads/writes"
      type: uses
    - id: "rel-5"
      from: "api"
      to: "mainframe"
      label: "calls"
      type: uses

views:
  - id: "containers"
    name: "Container View"
    type: c4-container
    include: ["customer", "web-app", "spa", "api", "db", "mainframe"]
    layout:
      algorithm: layered
      direction: top-down
```
