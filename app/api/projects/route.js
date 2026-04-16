import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/projects — Fetch all projects, or a single project by ?projectId=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const pool = await getPool();

    // Fetch a single project by ID
    if (projectId) {
      const result = await pool
        .request()
        .input("projectId", sql.NVarChar, projectId)
        .query("SELECT * FROM projects WHERE project_id = @projectId");

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: "Project not found" } },
          { status: 404 }
        );
      }

      const p = result.recordset[0];
      return NextResponse.json({
        success: true,
        data: {
          projectId: p.project_id,
          projectName: p.project_name,
          projectDescription: p.project_description,
          status: p.status,
          client: p.client,
          startDate: p.start_date,
          targetCompletionDate: p.target_completion_date,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        },
      });
    }

    // Fetch all projects
    const result = await pool
      .request()
      .query("SELECT * FROM projects ORDER BY created_at DESC");

    const projects = result.recordset.map((p) => ({
      projectId: p.project_id,
      projectName: p.project_name,
      projectDescription: p.project_description,
      status: p.status,
      client: p.client,
      startDate: p.start_date,
      targetCompletionDate: p.target_completion_date,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/projects — Create a new project
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const body = await request.json();

    const {
      projectId,
      projectName,
      projectDescription,
      status,
      client,
      startDate,
      targetCompletionDate,
    } = body;

    if (!projectName) {
      return NextResponse.json(
        { success: false, error: { message: "projectName is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .input("projectName", sql.NVarChar, projectName)
      .input("projectDescription", sql.NVarChar, projectDescription || "")
      .input("ownerUserId", sql.NVarChar, userId)
      .input("status", sql.NVarChar, status || "In Progress")
      .input("client", sql.NVarChar, client || "")
      .input("startDate", sql.DateTime, startDate ? new Date(startDate) : null)
      .input(
        "targetDate",
        sql.DateTime,
        targetCompletionDate ? new Date(targetCompletionDate) : null
      )
      .query(
        `INSERT INTO projects
           (project_id, project_name, project_description, owner_user_id, status, client, start_date, target_completion_date, created_at, updated_at)
         VALUES
           (@projectId, @projectName, @projectDescription, @ownerUserId, @status, @client, @startDate, @targetDate, GETDATE(), GETDATE())`
      );

    return NextResponse.json({
      success: true,
      data: { projectId, projectName, projectDescription, status, client },
    });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// PUT /api/projects — Update a project
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .input("projectName", sql.NVarChar, body.projectName)
      .input("projectDescription", sql.NVarChar, body.projectDescription)
      .input("status", sql.NVarChar, body.status)
      .input("client", sql.NVarChar, body.client)
      .input(
        "startDate",
        sql.DateTime,
        body.startDate ? new Date(body.startDate) : null
      )
      .input(
        "targetDate",
        sql.DateTime,
        body.targetCompletionDate
          ? new Date(body.targetCompletionDate)
          : null
      )
      .query(
        `UPDATE projects
         SET project_name = @projectName,
             project_description = @projectDescription,
             status = @status,
             client = @client,
             start_date = @startDate,
             target_completion_date = @targetDate,
             updated_at = GETDATE()
         WHERE project_id = @projectId`
      );

    return NextResponse.json({
      success: true,
      data: { projectId, ...body },
    });
  } catch (error) {
    console.error("PUT /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// DELETE /api/projects — Delete a project
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query("DELETE FROM projects WHERE project_id = @projectId");

    return NextResponse.json({ success: true, data: { projectId } });
  } catch (error) {
    console.error("DELETE /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
