import { NextResponse } from "next/server";
import { sql, getPool } from "@/lib/db";

/*
========================================
GET PROJECT PROGRESS
========================================
*/
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, projectId)
      .query(`
        SELECT
          ISNULL(overall_progress,0) AS overall_progress,
          ISNULL(empathize_progress,0) AS empathize_progress,
          ISNULL(define_progress,0) AS define_progress,
          ISNULL(ideate_progress,0) AS ideate_progress,
          ISNULL(prototype_progress,0) AS prototype_progress,
          ISNULL(test_progress,0) AS test_progress
        FROM projectss
        WHERE project_id = @id
      `);

    /*
    ================================
    PROJECT NOT FOUND
    ================================
    */
    if (result.recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    const project = result.recordset[0];

    const completedStages = [];

    if (project.empathize_progress >= 100) {
      completedStages.push("Empathize");
    }

    if (project.define_progress >= 100) {
      completedStages.push("Define");
    }

    if (project.ideate_progress >= 100) {
      completedStages.push("Ideate");
    }

    if (project.prototype_progress >= 100) {
      completedStages.push("Prototype");
    }

    if (project.test_progress >= 100) {
      completedStages.push("Test");
    }

    const stages = [
      "Empathize",
      "Define",
      "Ideate",
      "Prototype",
      "Test",
    ];

    return NextResponse.json({
      success: true,
      data: {
        progress: project.overall_progress,
        completedStages,
        currentStage:
          completedStages.length < 5
            ? stages[completedStages.length]
            : "Completed",
      },
    });
  } catch (error) {
    console.error("GET progress error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/*
========================================
UPDATE PROJECT PROGRESS
========================================
*/
export async function PUT(req, { params }) {
  try {
    const body = await req.json();

    const { stage, progress } = body;

    const projectId = Number((await params).id);

    const pool = await getPool();

    const allowedStages = [
      "empathize",
      "define",
      "ideate",
      "prototype",
      "test",
    ];

    /*
    ================================
    VALIDATE STAGE
    ================================
    */
    if (!allowedStages.includes(stage)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stage",
        },
        { status: 400 }
      );
    }

    const stageColumn = `${stage}_progress`;

    /*
    ================================
    GET CURRENT PROGRESS
    ================================
    */
    const currentResult = await pool
      .request()
      .input("id", sql.Int, projectId)
      .query(`
        SELECT
          ISNULL(${stageColumn},0) AS current_progress
        FROM projectss
        WHERE project_id = @id
      `);

    /*
    ================================
    PROJECT NOT FOUND
    ================================
    */
    if (currentResult.recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    const currentProgress =
      currentResult.recordset[0].current_progress;

    /*
    ================================
    DO NOT REDUCE PROGRESS
    ================================
    */
    if (progress <= currentProgress) {
      return NextResponse.json({
        success: true,
        message: "Progress already updated",
      });
    }

    /*
    ================================
    UPDATE STAGE PROGRESS
    ================================
    */
    await pool
      .request()
      .input("id", sql.Int, projectId)
      .input("progress", sql.Int, progress)
      .query(`
        UPDATE projectss
        SET ${stageColumn} = @progress
        WHERE project_id = @id
      `);

    /*
    ================================
    RECALCULATE OVERALL PROGRESS
    ================================
    */
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

    return NextResponse.json({
      success: true,
      message: "Progress updated successfully",
    });
  } catch (error) {
    console.error("PUT progress error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

