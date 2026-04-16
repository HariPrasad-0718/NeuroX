import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/templates — Fetch all templates, or filter by ?stageId= or ?templateId=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get("stageId");
    const templateId = searchParams.get("templateId");
    const summary = searchParams.get("summary"); // ?summary=true for count per stage

    const pool = await getPool();

    // Return a summary count of templates per stage
    if (summary === "true") {
      const result = await pool.request().query(
        `SELECT stage_id AS stageId, COUNT(*) AS templateCount
         FROM templates
         GROUP BY stage_id`
      );

      return NextResponse.json({ success: true, data: result.recordset });
    }

    // Fetch a single template by ID
    if (templateId) {
      const result = await pool
        .request()
        .input("templateId", sql.NVarChar, templateId)
        .query("SELECT * FROM templates WHERE template_id = @templateId");

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: "Template not found" } },
          { status: 404 }
        );
      }

      const t = result.recordset[0];
      return NextResponse.json({
        success: true,
        data: {
          templateId: t.template_id,
          templateName: t.template_name,
          blobPath: t.blob_path,
          version: t.version,
          stageId: t.stage_id,
        },
      });
    }

    // Fetch templates by stage
    if (stageId) {
      const result = await pool
        .request()
        .input("stageId", sql.NVarChar, stageId)
        .query("SELECT * FROM templates WHERE stage_id = @stageId");

      const templates = result.recordset.map((t) => ({
        templateId: t.template_id,
        templateName: t.template_name,
        blobPath: t.blob_path,
        version: t.version,
        stageId: t.stage_id,
      }));

      return NextResponse.json({ success: true, data: templates });
    }

    // Fetch all templates
    const result = await pool.request().query("SELECT * FROM templates");

    const templates = result.recordset.map((t) => ({
      templateId: t.template_id,
      templateName: t.template_name,
      blobPath: t.blob_path,
      version: t.version,
      stageId: t.stage_id,
    }));

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
