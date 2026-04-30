import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const includeGenerated = String(searchParams.get("includeGenerated") || "").toLowerCase() === "true";
    const groupByInterviewee = String(searchParams.get("groupByInterviewee") || "").toLowerCase() === "true";

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

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
              latest.generated_at
            FROM personass p
            LEFT JOIN intervieweess ie ON ie.persona_id = p.persona_id
            OUTER APPLY (
              SELECT TOP 1
                i.interview_id,
                i.persona_output AS generated_output,
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