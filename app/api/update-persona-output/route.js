import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { updatePersonaOutputSchema } from "@/lib/schemas";

// POST /api/update-persona-output
// Body: { interviewId, personaOutput }
export const POST = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = await validateBody(request, updatePersonaOutputSchema);
  if (validationError) return validationError;

  const { interviewId, personaOutput } = data;

  try {
    const pool = await getPool();

    const ownershipCheck = await pool
      .request()
      .input("interviewId", sql.Int, interviewId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT i.interview_id
        FROM interviewss i
        INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
        INNER JOIN personass p ON ie.persona_id = p.persona_id
        INNER JOIN projectss pr ON p.project_id = pr.project_id
        WHERE i.interview_id = @interviewId
          AND pr.created_by = @userId
      `);

    if (!ownershipCheck.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Interview not found" } },
        { status: 404 }
      );
    }

    await pool
      .request()
      .input("interviewId", sql.Int, interviewId)
      .input("personaOutput", sql.NVarChar(sql.MAX), personaOutput)
      .query(`
        UPDATE interviewss
        SET persona_output = @personaOutput
        WHERE interview_id = @interviewId
      `);

    return NextResponse.json({ success: true, data: { interviewId } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Unexpected server error" } },
      { status: 500 }
    );
  }
});
