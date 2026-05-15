import { NextResponse } from "next/server";
import sql from "mssql";
import { poolPromise } from "@/lib/db";

/*
  GET PROJECT PROGRESS
*/
export async function GET(req, { params }) {
  try {
    const projectId = params.id;

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", sql.VarChar, projectId)
      .query(`
        SELECT
          overall_progress,
          empathize_progress,
          define_progress,
          ideate_progress,
          prototype_progress,
          test_progress
        FROM projectss
        WHERE project_id = @id
      `);

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

    if (project.empathize_progress > 0) {
      completedStages.push("Empathize");
    }

    if (project.define_progress > 0) {
      completedStages.push("Define");
    }

    if (project.ideate_progress > 0) {
      completedStages.push("Ideate");
    }

    if (project.prototype_progress > 0) {
      completedStages.push("Prototype");
    }

    if (project.test_progress > 0) {
      completedStages.push("Test");
    }

    let currentStage = "Empathize";

    if (project.test_progress > 0) {
      currentStage = "Implement";
    } else if (project.prototype_progress > 0) {
      currentStage = "Test";
    } else if (project.ideate_progress > 0) {
      currentStage = "Prototype";
    } else if (project.define_progress > 0) {
      currentStage = "Ideate";
    } else if (project.empathize_progress > 0) {
      currentStage = "Define";
    }

    return NextResponse.json({
      success: true,
      data: {
        progress: project.overall_progress || 0,
        completedStages,
        currentStage,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch progress",
      },
      { status: 500 }
    );
  }
}

/*
  UPDATE PROJECT PROGRESS
*/
export async function PUT(req, { params }) {
  try {
    const body = await req.json();

    const { stage, progress } = body;

    const projectId = params.id;

    const pool = await poolPromise;

    const stageColumn = `${stage}_progress`;

    const allowedStages = [
      "empathize",
      "define",
      "ideate",
      "prototype",
      "test",
    ];

    if (!allowedStages.includes(stage)) {
      return NextResponse.json(
        {
          error: "Invalid stage",
        },
        { status: 400 }
      );
    }

    const currentResult = await pool
      .request()
      .input("id", sql.VarChar, projectId)
      .query(`
        SELECT ${stageColumn}
        FROM projectss
        WHERE project_id = @id
      `);

    const currentProgress =
      currentResult.recordset[0][stageColumn] || 0;

    /*
      DO NOT REDUCE PROGRESS
    */
    if (progress <= currentProgress) {
      return NextResponse.json({
        success: true,
      });
    }

    /*
      UPDATE STAGE PROGRESS
    */
    await pool
      .request()
      .input("id", sql.VarChar, projectId)
      .input("progress", sql.Int, progress)
      .query(`
        UPDATE projectss
        SET ${stageColumn} = @progress
        WHERE project_id = @id
      `);

    /*
      RECALCULATE OVERALL PROGRESS
    */
    await pool
      .request()
      .input("id", sql.VarChar, projectId)
      .query(`
        UPDATE projectss
        SET overall_progress =
          ISNULL(empathize_progress, 0) +
          ISNULL(define_progress, 0) +
          ISNULL(ideate_progress, 0) +
          ISNULL(prototype_progress, 0) +
          ISNULL(test_progress, 0)
        WHERE project_id = @id
      `);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to update progress",
      },
      { status: 500 }
    );
  }
}