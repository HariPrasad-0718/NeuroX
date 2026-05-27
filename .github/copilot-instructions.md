# NeuroX — GitHub Copilot Instructions

This is a Next.js 15 App Router project called NeuroX (Design Thinking Platform).
Full standards are in `SPEC.md`. Full AI context is in `CLAUDE.md`. Read both.

> **API contract:** `lib/openapi.js` is the OpenAPI 3.0 spec. Update it whenever you add or change a route. Live UI at `/api-docs`.

---

## Critical Rules (Copilot must follow these)

### API Routes — Required Structure

Every route handler must:
1. Use `withAuth` from `@/lib/withAuth` — NOT `export async function`
2. Validate input with `validateBody(request, schema)` from `@/lib/validate` using a Zod schema from `@/lib/schemas`
3. Use `logger` from `@/lib/logger` — NEVER `console.log` or `console.error`
4. Use parameterized SQL only — `.input("name", sql.Type, value).query(...)` — NEVER string interpolation
5. Check ownership before any DB query on user-owned data: `AND created_by = @userId`
6. Add `signal: AbortSignal.timeout(60_000)` to every `fetch()` call
7. Add rate limiting from `@/lib/rateLimit` on any route that calls an AI service

### Never Generate

```js
// Never - use withAuth instead
export async function POST(request) {}

// Never - use validateBody instead
const body = await request.json();

// Never - use logger instead
console.log("debug:", data);
console.error("Error:", err);

// Never - use .input() instead
`SELECT * FROM table WHERE id = ${id}`

// Never - use process.env
const url = "https://agent5idev.c5ailabs.com/api/...";
const pass = "hardcoded_password";
```

### API Contract — MUST update lib/openapi.js

**Every new or changed route must have a matching entry in `lib/openapi.js`.**

```js
// Minimal OpenAPI path entry (add to the `paths` section in lib/openapi.js)
"/api/my-feature": {
  post: {
    tags: ["My Tag"],
    summary: "Short description",
    description: "Full explanation. Rate limit if applicable.",
    security: [{ cookieAuth: [] }],  // omit for public routes
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
    },
  },
},
```

Add new request/response shapes under `components.schemas` and `$ref` them.
Verify the spec renders at `/api-docs` after `npm run dev`.

### Always Generate

```js
// Route pattern
export const POST = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = await validateBody(request, mySchema);
  if (validationError) return validationError;
  // ...
  try {
    // business logic
    return NextResponse.json({ success: true, data: { ... } });
  } catch (error) {
    logger.error("POST /api/<route> error", { error });
    return NextResponse.json({ success: false, error: { message: "Internal Server Error" } }, { status: 500 });
  }
});

// SQL pattern
const result = await pool.request()
  .input("userId", sql.Int, Number(user.userId))
  .input("value", sql.NVarChar(500), value)
  .query(`SELECT ... WHERE created_by = @userId AND col = @value`);

// External fetch pattern
const res = await fetch(process.env.SOME_URL || "https://fallback.com/path", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(60_000),
});
```

---

## Response Shape (always this format)

```js
{ success: true, data: { ... } }          // 200 OK
{ success: false, error: { message } }    // 400 / 404 / 500
```

## User Object (from withAuth)

```js
user.userId   // number
user.name     // string
user.email    // string
user.role     // string
```

## DB Tables

```
projectss, personass, intervieweess, interviewss, questionss, userss
```
(All use `ss` suffix — this is intentional, don't rename)

## Zod Helpers (in lib/schemas.js)

```js
positiveInt     = z.coerce.number().int().positive()
nonEmptyString  = z.string().min(1).max(5000).trim()
```

## Rate Limiter Tiers

```js
aiHeavyLimiter    // 5/min  — heavy AI (persona gen, IA)
aiStandardLimiter // 15/min — standard AI (questions, flows)
aiLightLimiter    // 30/min — light AI (wireframe, enhance)
```

## Auth Routes That Are Intentionally Public (no withAuth)

`/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/me`, `/api/docs`, `/api-docs`

---

## New Route Checklist

Before finalising any new route:
- [ ] `withAuth` wraps the handler (or route is explicitly public)
- [ ] Schema added to `lib/schemas.js`, input validated via `validateBody` / `validateQuery`
- [ ] Ownership check before any user-data query
- [ ] `logger` used — no `console.*`
- [ ] SQL uses `.input()` parameterized bindings only
- [ ] External `fetch` has `AbortSignal.timeout(...)`
- [ ] AI route has rate limiter (`aiHeavyLimiter` / `aiStandardLimiter` / `aiLightLimiter`)
- [ ] No hardcoded credentials or URLs
- [ ] New env vars added to `.env.example`
- [ ] Response shape: `{ success, data }` or `{ success, error: { message } }`
- [ ] **`lib/openapi.js` updated** with the new endpoint
- [ ] Verified at `/api-docs` after `npm run dev`
