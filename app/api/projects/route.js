import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { enhancePersonaDescription } from "@/lib/agent5i";

// GET /api/projects — Fetch all projects, or a single project by ?projectId=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const recentOnly = String(searchParams.get("recent") || "").toLowerCase() === "true";
    const requestedLimit = Number(searchParams.get("limit") || 6);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 6;
    const sessionUser = await getUserFromRequest(request);

    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const pool = await getPool();

    // Fetch a single project by ID
    if (projectId) {
      const result = await pool
        .request()
        .input("projectId", sql.Int, Number(projectId))
        .input("userId", sql.Int, Number(sessionUser.userId))
        .query(`
          SELECT
            project_id,
            project_name,
            description,
            client_name,
            start_date,
            end_date,
            domain,
            created_at,
            created_by
          FROM projectss
          WHERE project_id = @projectId AND created_by = @userId
        `);

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

    // Fetch all projects
    const result = recentOnly
      ? await pool
          .request()
          .input("userId", sql.Int, Number(sessionUser.userId))
          .input("limit", sql.Int, limit)
          .query(`
            SELECT TOP (@limit)
              project_id,
              project_name,
              description,
              client_name,
              start_date,
              end_date,
              domain,
              created_at,
              created_by
            FROM projectss
            WHERE created_by = @userId
            ORDER BY created_at DESC
          `)
      : await pool
          .request()
          .input("userId", sql.Int, Number(sessionUser.userId))
          .query(`
            SELECT
              project_id,
              project_name,
              description,
              client_name,
              start_date,
              end_date,
              domain,
              created_at,
              created_by
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
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await request.json();


    const { 
  projectName,
  projectDescription,
  client,
  clientName,
  startDate,
  endDate,
  targetCompletionDate,
  personas,
  domain
} = body;

      console.log("PERSONAS RECEIVED:", personas);


    if (!projectName) {
      return NextResponse.json(
        { success: false, error: { message: "projectName is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const created = await pool
      .request()
      .input("projectName", sql.NVarChar, projectName)
      .input("description", sql.NVarChar, projectDescription || "")
      .input("clientName", sql.NVarChar, clientName || client || "")
      .input("startDate", sql.Date, startDate ? new Date(startDate) : null)
      .input(
        "endDate",
        sql.Date,
        (endDate || targetCompletionDate)
          ? new Date(endDate || targetCompletionDate)
          : null
      )
      .input("createdBy", sql.Int, Number(sessionUser.userId))
      .input("domain", sql.NVarChar, domain || "")
      .query(
        `INSERT INTO projectss
           (project_name, client_name, description, start_date, end_date, domain, created_by)
         OUTPUT INSERTED.project_id
         VALUES
           (@projectName, @clientName, @description, @startDate, @endDate, @domain, @createdBy)`
      );

    const createdId = created.recordset[0]?.project_id;

    if (personas && personas.length > 0) {
      for (const p of personas) {
        if (!p.name) continue;

        const originalDescription = p.description || "";
        let enhancedDescription = originalDescription;

        try {
          enhancedDescription = await enhancePersonaDescription({
            projectDescription: projectDescription || "",
            personaTitle: p.name,
            personaDescription: originalDescription,
          });
        } catch (enhanceError) {
          console.error("Persona enhancement failed, using original description:", enhanceError?.message || enhanceError);
        }

        await pool
          .request()
          .input("projectId", sql.Int, createdId)
          .input("name", sql.NVarChar, p.name)
          .input("description", sql.NVarChar, enhancedDescription)
          .query(`
            INSERT INTO personass (project_id, persona_name, persona_description)
            VALUES (@projectId, @name, @description)
          `);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId: createdId,
        projectName,
        projectDescription: projectDescription || "",
        status: "In Progress",
        client: clientName || client || "",
        domain: domain || "",
        startDate: startDate || null,
        targetCompletionDate: endDate || targetCompletionDate || null,
        createdBy: Number(sessionUser.userId),
      },
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
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required" } },
        { status: 400 }
      );
    }

    const normalizedProjectName = body.projectName || body.title;
    const normalizedDescription = body.projectDescription || body.description || "";
    const normalizedClient = body.client || body.clientName || body.company || "";
    const normalizedStartDate = body.startDate || null;
    const normalizedEndDate = body.endDate || body.targetCompletionDate || body.targetDate || null;
    const normalizedDomain = body.domain || "";

    if (!normalizedProjectName) {
      return NextResponse.json(
        { success: false, error: { message: "projectName is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const updateResult = await pool
      .request()
      .input("projectId", sql.Int, Number(projectId))
      .input("userId", sql.Int, Number(sessionUser.userId))
      .input("projectName", sql.NVarChar, normalizedProjectName)
      .input("description", sql.NVarChar, normalizedDescription)
      .input("clientName", sql.NVarChar, normalizedClient)
      .input(
        "startDate",
        sql.Date,
        normalizedStartDate ? new Date(normalizedStartDate) : null
      )
      .input(
        "endDate",
        sql.Date,
        normalizedEndDate ? new Date(normalizedEndDate) : null
      )
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
        projectId: Number(projectId),
        projectName: normalizedProjectName,
        projectDescription: normalizedDescription,
        client: normalizedClient,
        startDate: normalizedStartDate,
        targetCompletionDate: normalizedEndDate,
        status: "In Progress",
      },
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
    const sessionUser = await getUserFromRequest(request);

    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const ownershipCheck = await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .input("userId", sql.Int, Number(sessionUser.userId))
        .query("SELECT project_id FROM projectss WHERE project_id = @projectId AND created_by = @userId");

      if (!ownershipCheck.recordset?.length) {
        await transaction.rollback();
        return NextResponse.json(
          { success: false, error: { message: "Project not found" } },
          { status: 404 }
        );
      }

      await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .query(
          `DELETE q
           FROM questionss q
           INNER JOIN interviewss i ON q.interview_id = i.interview_id
           INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
           INNER JOIN personass p ON ie.persona_id = p.persona_id
           WHERE p.project_id = @projectId`
        );

      await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .query(
          `DELETE pi
           FROM persona_insightss pi
           INNER JOIN interviewss i ON pi.interview_id = i.interview_id
           INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
           INNER JOIN personass p ON ie.persona_id = p.persona_id
           WHERE p.project_id = @projectId`
        );

      await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .query(
          `DELETE i
           FROM interviewss i
           INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
           INNER JOIN personass p ON ie.persona_id = p.persona_id
           WHERE p.project_id = @projectId`
        );

      await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .query(
          `DELETE ie
           FROM intervieweess ie
           INNER JOIN personass p ON ie.persona_id = p.persona_id
           WHERE p.project_id = @projectId`
        );

      await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .query("DELETE FROM personass WHERE project_id = @projectId");

      const deleteProjectResult = await new sql.Request(transaction)
        .input("projectId", sql.Int, Number(projectId))
        .input("userId", sql.Int, Number(sessionUser.userId))
        .query("DELETE FROM projectss WHERE project_id = @projectId AND created_by = @userId");

      if (!deleteProjectResult.rowsAffected?.[0]) {
        await transaction.rollback();
        return NextResponse.json(
          { success: false, error: { message: "Project not found" } },
          { status: 404 }
        );
      }

      await transaction.commit();
    } catch (transactionError) {
      try {
        await transaction.rollback();
      } catch {
        // no-op
      }
      throw transactionError;
    }

    return NextResponse.json({ success: true, data: { projectId: Number(projectId) } });
  } catch (error) {
    console.error("DELETE /api/projects error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
