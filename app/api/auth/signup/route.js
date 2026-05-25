import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const ALLOWED_ROLES = ["designer", "manager"];

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const role = String(body?.role || "").trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: { message: "All fields are required" } },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email format" } },
        { status: 400 }
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              "Password must be at least 8 characters and include uppercase, lowercase, and a number",
          },
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid role" } },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const pool = await getPool();

    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, role)
      .query(`
        INSERT INTO userss (name, email, password, role)
        OUTPUT INSERTED.user_id
        VALUES (@name, @email, @password, @role)
      `);

    return NextResponse.json(
      {
        success: true,
        data: { userId: result.recordset[0].user_id },
        message: "Account created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    // Duplicate email (SQL Server unique constraint violation)
    if (error?.number === 2627 || error?.number === 2601) {
      return NextResponse.json(
        { success: false, error: { message: "Email already exists" } },
        { status: 409 }
      );
    }

    console.error("POST /api/auth/signup error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to create account" } },
      { status: 500 }
    );
  }
}
