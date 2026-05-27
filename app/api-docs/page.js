import SwaggerUIWrapper from "./SwaggerUI";

export const metadata = {
  title: "NeuroX API Docs",
  description: "OpenAPI 3.0 interactive documentation for the NeuroX platform.",
};

/**
 * /api-docs — Live Swagger UI for the NeuroX API.
 *
 * The spec is served from /api/docs (see app/api/docs/route.js).
 * To update the API contract, edit lib/openapi.js.
 *
 * This page is intentionally NOT protected by withAuth so developers
 * can browse the spec without logging in. Do NOT expose internal
 * secrets or credentials in the spec.
 */
export default function ApiDocsPage() {
  const specUrl = "/api/docs";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fafafa",
      }}
    >
      {/* Header banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "3px solid #e94560",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.3px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            NeuroX API
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#94a3b8",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            OpenAPI 3.0 — Interactive Documentation
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              background: "#22c55e",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "999px",
              fontFamily: "monospace",
            }}
          >
            v1.0.0
          </span>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#cbd5e1",
              fontSize: "12px",
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: "6px",
              textDecoration: "none",
              fontFamily: "system-ui, -apple-system, sans-serif",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Raw JSON ↗
          </a>
        </div>
      </div>

      {/* Swagger UI */}
      <div style={{ padding: "0" }}>
        <SwaggerUIWrapper url={specUrl} />
      </div>

      {/* Footer note */}
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "16px 32px",
          fontSize: "12px",
          color: "#94a3b8",
          background: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        Spec source: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>lib/openapi.js</code>
        &nbsp;— Update this file when adding or changing API routes. See <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>SPEC.md</code> for the full API contract guidelines.
      </div>
    </main>
  );
}
