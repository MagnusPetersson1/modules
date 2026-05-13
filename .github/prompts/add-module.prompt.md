---
name: "Add Module"
description: "Scaffold a new self-contained module. Prompts for name and purpose, then generates the full frontend + backend structure."
argument-hint: "<module-name> — name of the new module (kebab-case)"
agent: agent
---

Scaffold a new module in this repository following the conventions in [AGENTS.md](../../AGENTS.md).

**Steps:**
1. If no argument was provided, ask the user for the module name (kebab-case) and a one-line description of its purpose.
2. Use the `/new-module` skill to generate the full `modules/<name>/frontend/` and `modules/<name>/backend/` structure.
3. After scaffolding, list the created files and remind the user to run:
   - `cd modules/<name>/frontend && npm install`
   - `cd modules/<name>/backend && dotnet run`
