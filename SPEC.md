# NeuroX — Engineering Specification

> **Quick links:** [CLAUDE.md](./CLAUDE.md) — AI coding context | [lib/openapi.js](./lib/openapi.js) — Live API spec | `/api-docs` — Swagger UI

---

## 1. Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, App Router, JavaScript (no TypeScript) |
| Database | Azure SQL via `mssql` — singleton pool in `lib/db.js` |
| Auth | JWT in HttpOnly cookie (`neurox_auth`) via `jose` — HOF in `lib/withAuth.js` |
| Validation | Zod v4 — all schemas in `lib/schemas.js`, helpers in `lib/validate.js` |
| Logging | `lib/logger.js` — never `console.*` in `app/api/` or `lib/` |
| Rate limiting | `lib/rateLimit.js` — 3 tiers (heavy / standard / light) |
| AI platform | Agent5i webhook — URL from `process.env.AGENT5I_WEBHOOK_URL` |
| API docs | OpenAPI 3.0 — `lib/openapi.js` → served at `/api/docs` → UI at `/api-docs` |

---

## 2. API Contract — How It Works

### The single source of truth

```
lib/openapi.js          ← EDIT THIS to update the contract
    ↓ (imported by)
app/api/docs/route.js   ← serves GET /api/docs as JSON
    ↓ (consumed by)
app/api-docs/page.js    ← renders live Swagger UI at /api-docs
```

### Rule: update the spec in the same commit as the route

Every time you **add**, **change**, or **remove** an API route, you **must** update `lib/openapi.js` in the same commit. The Swagger UI at `/api-docs` is generated live from that file — stale specs will be caught in code review.

### How to add a new endpoint to the spec

1. Open `lib/openapi.js`.
2. Add a new key under `paths` following the pattern of an existing endpoint.
3. If your endpoint has a new request or response body shape, add a schema under `components.schemas` and `$ref` it from the path.
4. Tag it with an existing tag (or add a new one to the `tags` array at the top).
5. Verify it appears correctly at `/api-docs` after `npm run dev`.

### Spec structure at a glance

```js
export const openApiSpec = {
  openapi: "3.0.3",
  info: { title, description, version },
  tags: [ /* grouped sections in the UI */ ],
  components: {
    securitySchemes: { cookieAuth: { ... } },
    schemas: {
      // Reusable request/response bodies
      MyRequestSchema: { type: "object", properties: { ... } },
    },
  },
  paths: {
    "/api/my-route": {
      post: {
        tags: ["My Tag"],
        summary: "Short title",
        description: "Full description with rate limit note if applicable",
        security: [{ cookieAuth: [] }],  // omit for public routes
        requestBody: { ... },
        responses: { 200: { ... }, 400: { ... }, 401: { ... } },
      },
    },
  },
};
```

---

## 3. Auth

### Session cookie

- Cookie name: `neurox_auth`
- Type: signed JWT (via `jose`)
- Storage: `HttpOnly; Secure; SameSite=Lax`
- Payload: `{ userId, name, email, role }`

### Public routes (no `withAuth`)

| Route | Method | Reason |
|-------|--------|--------|
| `/api/auth/login` | POST | Is the login itself |
| `/api/auth/signup` | POST | Registration endpoint |
| `/api/auth/me` | GET | Session probe |
| `/api/auth/me` | PUT | Self-update (uses `getUserFromRequest` internally) |
| `/api/auth/logout` | POST | Clears the cookie |
| `/api-docs` | GET | Developer tooling page |
| `/api/docs` | GET | Raw spec endpoint |

All other routes must use `export const METHOD = withAuth(...)`.

---

## 4. API Route Pattern

### Mandatory structure

```js
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";        // or validateQuery for GET
import { mySchema } from "@/lib/schemas";
import { getPool, sql } from "@/lib/db";
import logger from "@/lib/logger";
// AI routes only:
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";

export const POST = withAuth(async (request, _ctx, user) => {
  // 1. Validate input
  const { data, error: validationError } = await validateBody(request, mySchema);
  if (validationError) return validationError;

  // 2. Rate limit (AI routes only)
  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  // 3. Ownership check (before any user-data query)
  const pool = await getPool();
  const check = await pool.request()
    .input("id", sql.Int, data.id)
    .input("userId", sql.Int, Number(user.userId))
    .query(`SELECT id FROM tablename WHERE id = @id AND created_by = @userId`);
  if (!check.recordset.length) {
    return NextResponse.json(
      { success: false, error: { message: "Not found" } },
      { status: 404 }
    );
  }

  try {
    // 4. Business logic
    return NextResponse.json({ success: true, data: { ... } });
  } catch (error) {
    logger.error("POST /api/<feature> error", { error });
    return NextResponse.json(
      { success: false, error: { message: "Internal Server Error" } },
      { status: 500 }
    );
  }
});
```

---

## 5. Response Envelope

Every endpoint must return this shape — no exceptions:

```js
// 200 Success
{ "success": true, "data": { ... } }

// 400 Validation error (auto from validateBody)
{ "success": false, "error": { "message": "Validation failed", "details": [...] } }

// 401 Unauthorized
{ "success": false, "error": { "message": "Unauthorized" } }

// 404 Not found
{ "success": false, "error": { "message": "Not found" } }

// 429 Rate limited (auto from rateLimitedResponse)
{ "success": false, "error": { "message": "Too Many Requests" } }

// 500 Server error
{ "success": false, "error": { "message": "Internal Server Error" } }
```

---

## 6. Validation

### Zod schemas

All schemas live in `lib/schemas.js`. Never inline a schema in a route file.

```js
// lib/schemas.js
export const myFeatureSchema = z.object({
  projectId:   positiveInt,                                      // coerced from query params
  title:       z.string().min(1).max(150).trim(),
  description: z.string().max(10000).trim().optional().default(""),
  status:      z.enum(["draft", "active"]).default("draft"),
});
```

### Helper primitives

```js
positiveInt    = z.coerce.number().int().positive()   // IDs from query params
nonEmptyString = z.string().min(1).max(5000).trim()
```

### Usage

```js
// Request body (POST / PUT / PATCH)
const { data, error: validationError } = await validateBody(request, mySchema);
if (validationError) return validationError;  // returns 400 automatically

// Query params (GET / DELETE)
const { data, error: validationError } = validateQuery(request, myQuerySchema);
if (validationError) return validationError;
```

---

## 7. Database

### SQL — parameterized only

```js
// ✅ Always use .input() bindings
await pool.request()
  .input("userId", sql.Int, Number(user.userId))
  .input("title", sql.NVarChar(500), title)
  .query(`INSERT INTO tablename (user_id, title) VALUES (@userId, @title)`);

// ❌ Never interpolate
pool.query(`INSERT INTO tablename VALUES (${userId}, '${title}')`);
```

### SQL type map

| Type | SQL type |
|------|---------|
| IDs | `sql.Int` |
| Short text (≤500 chars) | `sql.NVarChar(500)` |
| Long text / JSON | `sql.NVarChar(sql.MAX)` |
| Booleans | `sql.Bit` |
| Dates | `sql.Date` or `sql.DateTime2` |

### DB tables

```
projectss       (project_id, project_name, description, client_name, start_date, end_date, domain, created_by, created_at)
personass       (persona_id, project_id, persona_name, persona_description, created_at)
intervieweess   (interviewee_id, persona_id, name, gender, age, location, relationship_status, title, education)
interviewss     (interview_id, interviewee_id, transcript, summary, persona_output, interview_outcome, created_at)
questionss      (question_id, interview_id, question_text)
userss          (user_id, name, email, password, role, created_at)
templatess      (template_id, template_name, phase, file_url, created_at)
```

All table names use the `ss` suffix — this is intentional, do not rename.

---

## 8. External Fetch — Always Timeout

```js
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(60_000),  // always required
});
```

| Timeout | Use for |
|---------|---------|
| 10 000 ms | Auth lookups, fast reads |
| 60 000 ms | Standard AI calls |
| 120 000 ms | Complex AI generation |
| 180 000 ms | Heavy generation (IA, process flow) |

---

## 9. Rate Limiting

| Limiter import | Limit | Routes |
|----------------|-------|--------|
| `aiHeavyLimiter` | 5 req/min | `/api/generate-persona-card`, `/api/generate-information-architecture`, `/api/generate-process-flow`, `/api/generate-app-build-prompt` |
| `aiStandardLimiter` | 15 req/min | `/api/generate-persona`, `/api/generate-questions` |
| `aiLightLimiter` | 30 req/min | `/api/enhance-persona`, `/api/analyze-wireframe`, `/api/description` |

Usage pattern:

```js
const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
if (limited) return rateLimitedResponse(retryAfterSec);
```

---

## 10. Logging

```js
import logger from "@/lib/logger";

logger.debug("trace",   { ctx });          // silent in production
logger.info("event",    { userId });       // significant business events
logger.warn("unusual",  { field });        // unexpected but non-fatal
logger.error("failed",  { error });        // always in catch blocks
```

Never use `console.log` / `console.error` / `console.warn` in `app/api/` or `lib/`.

---

## 11. Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Azure SQL connection string |
| `JWT_SECRET` | JWT signing key |
| `AGENT5I_WEBHOOK_URL` | Agent5i webhook base URL |
| `AGENT5I_USERNAME` | Agent5i auth username |
| `AGENT5I_PASSWORD` | Agent5i auth password |
| `AGENT5I_IA_AGENT_NAME` | IA agent name override |
| `AGENT5I_WIREFRAME_AGENT_NAME` | Wireframe agent name override |
| `AGENT5I_APP_PROMPT_AGENT_NAME` | App-build prompt agent name override |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container for templates |

Add all new env vars to `.env.example` immediately.

---

## 12. New Feature Checklist

Before raising a PR for any new or modified API route:

- [ ] `withAuth` wraps the handler (or route is explicitly public — see §3)
- [ ] Input validated via `validateBody` / `validateQuery` + schema added to `lib/schemas.js`
- [ ] Ownership check performed before any user-data query or mutation
- [ ] No `console.*` calls — use `logger`
- [ ] All SQL uses `.input()` parameterized bindings
- [ ] External `fetch` has `AbortSignal.timeout(...)`
- [ ] AI route has appropriate rate limiter tier
- [ ] No hardcoded credentials, tokens, or service URLs
- [ ] New env vars added to `.env.example`
- [ ] Response follows `{ success, data }` / `{ success, error }` envelope
- [ ] **`lib/openapi.js` updated** with the new/changed endpoint
- [ ] Verified spec renders correctly at `/api-docs`

---

## 13. API Endpoints — Quick Reference

> Full interactive spec: run `npm run dev` and open [http://localhost:3000/api-docs](http://localhost:3000/api-docs)  
> Raw JSON spec: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### Authentication (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → sets `neurox_auth` cookie |
| POST | `/api/auth/signup` | Create account |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update current user |
| POST | `/api/auth/logout` | Clear session cookie |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects (or `?projectId=` for one; `?recent=true&limit=6`) |
| POST | `/api/projects` | Create project (with optional persona array) |
| PUT | `/api/projects?projectId=` | Update project |
| DELETE | `/api/projects?projectId=` | Delete project (cascades) |
| GET | `/api/projects/[id]` | Get project + personas |
| PUT | `/api/projects/[id]` | Update project + sync personas |
| GET | `/api/projects/[id]/progress` | Get stage progress |
| PUT | `/api/projects/[id]/progress` | Update stage progress |

### Personas

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/personas?projectId=` | List personas (with optional flags) |
| PATCH | `/api/personas` | Update persona description |

### Interviewees

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/interviewees?personaId=` | List interviewees |
| POST | `/api/interviewees` | Create interviewee |
| DELETE | `/api/interviewees?intervieweeId=` | Delete interviewee |

### AI — Generation (rate-limited)

| Method | Path | Rate limit | Description |
|--------|------|------------|-------------|
| GET | `/api/generate-persona?interviewId=` | — | Get saved persona output |
| POST | `/api/generate-persona` | 15/min | Generate persona from transcript |
| GET | `/api/generate-questions?intervieweeId=` | — | Get question history |
| POST | `/api/generate-questions` | 15/min | Generate interview questions |
| POST | `/api/generate-persona-card` | 5/min | Generate structured persona card |
| POST | `/api/generate-information-architecture` | 5/min | Generate IA tree |
| POST | `/api/generate-process-flow` | 5/min | Generate process flow diagram |
| POST | `/api/generate-ux-journey` | 15/min | Generate UX journey map |
| POST | `/api/generate-app-build-prompt` | 5/min | Generate app-build prompt |

### AI — Enhancement

| Method | Path | Rate limit | Description |
|--------|------|------------|-------------|
| POST | `/api/enhance-persona` | 30/min | AI-enhance persona description |
| POST | `/api/analyze-wireframe` | 30/min | Analyze wireframe image (multipart) |
| POST | `/api/description` | 30/min | Generate research summary |

### Interviews

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/update-interview-summary` | Save interview summary |
| POST | `/api/update-persona-output` | Save persona output |
| GET | `/api/save-generated-persona?projectId=` | Get saved persona cards |
| POST | `/api/save-generated-persona` | Save persona cards |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stages` | Design thinking stages (static) |
| GET | `/api/users` | List users (or `?userId=`) |
| POST | `/api/users` | Create user (admin) |
| PUT | `/api/users` | Update user (admin) |
| GET | `/api/templates` | List templates (filterable) |
| GET | `/api/templates/download/[template_id]` | Download template file |
| GET | `/api/bookings` | Stub — returns `[]` |
| POST | `/api/bookings` | Stub — 501 |
| GET | `/api/documents` | Stub — returns `[]` |
| POST/DELETE | `/api/documents` | Stub — 501 |
| GET | `/api/experts` | Stub — returns `[]` |
