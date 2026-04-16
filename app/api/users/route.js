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
        .input("userId", sql.NVarChar, userId)
        .query("SELECT * FROM users WHERE user_id = @userId");

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
    const result = await pool.request().query("SELECT * FROM users");

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
    const { userId, name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: { message: "Name and email are required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("userId", sql.NVarChar, userId)
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role || "Designer")
      .query(
        `INSERT INTO users (user_id, name, email, role, created_at)
         VALUES (@userId, @name, @email, @role, GETDATE())`
      );

    return NextResponse.json({
      success: true,
      data: { userId, name, email, role: role || "Designer" },
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
    const { searchParams } = new URL(request.url);
    const requestingUserId = searchParams.get("userId");
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
      .input("userId", sql.NVarChar, userId)
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query(
        `UPDATE users SET name = @name, email = @email, role = @role
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
