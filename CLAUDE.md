# NeuroX — AI Coding Context

> This file is automatically loaded by Claude Code at the start of every session.
> GitHub Copilot users: paste this into `.github/copilot-instructions.md` as well.
> Full standards document: `SPEC.md`
> Live API docs: run `npm run dev` → open `/api-docs` | Raw JSON spec: `/api/docs`

---

## Stack

- **Framework:** Next.js 15, App Router, JavaScript (no TypeScript)
- **Database:** Azure SQL via `mssql` — singleton pool in `lib/db.js`
- **Auth:** JWT in HttpOnly cookie (`jose`) — HOF in `lib/withAuth.js`
- **Validation:** Zod v4 — all schemas in `lib/schemas.js`, helpers in `lib/validate.js`
- **Logging:** `lib/logger.js` — never `console.*` in `app/api/` or `lib/`
- **Rate limiting:** `lib/rateLimit.js` — 3 tiers (heavy/standard/light)
- **AI platform:** Agent5i webhook — URL from `process.env.AGENT5I_WEBHOOK_URL`
- **API docs:** OpenAPI 3.0 spec in `lib/openapi.js` → served at `/api/docs` → Swagger UI at `/api-docs`

---

## Mandatory Patterns

### Every API Route

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
  // 1. Validate
  const { data, error: validationError } = await validateBody(request, mySchema);
  if (validationError) return validationError;

  // 2. Rate limit (AI routes only)
  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  // 3. Ownership check (before any user-data DB query)
  const pool = await getPool();
  const check = await pool.request()
    .input("id", sql.Int, data.id)
    .input("userId", sql.Int, Number(user.userId))
    .query(`SELECT id FROM tablename WHERE id = @id AND created_by = @userId`);
  if (!check.recordset.length) {
    return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });
  }

  try {
    // 4. Business logic
    return NextResponse.json({ success: true, data: { ... } });
  } catch (error) {
    logger.error("POST /api/<feature> error", { error });
    return NextResponse.json({ success: false, error: { message: "Internal Server Error" } }, { status: 500 });
  }
});
```

### Zod Schemas — Always in `lib/schemas.js`

```js
export const positiveInt = z.coerce.number().int().positive();   // use for IDs from query params
export const nonEmptyString = z.string().min(1).max(5000).trim();

export const myFeatureSchema = z.object({
  projectId:   positiveInt,
  title:       nonEmptyString,
  description: z.string().max(10000).trim().optional().default(""),
  status:      z.enum(["draft", "active"]).default("draft"),
});
```

### SQL — Parameterized Only

```js
// ✅ Always
pool.request()
  .input("userId", sql.Int, Number(user.userId))
  .input("title", sql.NVarChar(500), title)
  .query(`INSERT INTO tablename (user_id, title) VALUES (@userId, @title)`)

// ❌ Never
pool.query(`INSERT INTO tablename VALUES (${userId}, '${title}')`)
```

SQL type map: `sql.Int` for IDs | `sql.NVarChar(500)` for short text | `sql.NVarChar(sql.MAX)` for long text/JSON | `sql.Bit` for booleans | `sql.DateTime2` for dates

### External Fetch — Always Timeout

```js
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(60_000),  // always
});
```

Timeout guide: 10s = auth/lookups | 60s = standard AI | 120s = complex AI | 180s = heavy generation

### Logger

```js
import logger from "@/lib/logger";
logger.debug("trace", { ctx });   // silent in production
logger.info("event", { userId }); // significant business events
logger.warn("unusual", { field });
logger.error("failed", { error }); // always in catch blocks
```

### Rate Limiter Tiers

| Import | Limit | Use For |
|--------|-------|---------|
| `aiHeavyLimiter` | 5/min | Persona gen, IA gen, heavy agents |
| `aiStandardLimiter` | 15/min | Questions, process flows, summaries |
| `aiLightLimiter` | 30/min | Wireframe, short enhancements |

---

## Hard Rules

1. **Never** `console.log` / `console.error` in `app/api/` or `lib/` — use `logger`
2. **Never** string-interpolate user input into SQL
3. **Never** hardcode credentials, tokens, or service URLs — use `process.env`
4. **Never** use `export async function GET/POST` — always `export const GET = withAuth(...)`
5. **Never** call `request.json()` directly — always `validateBody(request, schema)`
6. **Never** skip ownership check on user-owned data
7. **Always** add `signal: AbortSignal.timeout(...)` to external fetch
8. **Always** rate limit any route that calls an external AI service
9. **Always** put new Zod schemas in `lib/schemas.js`
10. **Always** return `{ success: true, data: {...} }` or `{ success: false, error: { message } }`
11. **Always** update `lib/openapi.js` in the same commit when adding, changing, or removing an API route

---

## Auth — What Is and Is Not Public

| Route | Auth Required |
|-------|--------------|
| `POST /api/auth/login` | ❌ Public (it IS the login) |
| `POST /api/auth/signup` | ❌ Public |
| `GET /api/auth/me` | ❌ Public (session probe — uses getUserFromRequest internally) |
| `POST /api/auth/logout` | ❌ Public |
| Everything else | ✅ withAuth required |

The `user` object from `withAuth`: `{ userId, name, email, role, createdAt }`

---

## `lib/withAuth.js` Signature

```js
// HOF — wraps any Next.js route handler
// Third argument receives the verified JWT payload
export function withAuth(handler) {
  return async (request, ctx) => {
    // verifies JWT from HttpOnly cookie
    // returns 401 if invalid/missing
    // calls handler(request, ctx, user) if valid
  };
}
```

---

## Project DB Tables (reference)

```
projectss       (project_id, title, description, company, end_date, created_by, created_at)
personass       (persona_id, project_id, persona_name, description, output, created_at)
intervieweess   (interviewee_id, persona_id, name, email)
interviewss     (interview_id, interviewee_id, transcript, summary, persona_output, created_at)
questionss      (question_id, interview_id, question_text)
userss          (user_id, name, email, password_hash, role, created_at)
```

All tables use `ss` suffix (plural convention in this project — don't change it).

---

## Response Shape — Always This

```js
// Success
{ success: true, data: { ... } }

// Error  
{ success: false, error: { message: "Human readable message" } }

// Validation error (auto from validateBody)
{ success: false, error: { message: "Validation failed", details: [...] } }  // status 400

// Not found
{ success: false, error: { message: "Not found" } }  // status 404

// Rate limited (auto from rateLimitedResponse)  
{ success: false, error: { message: "Too Many Requests" } }  // status 429
```

---

## When Adding a New Feature — Checklist

Before submitting any AI-generated code for review:

- [ ] `withAuth` wraps the handler
- [ ] Input validated via `validateBody` / `validateQuery` + schema in `lib/schemas.js`
- [ ] Ownership check before user-data query/mutation
- [ ] No `console.*` calls
- [ ] All SQL uses `.input()` bindings
- [ ] External fetch has `AbortSignal.timeout`
- [ ] AI route has rate limiter
- [ ] No hardcoded credentials/URLs
- [ ] New env vars added to `.env.example`
- [ ] Response follows `{ success, data }` / `{ success, error }` shape
- [ ] **`lib/openapi.js` updated** with the new/modified endpoint
- [ ] Verified at `/api-docs` after `npm run dev`

Full standards: read `SPEC.md`

---

## API Contract — `lib/openapi.js`

The OpenAPI 3.0 spec lives entirely in `lib/openapi.js`. It is the **single source of truth** for every API contract.

```
lib/openapi.js          ← EDIT HERE to update the contract
app/api/docs/route.js   ← DO NOT EDIT (serves the spec as JSON at /api/docs)
app/api-docs/page.js    ← DO NOT EDIT (renders Swagger UI at /api-docs)
```

### Adding a new endpoint to the spec

1. Add a new path entry under `paths` in `lib/openapi.js`
2. Add request/response schemas under `components.schemas` if needed
3. Reference them with `{ $ref: "#/components/schemas/MySchema" }`
4. Tag it under `tags` (add a new tag to the array if needed)
5. Set `security: [{ cookieAuth: [] }]` for protected routes; `security: []` for public ones

### Minimal example

```js
// In lib/openapi.js → paths:
"/api/my-feature": {
  post: {
    tags: ["My Tag"],
    summary: "Do the thing",
    description: "**Rate limit: 15 req/min (Standard AI).**  Explain what it does.",
    security: [{ cookieAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/MyFeatureRequest" },
        },
      },
    },
    responses: {
      200: { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } } },
      400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
      401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
      429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
    },
  },
},
```
