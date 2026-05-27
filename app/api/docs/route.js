import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

/**
 * GET /api/docs
 * Serves the OpenAPI 3.0 specification as JSON.
 * Used by the Swagger UI at /api-docs.
 *
 * MAINTAINERS: Do not modify this file.
 * To update the API contract, edit lib/openapi.js instead.
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      // Allow the Swagger UI page (same origin) to fetch this
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
