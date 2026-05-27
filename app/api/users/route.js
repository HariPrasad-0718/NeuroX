import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { createUserAdminSchema, updateUserAdminSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

// GET /api/users — Fetch all users (admin-level; scoped to manager role in future)
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const pool = await getPool();

    if (userId) {
      const result = await pool
        .request()
        .input("userId", sql.Int, Number(userId))
        .query("SELECT user_id, name, email, role, created_at FROM userss WHERE user_id = @userId");

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: "User not found" } },
          { status: 404 }
        );
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
    }

    const result = await pool
      .request()
      .query("SELECT user_id, name, email, role, created_at FROM userss ORDER BY created_at DESC");

    const users = result.recordset.map((user) => ({
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    logger.error("GET /api/users error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// POST /api/users — Create a new user
export const POST = withAuth(async (request) => {
  const { data, error: validationError } = await validateBody(request, createUserAdminSchema);
  if (validationError) return validationError;

  const { name, email, role } = data;

  try {
    const pool = await getPool();

    const created = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query(
        `INSERT INTO userss (name, email, password, role)
         OUTPUT INSERTED.user_id
         VALUES (@name, @email, '', @role)`
      );

    const createdUserId = created.recordset[0]?.user_id;

    return NextResponse.json({
      success: true,
      data: { userId: createdUserId, name, email, role },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// PUT /api/users — Update a user
export const PUT = withAuth(async (request) => {
  const { data, error: validationError } = await validateBody(request, updateUserAdminSchema);
  if (validationError) return validationError;

  const { userId, name, email, role } = data;

  try {
    const pool = await getPool();

    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query(
        `UPDATE userss SET name = @name, email = @email, role = @role
         WHERE user_id = @userId`
      );

    return NextResponse.json({
      success: true,
      data: { userId, name, email, role },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
