import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { AUTH_COOKIE_NAME, getAuthCookieOptions, signAuthToken } from "@/lib/auth";
import { validateBody } from "@/lib/validate";
import { loginSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

export async function POST(request) {
  const { data, error } = await validateBody(request, loginSchema);
  if (error) return error;

  const { email, password, role } = data;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT user_id, name, email, password, role FROM userss WHERE email = @email");

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const user = result.recordset[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    if (String(user.role).toLowerCase() !== role) {
      return NextResponse.json(
        { success: false, error: { message: "Selected role does not match your account" } },
        { status: 403 }
      );
    }

    const token = await signAuthToken({
      userId: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: { userId: user.user_id, role: user.role },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (err) {
    logger.error("POST /api/auth/login error", { error: err });
    return NextResponse.json(
      { success: false, error: { message: "Login failed" } },
      { status: 500 }
    );
  }
}
