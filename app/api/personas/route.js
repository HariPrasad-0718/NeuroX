import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const includeGenerated = String(searchParams.get("includeGenerated") || "").toLowerCase() === "true";
    const groupByInterviewee = String(searchParams.get("groupByInterviewee") || "").toLowerCase() === "true";
    const aggregateGenerated = String(searchParams.get("aggregateGenerated") || "").toLowerCase() === "true";

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    if (aggregateGenerated) {
      const result = await pool
        .request()
        .input("projectId", sql.Int, Number(projectId))
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
          LEFT JOIN interviewss i ON i.interviewee_id = ie.interviewee_id
          WHERE p.project_id = @projectId
          ORDER BY p.persona_id ASC, i.created_at ASC, i.interview_id ASC
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
          });
        }

        const outputText = String(row.generated_output || "").trim();
        const transcriptText = String(row.transcript || "").trim();
        const summaryText = String(row.summary || "").trim();
        const outcomeText = String(row.interview_outcome || "").trim();
        const hasAnyInterviewDetail = Boolean(outputText || transcriptText || summaryText || outcomeText);

        if (!hasAnyInterviewDetail) continue;

        personaMap.get(row.persona_id).outputs.push({
          interviewId: row.interview_id,
          intervieweeId: row.interviewee_id,
          intervieweeName: row.interviewee_name,
          generatedAt: row.generated_at,
          demographics: {
            gender: row.gender,
            age: row.age,
            location: row.location,
            relationshipStatus: row.relationship_status,
            title: row.title,
            education: row.education,
          },
          summary: summaryText,
          transcript: transcriptText,
          interviewOutcome: outcomeText,
          personaOutput: outputText,
        });
      }

      const personas = Array.from(personaMap.values());
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
                output.interviewId ? `Interview ID: ${output.interviewId}` : null,
                output.intervieweeId ? `Interviewee ID: ${output.intervieweeId}` : null,
                output.intervieweeName ? `Interviewee Name: ${output.intervieweeName}` : null,
                createdAt ? `Generated At: ${createdAt}` : null,
              ]
                .filter(Boolean)
                .join(" | ");

              const demographicText = [
                output.demographics.gender ? `Gender: ${output.demographics.gender}` : null,
                output.demographics.age !== null && output.demographics.age !== undefined ? `Age: ${output.demographics.age}` : null,
                output.demographics.location ? `Location: ${output.demographics.location}` : null,
                output.demographics.relationshipStatus
                  ? `Relationship Status: ${output.demographics.relationshipStatus}`
                  : null,
                output.demographics.title ? `Title: ${output.demographics.title}` : null,
                output.demographics.education ? `Education: ${output.demographics.education}` : null,
              ]
                .filter(Boolean)
                .join("\n");

              return `${metadata}
${demographicText ? `${demographicText}\n` : ""}
Summary:
${output.summary || "No summary available."}

Interview Outcome:
${output.interviewOutcome || "No interview outcome available."}

Persona Output:
${output.personaOutput || "No persona output available."}`;
            })
            .join("\n\n");

          return `${header}\n${projectInfo}\nPersona Outputs:\n${body}`;
        })
        .join("\n\n----------------------------------------\n\n");

      return NextResponse.json({
        success: true,
        data: {
          personas,
          combinedOutput,
        },
      });
    }

    const result = includeGenerated && groupByInterviewee
      ? await pool
          .request()
          .input("projectId", sql.Int, Number(projectId))
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
              ORDER BY i.created_at DESC, i.interview_id DESC
            ) latest
            WHERE p.project_id = @projectId
            ORDER BY p.persona_id ASC, ie.interviewee_id ASC
          `)
      : includeGenerated
      ? await pool
          .request()
          .input("projectId", sql.Int, Number(projectId))
          .query(`
            SELECT
              p.persona_id,
              p.persona_name,
              p.persona_description,
              latest.interview_id,
              latest.generated_output,
              latest.summary,
              latest.generated_at,
              latest.interviewee_id,
              latest.interviewee_name,
              latest.gender,
              latest.age,
              latest.location,
              latest.relationship_status,
              latest.title,
              latest.education
            FROM personass p
            OUTER APPLY (
              SELECT TOP 1
                i.interview_id,
                i.persona_output AS generated_output,
                i.summary,
                i.created_at AS generated_at,
                ie.interviewee_id,
                ie.name AS interviewee_name,
                ie.gender,
                ie.age,
                ie.location,
                ie.relationship_status,
                ie.title,
                ie.education
              FROM intervieweess ie
              INNER JOIN interviewss i ON i.interviewee_id = ie.interviewee_id
              WHERE ie.persona_id = p.persona_id
                AND LTRIM(RTRIM(ISNULL(i.persona_output, ''))) <> ''
              ORDER BY i.created_at DESC, i.interview_id DESC
            ) latest
            WHERE p.project_id = @projectId
          `)
      : await pool
          .request()
          .input("projectId", sql.Int, Number(projectId))
          .query(`
            SELECT persona_id, persona_name, persona_description
            FROM personass
            WHERE project_id = @projectId
          `);

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("PERSONA FETCH ERROR:", error);

    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}