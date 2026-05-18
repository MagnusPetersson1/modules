---
name: "Sequence Diagram"
description: "Generate a sequence diagram in AML. Shows time-ordered interactions between participants. Supports sync/async calls, return arrows, fragments (alt/loop/par/opt), and nested steps."
argument-hint: "<describe the flow, or paste existing steps>"
mode: agent
---

Use the `/aml-diagram` skill to generate a **sequence diagram**.

## When to use a sequence diagram

- API call chains and request/response flows
- Authentication and authorization flows (OAuth, JWT, SSO)
- Checkout / payment / order flows
- Event-driven and async messaging flows
- Any time-ordered interaction you want to communicate precisely

## Steps

1. If no argument provided, ask: who are the participants and what are the key steps in the flow?
2. Define all participants as elements in `model` (can be `person`, `application`, `service`, `database`, etc.).
3. Build the `sequence` view with a `participants` list (controls left-to-right order) and `steps`.
4. Use `type: return` for response arrows flowing back to the caller.
5. Wrap conditional or looping logic in `fragment` blocks.
6. Ask for a filename (default: `sequence.arch`) and save.

## Step types

| type | use |
|---|---|
| `sync` | Synchronous call (solid arrow) — default |
| `async` | Async message / fire-and-forget (dashed arrow) |
| `return` | Response value (dashed arrow, flows back) |
| `create` | Instantiate a new participant |
| `destroy` | Terminate a participant |

## Fragment types

| fragment | use |
|---|---|
| `alt` | Conditional — one of several branches |
| `loop` | Repeated block |
| `par` | Parallel execution |
| `opt` | Optional block (executed if condition true) |

## Example — OAuth 2.0 Authorization Code Flow

```yaml
workspace:
  name: "OAuth 2.0 Authorization Code Flow"

model:
  elements:
    - id: "user"
      name: "User"
      type: person
    - id: "browser"
      name: "Browser"
      type: application
      tech: "SPA"
    - id: "auth-server"
      name: "Authorization Server"
      type: service
      tech: "Keycloak"
    - id: "api"
      name: "Resource API"
      type: service
      tech: "ASP.NET Core"

views:
  - id: "oauth-flow"
    name: "OAuth 2.0 Auth Code Flow"
    type: sequence
    participants: ["user", "browser", "auth-server", "api"]
    steps:
      - from: "user"
        to: "browser"
        label: "click Login"
        type: sync
      - from: "browser"
        to: "auth-server"
        label: "GET /authorize?response_type=code&client_id=..."
        type: sync
      - from: "auth-server"
        to: "browser"
        label: "302 redirect to login page"
        type: return
      - from: "user"
        to: "auth-server"
        label: "submit credentials"
        type: sync
      - fragment: alt
        condition: "credentials valid"
        steps:
          - from: "auth-server"
            to: "browser"
            label: "302 redirect with ?code=..."
            type: return
          - from: "browser"
            to: "api"
            label: "POST /callback with code"
            type: sync
          - from: "api"
            to: "auth-server"
            label: "POST /token (code + secret)"
            type: sync
          - from: "auth-server"
            to: "api"
            label: "access_token + refresh_token"
            type: return
          - from: "api"
            to: "browser"
            label: "set-cookie: session"
            type: return
```

## Example — API Request with Retry

```yaml
workspace:
  name: "Resilient API Call"

model:
  elements:
    - id: "client"
      name: "Client"
      type: application
    - id: "gateway"
      name: "API Gateway"
      type: service
    - id: "upstream"
      name: "Upstream Service"
      type: service

views:
  - id: "retry-flow"
    name: "API Call with Retry"
    type: sequence
    participants: ["client", "gateway", "upstream"]
    steps:
      - from: "client"
        to: "gateway"
        label: "GET /resource"
        type: sync
      - fragment: loop
        condition: "attempts < 3"
        steps:
          - from: "gateway"
            to: "upstream"
            label: "forward request"
            type: sync
          - fragment: alt
            condition: "success"
            steps:
              - from: "upstream"
                to: "gateway"
                label: "200 OK"
                type: return
              - from: "gateway"
                to: "client"
                label: "200 OK"
                type: return
```
