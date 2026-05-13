---
name: new-module
description: "Scaffold a new self-contained module under modules/<name>/. Use when creating a new data conversion, visualization, or analysis module. Generates frontend (React + TypeScript + Vite) and backend (.NET Core) with correct structure and wiring."
argument-hint: "<module-name> [description]"
---

# New Module Scaffold

Creates a complete, portable module under `modules/<name>/` following the conventions in [AGENTS.md](../../../AGENTS.md).

## Procedure

1. **Determine the module name** from the argument (kebab-case). Ask if not provided.
2. **Scaffold frontend** under `modules/<name>/frontend/`:
   - Use the [frontend template](./assets/frontend/) as the base
   - Replace all `{{MODULE_NAME}}` and `{{MODULE_TITLE}}` placeholders
3. **Scaffold backend** under `modules/<name>/backend/`:
   - Use the [backend template](./assets/backend/) as the base
   - Replace all `{{MODULE_NAME}}` and `{{MODULE_TITLE}}` placeholders
4. **Create docs** at `modules/<name>/docs/index.md`:
   - Use the [docs template](./assets/docs/index.md) as the base
   - Replace `{{MODULE_TITLE}}` and `{{MODULE_DESCRIPTION}}` placeholders
5. **Verify** the module can run in isolation:
   - `cd modules/<name>/frontend && npm install && npm run dev`
   - `cd modules/<name>/backend && dotnet run`

## Module Portability Checklist

- [ ] No imports from outside `modules/<name>/`
- [ ] Frontend reads API URL from `VITE_API_BASE_URL` env var
- [ ] Backend CORS origin is configured via `appsettings.json`
- [ ] Module has its own `package.json` and `.csproj`
- [ ] Frontend tests in `frontend/src/__tests__/` (Vitest)
- [ ] Backend tests in `backend/Tests/` (xUnit)
- [ ] `docs/index.md` describes the module for end users
