// app/api/persona-questions/route.js
//
// GET /api/persona-questions?personaId=123
//
// Returns the PERSONA-LEVEL question data — the most recent interview row that
// has question_agent_output set, across ALL interviewees in this persona.
// This is read-only; questions are still generated via POST /api/generate-questions.

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateQuery } from "@/lib/validate";
import { z } from "zod";

const querySchema = z.object({
  personaId: z
    .string()
    .regex(/^\d+$/, "personaId must be a positive integer")
    .transform(Number),
});

export const GET = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = validateQuery(request, querySchema);
  if (validationError) return validationError;

  const { personaId } = data;

  try {
    const pool = await getPool();

    // ── 1. Fetch persona-level question agent outputs ──────────────────────────
    // Find the most recent interview (across any interviewee in this persona)
    // that has question_agent_output populated. This is the "canonical" question
    // set for the whole persona.
    const agentOutputResult = await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT TOP 1
          i.interview_id,
          i.question_agent_output,
          i.process_discovery_output,
          i.created_at
        FROM interviewss i
        INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
        INNER JOIN personass p      ON ie.persona_id    = p.persona_id
        INNER JOIN projectss pr     ON p.project_id     = pr.project_id
        WHERE p.persona_id     = @personaId
          AND pr.created_by    = @userId
          AND i.question_agent_output IS NOT NULL
        ORDER BY i.created_at DESC, i.interview_id DESC
      `);

    const agentRow = agentOutputResult.recordset[0] || null;

    // ── 2. Fetch question texts from that same interview ───────────────────────
    let questions = [];
    if (agentRow?.interview_id) {
      const questionTextsResult = await pool
        .request()
        .input("interviewId", sql.Int, agentRow.interview_id)
        .query(`
          SELECT question_text
          FROM questionss
          WHERE interview_id = @interviewId
          ORDER BY question_id ASC
        `);
      questions = questionTextsResult.recordset.map((r) => r.question_text);
    }

    // ── 3. Parse JSON agent outputs safely ────────────────────────────────────
    const safeParse = (raw) => {
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    };

    const hasQuestions = questions.length > 0 || !!agentRow;

    return NextResponse.json({
      success: true,
      data: {
        hasQuestions,
        questionAgentOutput:     safeParse(agentRow?.question_agent_output),
        processDiscoveryOutput:  safeParse(agentRow?.process_discovery_output),
        questions,
        generatedAt: agentRow?.created_at ?? null,
      },
    });
  } catch (error) {
    console.error("Persona Questions GET error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});