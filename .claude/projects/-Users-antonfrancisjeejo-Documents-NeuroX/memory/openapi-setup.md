---
name: openapi-setup
description: Swagger/OpenAPI 3.0 documentation setup for NeuroX — how it works and where the spec lives
metadata:
  type: project
---

OpenAPI 3.0 spec is the single source of truth for all API contracts.

- **Spec file:** `lib/openapi.js` — edit this to add/change endpoints
- **JSON endpoint:** `GET /api/docs` (served by `app/api/docs/route.js`)
- **Swagger UI:** `/api-docs` (rendered by `app/api-docs/page.js` + `SwaggerUI.js`)
- **Package:** `swagger-ui-react` installed

The spec has 29 paths, 34 schemas, 13 tag groups. All `$ref`s validated.

**Rule baked into CLAUDE.md, SPEC.md, and `.github/copilot-instructions.md`:** every new/changed API route must update `lib/openapi.js` in the same commit and be verified at `/api-docs`.

**Why:** ensures devs always have an up-to-date interactive contract without manual doc maintenance.
**How to apply:** when writing or reviewing an API route, always check that `lib/openapi.js` has the matching path entry.
