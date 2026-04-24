import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("projectId", sql.Int, Number(projectId))
      .query(`
        SELECT persona_id, persona_name, persona_description
        FROM personass
        WHERE project_id = @projectId
      `);

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("PERSONA FETCH ERROR:", error);

    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}