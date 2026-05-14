---
name: "Edit Architecture Diagram"
description: "Add, remove, or modify elements, relationships, views, or styles in an existing .arch AML file. Use when the user says 'add X', 'connect X to Y', 'create a sequence view', 'style the database node', etc."
argument-hint: "<what to change in the diagram>"
mode: agent
---

Use the `/aml-diagram` skill to modify the currently open or specified `.arch` file.

**Steps:**
1. Read the current `.arch` file content.
2. Understand the requested change:
   - **Add element**: append to `model.elements`, add to relevant `views[].include`
   - **Add relationship**: append to `model.relationships` with a unique `id`
   - **Add view**: append to `views`
   - **Style change**: update `views[].styles.elements[id]` or `views[].styles.relationships[id]`
   - **Remove element**: remove from `model.elements`, all relationships referencing it, and all `views[].include` lists
3. Apply the minimal change — do not restructure or reformat unchanged sections.
4. Output the complete updated AML file.
5. Save it back to the same file path.
