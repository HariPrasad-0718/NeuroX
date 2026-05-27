import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const projectId = Number(params.id);
    const pool = await getPool();

    const projectResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(sessionUser.userId))
      .query(`
        SELECT project_id, project_name, description, client_name, start_date, end_date, domain
        FROM projectss
        WHERE project_id = @projectId AND created_by = @userId
      `);

    if (!projectResult.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Project not found" } },
        { status: 404 }
      );
    }

    const personasResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT persona_id, persona_name, persona_description
        FROM personass
        WHERE project_id = @projectId
      `);

    const p = projectResult.recordset[0];
    return NextResponse.json({
      success: true,
      data: {
        projectId: p.project_id,
        title: p.project_name,
        company: p.client_name,
        description: p.description,
        startDate: p.start_date,
        targetDate: p.end_date,
        domain: p.domain || "",
        status: "In Progress",
        personas: personasResult.recordset.map((r) => ({
          personaId: r.persona_id,
          name: r.persona_name,
          description: r.persona_description,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const projectId = Number(params.id);
    const body = await request.json();
    const pool = await getPool();

    // Update project row
    const updateResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(sessionUser.userId))
      .input("projectName", sql.NVarChar, body.title || body.projectName || "")
      .input("description", sql.NVarChar, body.description || body.projectDescription || "")
      .input("clientName", sql.NVarChar, body.company || body.clientName || body.client || "")
      .input("startDate", sql.Date, body.startDate ? new Date(body.startDate) : null)
      .input("endDate", sql.Date, (body.targetDate || body.endDate) ? new Date(body.targetDate || body.endDate) : null)
      .input("domain", sql.NVarChar, body.domain || "")
      .query(`
        UPDATE projectss
        SET project_name = @projectName,
            description  = @description,
            client_name  = @clientName,
            start_date   = @startDate,
            end_date     = @endDate,
            domain       = @domain
        WHERE project_id = @projectId AND created_by = @userId
      `);

    if (!updateResult.rowsAffected?.[0]) {
      return NextResponse.json(
        { success: false, error: { message: "Project not found" } },
        { status: 404 }
      );
    }

    // Persona upsert / delete
    const personas = body.personas;
    if (Array.isArray(personas)) {
      const incomingIds = personas
        .filter((p) => p.personaId)
        .map((p) => Number(p.personaId));

      // Delete removed personas
      if (incomingIds.length > 0) {
        await pool
          .request()
          .input("projectId", sql.Int, projectId)
          .input("keepIds", sql.NVarChar, incomingIds.join(","))
          .query(`
            DELETE FROM personass
            WHERE project_id = @projectId
              AND persona_id NOT IN (SELECT value FROM STRING_SPLIT(@keepIds, ','))
          `);
      } else {
        await pool
          .request()
          .input("projectId", sql.Int, projectId)
          .query("DELETE FROM personass WHERE project_id = @projectId");
      }

      for (const p of personas) {
        if (!p.name?.trim()) continue;
        if (p.personaId) {
          await pool
            .request()
            .input("personaId", sql.Int, Number(p.personaId))
            .input("name", sql.NVarChar, p.name)
            .input("description", sql.NVarChar, p.description || "")
            .query(`
              UPDATE personass
              SET persona_name = @name, persona_description = @description
              WHERE persona_id = @personaId
            `);
        } else {
          await pool
            .request()
            .input("projectId", sql.Int, projectId)
            .input("name", sql.NVarChar, p.name)
            .input("description", sql.NVarChar, p.description || "")
            .query(`
              INSERT INTO personass (project_id, persona_name, persona_description)
              VALUES (@projectId, @name, @description)
            `);
        }
      }
    }

    return NextResponse.json({ success: true, data: { projectId } });
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
