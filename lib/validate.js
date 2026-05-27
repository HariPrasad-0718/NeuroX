import { NextResponse } from "next/server";

/**
 * validateBody — parse and validate a JSON request body against a Zod schema.
 *
 * Returns { data } on success or { error: NextResponse } on failure.
 * The caller should check `if (result.error) return result.error` immediately.
 *
 * Usage:
 *   const { data, error } = await validateBody(request, mySchema);
 *   if (error) return error;
 *   // data is fully typed and coerced
 */
export async function validateBody(request, schema) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: { message: "Invalid JSON body" } },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation failed",
            fields: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}

/**
 * validateQuery — validate URL search params against a Zod schema.
 *
 * Usage:
 *   const { data, error } = validateQuery(request, mySchema);
 *   if (error) return error;
 */
export function validateQuery(request, schema) {
  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());

  const result = schema.safeParse(raw);

  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            message: "Invalid query parameters",
            fields: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}
