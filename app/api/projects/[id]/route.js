import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { updateProjectByIdSchema } from "@/lib/schemas";

export const GET = withAuth(async (request, { params }, user) => {
  try {
    const projectId = Number((await params).id);
    const pool = await getPool();

    const projectResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
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
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, { params }, user) => {
  const { data, error: validationError } = await validateBody(request, updateProjectByIdSchema);
  if (validationError) return validationError;

  try {
    const projectId = Number((await params).id);
    const pool = await getPool();

    const projectName = data.title || data.projectName || "";
    const description = data.description || data.projectDescription || "";
    const clientName = data.company || data.clientName || data.client || "";
    const startDate = data.startDate || null;
    const endDate = data.endDate || data.targetDate || null;
    const domain = data.domain || "";
    const personas = data.personas;

    const updateResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .input("projectName", sql.NVarChar, projectName)
      .input("description", sql.NVarChar, description)
      .input("clientName", sql.NVarChar, clientName)
      .input("startDate", sql.Date, startDate ? new Date(startDate) : null)
      .input("endDate", sql.Date, endDate ? new Date(endDate) : null)
      .input("domain", sql.NVarChar, domain)
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

    if (Array.isArray(personas)) {
      const incomingIds = personas
        .filter((p) => p.personaId)
        .map((p) => Number(p.personaId));

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
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
