import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { validateBody } from "@/lib/validate";
import { signupSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

export async function POST(request) {
  const { data, error } = await validateBody(request, signupSchema);
  if (error) return error;

  const { name, email, password, role } = data;

  try {
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
  } catch (err) {
    // Duplicate email (SQL Server unique constraint violation)
    if (err?.number === 2627 || err?.number === 2601) {
      return NextResponse.json(
        { success: false, error: { message: "Email already exists" } },
        { status: 409 }
      );
    }

    logger.error("POST /api/auth/signup error", { error: err });
    return NextResponse.json(
      { success: false, error: { message: "Failed to create account" } },
      { status: 500 }
    );
  }
}
