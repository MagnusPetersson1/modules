---
applyTo: "modules/*/frontend/**"
---

# Frontend Module Instructions

- Use **React 18** with **TypeScript** and **Vite**
- All components are function components with hooks — no class components
- File naming: `PascalCase` for components (`DataTable.tsx`), `camelCase` for utilities (`formatBytes.ts`)
- Co-locate styles with components using CSS Modules (`DataTable.module.css`)
- API base URL must come from `import.meta.env.VITE_API_BASE_URL` — never hardcode ports or hosts
- No shared code with backend or other modules — duplicate types if needed

## Tests

- Use **Vitest** + **React Testing Library** for unit and component tests
- Test files live in `src/__tests__/` alongside the code they cover, named `<Component>.test.tsx`
- Run with `npm test`
- Cover happy path + key edge cases; avoid testing implementation details

## Documentation

- Each module has `docs/index.md` with a brief description, screenshots/GIFs if relevant, and usage instructions for end users (not developers)
