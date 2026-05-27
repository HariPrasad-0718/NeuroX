import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Higher-order function that wraps a Next.js App Router route handler
 * with JWT cookie authentication.
 *
 * Usage:
 *   export const GET = withAuth(async (request, context, user) => { ... });
 *   export const POST = withAuth(async (request, context, user) => { ... });
 *
 * The authenticated user object is passed as the third argument:
 *   { userId: number, email: string, name: string, role: string }
 *
 * Returns 401 Unauthorized if no valid session cookie is present.
 */
export function withAuth(handler) {
  return async function (request, context) {
    const user = await getUserFromRequest(request);

    if (!user?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    return handler(request, context, user);
  };
}
