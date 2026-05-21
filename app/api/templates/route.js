import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

function normalizeStage(value) {
  return String(value || "").trim().toLowerCase();
}

function toTemplateDto(row) {
  const stageId = normalizeStage(row.phase);

  return {
    templateId: row.template_id,
    stageId,
    stageName: stageId ? `${stageId.charAt(0).toUpperCase()}${stageId.slice(1)}` : "",
    templateName: row.template_name,
    fileUrl: row.file_url,
    createdAt: row.created_at,
  };
}

// GET /api/templates — Fetch all templates, or filter by ?stageId= or ?templateId=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary");
    const stageId = normalizeStage(searchParams.get("stageId"));
    const templateId = searchParams.get("templateId");

    const pool = await getPool();

    if (summary === "true") {
      const result = await pool.request().query(`
        SELECT
          LOWER(LTRIM(RTRIM(phase))) AS stage_id,
          COUNT(*) AS template_count
        FROM templatess
        GROUP BY LOWER(LTRIM(RTRIM(phase)))
        ORDER BY stage_id ASC
      `);

      const data = result.recordset.map((row) => ({
        stageId: row.stage_id,
        templateCount: Number(row.template_count || 0),
      }));

      return NextResponse.json({ success: true, data });
    }

    if (templateId) {
      const result = await pool
        .request()
        .input("templateId", sql.Int, Number(templateId))
        .query(`
          SELECT template_id, phase, template_name, file_url, created_at
          FROM templatess
          WHERE template_id = @templateId
        `);

      if (!result.recordset.length) {
        return NextResponse.json(
          { success: false, error: { message: "Template not found" } },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: toTemplateDto(result.recordset[0]) });
    }

    const stageFilterEnabled = stageId && stageId !== "all";
    const result = stageFilterEnabled
      ? await pool
          .request()
          .input("stageId", sql.NVarChar, stageId)
          .query(`
            SELECT template_id, phase, template_name, file_url, created_at
            FROM templatess
            WHERE LOWER(LTRIM(RTRIM(phase))) = @stageId
            ORDER BY created_at DESC, template_name ASC
          `)
      : await pool.request().query(`
          SELECT template_id, phase, template_name, file_url, created_at
          FROM templatess
          ORDER BY phase ASC, created_at DESC, template_name ASC
        `);

    const data = result.recordset.map(toTemplateDto);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
