import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody, validateQuery } from "@/lib/validate";
import {
  getPersonasQuerySchema,
  patchPersonaSchema,
} from "@/lib/schemas";

export const GET = withAuth(async (req) => {
  const { data, error: validationError } = validateQuery(req, getPersonasQuerySchema);
  if (validationError) return validationError;

  const { projectId, includeGenerated, groupByInterviewee, aggregateGenerated } = data;

  const flagTrue = (v) => String(v || "").toLowerCase() === "true";
  const incGen = flagTrue(includeGenerated);
  const groupByIE = flagTrue(groupByInterviewee);
  const aggGen = flagTrue(aggregateGenerated);

  try {
    const pool = await getPool();

    // =========================================================
    // AGGREGATED COMBINED OUTPUT
    // =========================================================
    if (aggGen) {
      const result = await pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT
            p.persona_id,
            p.persona_name,
            pr.project_name,
            pr.description AS project_description,
            ie.interviewee_id,
            ie.name AS interviewee_name,
            ie.gender,
            ie.age,
            ie.location,
            ie.relationship_status,
            ie.title,
            ie.education,
            i.interview_id,
            i.transcript,
            i.persona_output AS generated_output,
            i.interview_outcome,
            i.summary,
            i.created_at AS generated_at
          FROM personass p
          INNER JOIN projectss pr ON pr.project_id = p.project_id
          LEFT JOIN intervieweess ie ON ie.persona_id = p.persona_id
          OUTER APPLY (
            SELECT TOP 1 *
            FROM interviewss i
            WHERE i.interviewee_id = ie.interviewee_id
            ORDER BY i.created_at DESC
          ) i
          WHERE p.project_id = @projectId
          ORDER BY p.persona_id ASC, ie.interviewee_id ASC
        `);

      const personaMap = new Map();

      for (const row of result.recordset) {
        if (!personaMap.has(row.persona_id)) {
          personaMap.set(row.persona_id, {
            personaId: row.persona_id,
            personaName: row.persona_name,
            projectName: row.project_name || "",
            projectDescription: row.project_description || "",
            outputs: [],
            seen: new Set(),
          });
        }

        const persona = personaMap.get(row.persona_id);
        const uniqueKey = `${row.interview_id}-${row.interviewee_id}`;

        if (persona.seen.has(uniqueKey)) continue;
        persona.seen.add(uniqueKey);

        persona.outputs.push({
          interviewId: row.interview_id,
          intervieweeId: row.interviewee_id,
          intervieweeName: row.interviewee_name || "Unknown",
          generatedAt: row.generated_at,
          demographics: {
            gender: row.gender,
            age: row.age,
            location: row.location,
            relationshipStatus: row.relationship_status,
            title: row.title,
            education: row.education,
          },
          summary: String(row.summary || "").trim() || "No summary available",
          transcript: String(row.transcript || "").trim() || "No transcript available",
          interviewOutcome: String(row.interview_outcome || "").trim() || "No outcome available",
          personaOutput: String(row.generated_output || "").trim() || "No persona output available",
        });
      }

      const personas = Array.from(personaMap.values());
      personas.forEach((p) => delete p.seen);

      const combinedOutput = personas
        .map((persona) => {
          const header = `Persona ID: ${persona.personaId}\nPersona Name: ${persona.personaName}`;
          const projectInfo = `Project Name: ${persona.projectName || "N/A"}\nProject Description: ${String(persona.projectDescription || "No project description available.").trim()}`;

          if (!persona.outputs.length) {
            return `${header}\n${projectInfo}\nPersona Outputs:\nNo interview details available.`;
          }

          const body = persona.outputs
            .map((output, index) => {
              const createdAt = output.generatedAt
                ? new Date(output.generatedAt).toISOString()
                : null;

              const metadata = [
                `Output ${index + 1}`,
                output.interviewId && `Interview ID: ${output.interviewId}`,
                output.intervieweeId && `Interviewee ID: ${output.intervieweeId}`,
                output.intervieweeName && `Interviewee Name: ${output.intervieweeName}`,
                createdAt && `Generated At: ${createdAt}`,
              ]
                .filter(Boolean)
                .join(" | ");

              const demographicText = [
                output.demographics.gender && `Gender: ${output.demographics.gender}`,
                output.demographics.age != null && `Age: ${output.demographics.age}`,
                output.demographics.location && `Location: ${output.demographics.location}`,
                output.demographics.relationshipStatus && `Relationship Status: ${output.demographics.relationshipStatus}`,
                output.demographics.title && `Title: ${output.demographics.title}`,
                output.demographics.education && `Education: ${output.demographics.education}`,
              ]
                .filter(Boolean)
                .join("\n");

              return `${metadata}\n${demographicText ? `${demographicText}\n` : ""}\nSummary:\n${output.summary}\n\nInterview Outcome:\n${output.interviewOutcome}\n\nPersona Output:\n${output.personaOutput}`;
            })
            .join("\n\n");

          return `${header}\n${projectInfo}\nPersona Outputs:\n${body}`;
        })
        .join("\n\n----------------------------------------\n\n");

      return NextResponse.json({ success: true, data: { personas, combinedOutput } });
    }

    // =========================================================
    // NORMAL FETCH
    // =========================================================
    const result =
      incGen && groupByIE
        ? await pool
            .request()
            .input("projectId", sql.Int, projectId)
            .query(`
              SELECT
                p.persona_id,
                p.persona_name,
                p.persona_description,
                ie.interviewee_id,
                ie.name AS interviewee_name,
                ie.gender,
                ie.age,
                ie.location,
                ie.relationship_status,
                ie.title,
                ie.education,
                latest.interview_id,
                latest.generated_output,
                latest.summary,
                latest.generated_at
              FROM personass p
              LEFT JOIN intervieweess ie ON ie.persona_id = p.persona_id
              OUTER APPLY (
                SELECT TOP 1
                  i.interview_id,
                  i.persona_output AS generated_output,
                  i.summary,
                  i.created_at AS generated_at
                FROM interviewss i
                WHERE i.interviewee_id = ie.interviewee_id
                ORDER BY i.created_at DESC
              ) latest
              WHERE p.project_id = @projectId
            `)
        : await pool
            .request()
            .input("projectId", sql.Int, projectId)
            .query(`
              SELECT persona_id, persona_name, persona_description
              FROM personass
              WHERE project_id = @projectId
            `);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// PATCH /api/personas
// Body: { personaId, personaDescription }
export const PATCH = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, patchPersonaSchema);
  if (validationError) return validationError;

  const { personaId, personaDescription } = data;

  try {
    const pool = await getPool();

    const ownershipResult = await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT p.persona_id
        FROM personass p
        INNER JOIN projectss pr ON p.project_id = pr.project_id
        WHERE p.persona_id = @personaId
          AND pr.created_by = @userId
      `);

    if (!ownershipResult.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Persona not found" } },
        { status: 404 }
      );
    }

    await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .input("personaDescription", sql.NVarChar(sql.MAX), personaDescription)
      .query(`
        UPDATE personass
        SET persona_description = @personaDescription
        WHERE persona_id = @personaId
      `);

    return NextResponse.json({ success: true, data: { personaId, personaDescription } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
