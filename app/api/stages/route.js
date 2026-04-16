import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/stages — Fetch all design thinking stages
export async function GET() {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .query("SELECT * FROM stages ORDER BY sequence_order ASC");

    const stages = result.recordset.map((stage) => ({
      stageId: stage.stage_id,
      stageName: stage.stage_name,
      sequenceOrder: stage.sequence_order,
    }));

    return NextResponse.json({ success: true, data: stages });
  } catch (error) {
    console.error("GET /api/stages error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
