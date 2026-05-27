import { NextResponse } from "next/server";
import { sql, getPool } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { updateProgressSchema } from "@/lib/schemas";

// GET /api/projects/[id]/progress
export const GET = withAuth(async (req, { params }) => {
  try {
    const { id } = await params;
    const projectId = Number(id);
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, projectId)
      .query(`
        SELECT
          ISNULL(overall_progress,0)    AS overall_progress,
          ISNULL(empathize_progress,0)  AS empathize_progress,
          ISNULL(define_progress,0)     AS define_progress,
          ISNULL(ideate_progress,0)     AS ideate_progress,
          ISNULL(prototype_progress,0)  AS prototype_progress,
          ISNULL(test_progress,0)       AS test_progress
        FROM projectss
        WHERE project_id = @id
      `);

    if (!result.recordset.length) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const project = result.recordset[0];
    const stages = ["Empathize", "Define", "Ideate", "Prototype", "Test"];
    const completedStages = stages.filter(
      (s) => project[`${s.toLowerCase()}_progress`] >= 100
    );

    return NextResponse.json({
      success: true,
      data: {
        progress: project.overall_progress,
        completedStages,
        currentStage:
          completedStages.length < stages.length
            ? stages[completedStages.length]
            : "Completed",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// PUT /api/projects/[id]/progress
// Body: { stage, progress }
export const PUT = withAuth(async (req, { params }) => {
  const { data, error: validationError } = await validateBody(req, updateProgressSchema);
  if (validationError) return validationError;

  const { stage, progress } = data;

  try {
    const projectId = Number((await params).id);
    const pool = await getPool();

    // stageColumn is safe — `stage` is already validated to the enum allowlist
    const stageColumn = `${stage}_progress`;

    const currentResult = await pool
      .request()
      .input("id", sql.Int, projectId)
      .query(`
        SELECT ISNULL(${stageColumn},0) AS current_progress
        FROM projectss
        WHERE project_id = @id
      `);

    if (!currentResult.recordset.length) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    if (progress <= currentResult.recordset[0].current_progress) {
      return NextResponse.json({ success: true, message: "Progress already updated" });
    }

    await pool
      .request()
      .input("id", sql.Int, projectId)
      .input("progress", sql.Int, progress)
      .query(`
        UPDATE projectss
        SET ${stageColumn} = @progress
        WHERE project_id = @id
      `);

    await pool
      .request()
      .input("id", sql.Int, projectId)
      .query(`
        UPDATE projectss
        SET overall_progress =
          ISNULL(empathize_progress,0) +
          ISNULL(define_progress,0) +
          ISNULL(ideate_progress,0) +
          ISNULL(prototype_progress,0) +
          ISNULL(test_progress,0)
        WHERE project_id = @id
      `);

    return NextResponse.json({ success: true, message: "Progress updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
