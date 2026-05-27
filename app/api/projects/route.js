import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody, validateQuery } from "@/lib/validate";
import { enhancePersonaDescription } from "@/lib/agent5i";
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectQuerySchema,
  positiveInt,
} from "@/lib/schemas";
import { z } from "zod";

const deleteProjectQuerySchema = z.object({ projectId: positiveInt });
const updateProjectQuerySchema = z.object({ projectId: positiveInt });

// GET /api/projects — Fetch all projects, or a single project by ?projectId=
export const GET = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = validateQuery(request, getProjectQuerySchema);
  if (validationError) return validationError;

  const { projectId, recent, limit } = data;
  const recentOnly = String(recent || "").toLowerCase() === "true";

  try {
    const pool = await getPool();

    if (projectId) {
      const result = await pool
        .request()
        .input("projectId", sql.Int, projectId)
        .input("userId", sql.Int, Number(user.userId))
        .query(`
          SELECT
            project_id, project_name, description, client_name,
            start_date, end_date, domain, created_at, created_by
          FROM projectss
          WHERE project_id = @projectId AND created_by = @userId
        `);

      if (!result.recordset.length) {
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
          projectDescription: p.description,
          status: "In Progress",
          client: p.client_name,
          startDate: p.start_date,
          targetCompletionDate: p.end_date,
          createdAt: p.created_at,
          updatedAt: p.created_at,
          createdBy: p.created_by,
          domain: p.domain || "",
        },
      });
    }

    const result = recentOnly
      ? await pool
          .request()
          .input("userId", sql.Int, Number(user.userId))
          .input("limit", sql.Int, limit)
          .query(`
            SELECT TOP (@limit)
              project_id, project_name, description, client_name,
              start_date, end_date, domain, created_at, created_by
            FROM projectss
            WHERE created_by = @userId
            ORDER BY created_at DESC
          `)
      : await pool
          .request()
          .input("userId", sql.Int, Number(user.userId))
          .query(`
            SELECT
              project_id, project_name, description, client_name,
              start_date, end_date, domain, created_at, created_by
            FROM projectss
            WHERE created_by = @userId
            ORDER BY created_at DESC
          `);

    const projects = result.recordset.map((p) => ({
      projectId: p.project_id,
      projectName: p.project_name,
      projectDescription: p.description,
      status: "In Progress",
      client: p.client_name,
      startDate: p.start_date,
      targetCompletionDate: p.end_date,
      createdAt: p.created_at,
      updatedAt: p.created_at,
      createdBy: p.created_by,
      domain: p.domain || "",
    }));

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// POST /api/projects — Create a new project
export const POST = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = await validateBody(request, createProjectSchema);
  if (validationError) return validationError;

  const {
    projectName,
    projectDescription,
    clientName,
    startDate,
    endDate,
    domain,
    personas,
  } = data;

  try {
    const pool = await getPool();

    const created = await pool
      .request()
      .input("projectName", sql.NVarChar, projectName)
      .input("description", sql.NVarChar, projectDescription)
      .input("clientName", sql.NVarChar, clientName)
      .input("startDate", sql.Date, startDate ? new Date(startDate) : null)
      .input("endDate", sql.Date, endDate ? new Date(endDate) : null)
      .input("createdBy", sql.Int, Number(user.userId))
      .input("domain", sql.NVarChar, domain)
      .query(
        `INSERT INTO projectss
           (project_name, client_name, description, start_date, end_date, domain, created_by)
         OUTPUT INSERTED.project_id
         VALUES
           (@projectName, @clientName, @description, @startDate, @endDate, @domain, @createdBy)`
      );

    const createdId = created.recordset[0]?.project_id;

    for (const p of personas) {
      if (!p.persona_name) continue;

      const originalDescription = p.persona_description || "";
      let enhancedDescription = originalDescription;

      try {
        enhancedDescription = await enhancePersonaDescription({
          projectDescription,
          personaTitle: p.persona_name,
          personaDescription: originalDescription,
        });
      } catch {
        // non-fatal — use original if enhancement fails
      }

      await pool
        .request()
        .input("projectId", sql.Int, createdId)
        .input("name", sql.NVarChar, p.persona_name)
        .input("description", sql.NVarChar, enhancedDescription)
        .query(`
          INSERT INTO personass (project_id, persona_name, persona_description)
          VALUES (@projectId, @name, @description)
        `);
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId: createdId,
        projectName,
        projectDescription,
        status: "In Progress",
        client: clientName,
        domain,
        startDate: startDate || null,
        targetCompletionDate: endDate || null,
        createdBy: Number(user.userId),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// PUT /api/projects?projectId= — Update a project
export const PUT = withAuth(async (request, _ctx, user) => {
  const { data: queryData, error: queryError } = validateQuery(request, updateProjectQuerySchema);
  if (queryError) return queryError;

  const { projectId } = queryData;

  const { data, error: validationError } = await validateBody(request, updateProjectSchema);
  if (validationError) return validationError;

  const {
    projectName,
    projectDescription,
    clientName,
    startDate,
    endDate,
    domain,
  } = data;

  const normalizedProjectName = projectName;
  const normalizedDescription = projectDescription || "";
  const normalizedClient = clientName || "";
  const normalizedDomain = domain || "";

  if (!normalizedProjectName) {
    return NextResponse.json(
      { success: false, error: { message: "projectName is required" } },
      { status: 400 }
    );
  }

  try {
    const pool = await getPool();

    const updateResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .input("projectName", sql.NVarChar, normalizedProjectName)
      .input("description", sql.NVarChar, normalizedDescription)
      .input("clientName", sql.NVarChar, normalizedClient)
      .input("startDate", sql.Date, startDate ? new Date(startDate) : null)
      .input("endDate", sql.Date, endDate ? new Date(endDate) : null)
      .input("domain", sql.NVarChar, normalizedDomain)
      .query(
        `UPDATE projectss
         SET project_name = @projectName,
             description = @description,
             client_name = @clientName,
             start_date = @startDate,
             end_date = @endDate,
             domain = @domain
         WHERE project_id = @projectId AND created_by = @userId`
      );

    if (!updateResult.rowsAffected?.[0]) {
      return NextResponse.json(
        { success: false, error: { message: "Project not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        projectName: normalizedProjectName,
        projectDescription: normalizedDescription,
        client: normalizedClient,
        startDate: startDate || null,
        targetCompletionDate: endDate || null,
        status: "In Progress",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// DELETE /api/projects?projectId= — Delete a project
export const DELETE = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = validateQuery(request, deleteProjectQuerySchema);
  if (validationError) return validationError;

  const { projectId } = data;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const ownershipCheck = await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .query("SELECT project_id FROM projectss WHERE project_id = @projectId AND created_by = @userId");

    if (!ownershipCheck.recordset?.length) {
      await transaction.rollback();
      return NextResponse.json(
        { success: false, error: { message: "Project not found" } },
        { status: 404 }
      );
    }

    await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .query(
        `DELETE q FROM questionss q
         INNER JOIN interviewss i ON q.interview_id = i.interview_id
         INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
         INNER JOIN personass p ON ie.persona_id = p.persona_id
         WHERE p.project_id = @projectId`
      );

    await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .query(
        `DELETE pi FROM persona_insightss pi
         INNER JOIN interviewss i ON pi.interview_id = i.interview_id
         INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
         INNER JOIN personass p ON ie.persona_id = p.persona_id
         WHERE p.project_id = @projectId`
      );

    await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .query(
        `DELETE i FROM interviewss i
         INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
         INNER JOIN personass p ON ie.persona_id = p.persona_id
         WHERE p.project_id = @projectId`
      );

    await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .query(
        `DELETE ie FROM intervieweess ie
         INNER JOIN personass p ON ie.persona_id = p.persona_id
         WHERE p.project_id = @projectId`
      );

    await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .query("DELETE FROM personass WHERE project_id = @projectId");

    const deleteProjectResult = await new sql.Request(transaction)
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .query("DELETE FROM projectss WHERE project_id = @projectId AND created_by = @userId");

    if (!deleteProjectResult.rowsAffected?.[0]) {
      await transaction.rollback();
      return NextResponse.json(
        { success: false, error: { message: "Project not found" } },
        { status: 404 }
      );
    }

    await transaction.commit();
    return NextResponse.json({ success: true, data: { projectId } });
  } catch (error) {
    try { await transaction.rollback(); } catch { /* no-op */ }
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
