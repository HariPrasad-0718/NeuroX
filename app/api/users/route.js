import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/users — Fetch all users
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const pool = await getPool();

    // If userId is provided, return that single user
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

    // Return all users
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
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/users — Create a new user
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: { message: "Name and email are required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const created = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, (role || "designer").toLowerCase())
      .query(
        `INSERT INTO userss (name, email, password, role)
         OUTPUT INSERTED.user_id
         VALUES (@name, @email, '', @role)`
      );

    const createdUserId = created.recordset[0]?.user_id;

    return NextResponse.json({
      success: true,
      data: { userId: createdUserId, name, email, role: (role || "designer").toLowerCase() },
    });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// PUT /api/users — Update a user
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId, name, email, role } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: "userId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("userId", sql.Int, Number(userId))
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
    console.error("PUT /api/users error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
