import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { generatePersonaFromTranscript } from "@/lib/agent5i";

async function getOwnedInterviewContext(pool, interviewId, userId) {
  const result = await pool
    .request()
    .input("interviewId", sql.Int, interviewId)
    .input("userId", sql.Int, userId)
    .query(`
      SELECT
        i.interview_id,
        i.transcript,
        ie.name AS interviewee_name,
        pr.description AS project_description
      FROM interviewss i
      INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
      INNER JOIN personass p ON ie.persona_id = p.persona_id
      INNER JOIN projectss pr ON p.project_id = pr.project_id
      WHERE i.interview_id = @interviewId
        AND pr.created_by = @userId
    `);

  return result.recordset[0] || null;
}

// GET /api/generate-persona?interviewId=123
export async function GET(request) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser?.userId) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const interviewId = Number(searchParams.get("interviewId"));

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: { message: "interviewId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const context = await getOwnedInterviewContext(
      pool,
      interviewId,
      Number(sessionUser.userId)
    );

    if (!context) {
      return NextResponse.json(
        { success: false, error: { message: "Interview not found" } },
        { status: 404 }
      );
    }

    const personaResult = await pool
      .request()
      .input("interviewId", sql.Int, interviewId)
      .query(`
        SELECT persona_output, created_at
        FROM interviewss
        WHERE interview_id = @interviewId
      `);

    const latest = personaResult.recordset[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        interviewId,
        persona_output: latest?.persona_output || "",
        created_at: latest?.created_at ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/generate-persona
// Body: { interviewId, transcript? }
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
    const interviewId = Number(body?.interviewId);
    const transcriptFromBody = typeof body?.transcript === "string" ? body.transcript : null;

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: { message: "interviewId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const context = await getOwnedInterviewContext(
      pool,
      interviewId,
      Number(sessionUser.userId)
    );

    if (!context) {
      return NextResponse.json(
        { success: false, error: { message: "Interview not found" } },
        { status: 404 }
      );
    }

    const transcript = (transcriptFromBody ?? context.transcript ?? "").trim();

    if (!transcript) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "user_answers is required - no saved interview answers found for this interview",
          },
        },
        { status: 400 }
      );
    }

    if (transcriptFromBody !== null) {
      await pool
        .request()
        .input("interviewId", sql.Int, interviewId)
        .input("transcript", sql.NVarChar(sql.MAX), transcript)
        .query(`
          UPDATE interviewss
          SET transcript = @transcript
          WHERE interview_id = @interviewId
        `);
    }

    const personaOutput = await generatePersonaFromTranscript({
      projectDescription: context.project_description || "Project context not provided",
      userAnswers: transcript,
      personaName: context.interviewee_name || "",
    });

    await pool
      .request()
      .input("interviewId", sql.Int, interviewId)
      .input("personaOutput", sql.NVarChar(sql.MAX), personaOutput)
      .query(`
        UPDATE interviewss
        SET persona_output = @personaOutput
        WHERE interview_id = @interviewId
      `);

    return NextResponse.json({
      success: true,
      data: {
        interviewId,
        persona_output: personaOutput,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Unexpected server error" } },
      { status: 500 }
    );
  }
}
