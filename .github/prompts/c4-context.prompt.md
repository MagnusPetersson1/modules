---
name: "C4 Context Diagram"
description: "Generate a C4 Level 1 System Context diagram in AML. Shows people, the primary system, and external systems it interacts with. Use this as the entry point for any architecture description."
argument-hint: "<system name and description, or paste existing context>"
mode: agent
---

Use the `/aml-diagram` skill to generate a **C4 Context diagram** (Level 1).

## What to include in a C4 Context diagram

- The **primary software system** being described (`type: system`)
- **Users and personas** who interact with it (`type: person`)
- **External systems** it depends on or integrates with (`type: system`, `tags: ["external"]`)
- **Key relationships** between all of the above
- One `c4-context` view that includes all elements

## What NOT to include

- Internal containers, databases, or components (those belong in a C4 Container diagram)
- Infrastructure or deployment details
- Implementation technology (unless it's the identity of an external system)

## Steps

1. If no argument provided, ask: what is the name of the system, who uses it, and what external systems does it integrate with?
2. Generate the AML with all elements and one `c4-context` view.
3. Add `tech` labels on external systems where the technology is known.
4. Tag external systems with `tags: ["external"]`.
5. Ask for a filename (default: `context.arch`) and save the file.
6. Remind the user to open it in the Visualizer.

## Example

```yaml
workspace:
  name: "Online Banking"

model:
  elements:
    - id: "customer"
      name: "Customer"
      type: person
      description: "Personal banking customer"
    - id: "banking-system"
      name: "Internet Banking System"
      type: system
      description: "Allows customers to manage their accounts online"
    - id: "mainframe"
      name: "Mainframe Banking System"
      type: system
      description: "Stores all core banking data"
      tags: ["external"]
    - id: "email-system"
      name: "Email System"
      type: system
      description: "Sends emails to customers"
      tags: ["external"]
      tech: "SendGrid"

  relationships:
    - id: "rel-1"
      from: "customer"
      to: "banking-system"
      label: "views account balances and makes payments using"
      type: uses
    - id: "rel-2"
      from: "banking-system"
      to: "mainframe"
      label: "gets account information from and makes payments using"
      type: uses
    - id: "rel-3"
      from: "banking-system"
      to: "email-system"
      label: "sends email using"
      type: uses
    - id: "rel-4"
      from: "email-system"
      to: "customer"
      label: "sends emails to"
      type: uses

views:
  - id: "context"
    name: "System Context"
    type: c4-context
    include: ["customer", "banking-system", "mainframe", "email-system"]
    layout:
      algorithm: layered
      direction: top-down
```
