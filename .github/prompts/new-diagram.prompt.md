---
name: "New Architecture Diagram"
description: "Generate a new AML diagram file from a plain-English description or by converting Mermaid C4 / Structurizr DSL. Creates a ready-to-open .arch file for the Visualizer module."
argument-hint: "<description or paste Mermaid/Structurizr DSL>"
mode: agent
---

Use the `/aml-diagram` skill to generate an AML diagram.

**Steps:**
1. If no argument was given, ask the user: what system or architecture do they want to diagram, and what type of view (C4 context, C4 container, sequence, etc.)?
2. If the user pastes Mermaid or Structurizr DSL, convert it to AML using the conversion tables in the skill.
3. Generate the complete AML YAML.
4. Ask the user for a filename (default: `architecture.arch`), then save the file to the workspace root or the location they specify.
5. Remind the user to open the file in the Visualizer to see the rendered diagram.
