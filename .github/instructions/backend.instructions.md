---
applyTo: "modules/*/backend/**"
---

# Backend Module Instructions

- Use **.NET Core** (C#) with minimal API style (`Program.cs` with `WebApplication.CreateBuilder`)
- Controllers go in `Controllers/`, models/DTOs in `Models/`
- CORS must be explicitly configured to allow the frontend origin (configured via `appsettings.json`)
- Use `appsettings.json` + `appsettings.Development.json` for environment config — never hardcode values
- No shared code with frontend or other modules — define its own DTOs/contracts
- Return `ProblemDetails` for error responses

## Tests

- Use **xUnit** for unit and integration tests; test project lives in `Tests/` inside the backend folder
- Name test classes `<Subject>Tests` (e.g., `StatusControllerTests`)
- Run with `dotnet test`
- Cover controller actions and any non-trivial service/logic classes

## Documentation

- Each module has `docs/index.md` with a brief description of the backend API (endpoints, inputs, outputs) written for end users or integrators
