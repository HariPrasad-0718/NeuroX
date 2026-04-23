import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

function errorResponse(message, status = 500) {
  return NextResponse.json(
    {
      success: false,
      error: { message },
    },
    { status }
  );
}

export async function GET(request) {
  try {
    const sessionUser = await getUserFromRequest(request);

    if (!sessionUser?.userId) {
      return errorResponse("Unauthorized", 401);
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, Number(sessionUser.userId))
      .query(
        `SELECT user_id, name, email, role, created_at
         FROM userss
         WHERE user_id = @userId`
      );

    if (!result.recordset || result.recordset.length === 0) {
      return errorResponse("User not found", 404);
    }

    const user = result.recordset[0];

    return NextResponse.json({
      success: true,
      data: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return errorResponse(
      error?.message || "Internal server error while fetching user",
      500
    );
  }
}

export async function PUT(request) {
  try {
    const sessionUser = await getUserFromRequest(request);

    if (!sessionUser?.userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return errorResponse("Invalid JSON payload", 400);
    }

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "").trim().toLowerCase();

    if (!name || !email || !["designer", "manager"].includes(role)) {
      return errorResponse("Invalid update payload", 400);
    }

    const pool = await getPool();

    const duplicate = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("userId", sql.Int, Number(sessionUser.userId))
      .query(
        `SELECT user_id
         FROM userss
         WHERE email = @email AND user_id <> @userId`
      );

    if (duplicate.recordset.length > 0) {
      return errorResponse("Email already exists", 409);
    }

    const updated = await pool
      .request()
      .input("userId", sql.Int, Number(sessionUser.userId))
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query(
        `UPDATE userss
         SET name = @name, email = @email, role = @role
         OUTPUT INSERTED.user_id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.created_at
         WHERE user_id = @userId`
      );

    if (!updated.recordset || updated.recordset.length === 0) {
      return errorResponse("User not found", 404);
    }

    const user = updated.recordset[0];

    return NextResponse.json({
      success: true,
      data: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("PUT /api/auth/me error:", error);
    return errorResponse(
      error?.message || "Internal server error while updating user",
      500
    );
  }
}
