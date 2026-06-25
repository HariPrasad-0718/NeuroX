import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody, validateQuery } from "@/lib/validate";
import { generatePersonaQuestions, generateSummaryFromTranscript } from "@/lib/agent5i";
import { generateQuestionsSchema, updateTranscriptSchema, positiveInt } from "@/lib/schemas";
import { z } from "zod";
import { aiStandardLimiter, rateLimitedResponse } from "@/lib/rateLimit";

// Accept either intervieweeId OR personaId on GET
const getQuestionsQuerySchema = z
  .object({
    intervieweeId: positiveInt.optional(),
    personaId:     positiveInt.optional(),
  })
  .refine((d) => d.intervieweeId != null || d.personaId != null, {
    message: "Provide either intervieweeId or personaId",
  });

function groupQuestionHistory(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.interview_id)) {
      map.set(row.interview_id, {
        interviewId: row.interview_id,
        createdAt:   row.created_at,
        transcript:  row.transcript  || "",
        personaOutput: row.persona_output || "",

        questionAgentOutput: (() => {
          try {
            return row.question_agent_output
              ? JSON.parse(row.question_agent_output)
              : [];
          } catch { return []; }
        })(),

        processDiscoveryOutput: (() => {
          try {
            return row.process_discovery_output
              ? JSON.parse(row.process_discovery_output)
              : [];
          } catch { return []; }
        })(),

        questions: [],
      });
    }

    if (row.question_text) {
      map.get(row.interview_id).questions.push(row.question_text);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/generate-questions?intervieweeId=123
//   → returns question history for one specific interviewee (existing behaviour)
//
// GET /api/generate-questions?personaId=456
//   → returns the SHARED questions for the persona (used to pre-populate new
//     interviewees before their own interview row is created)
// ─────────────────────────────────────────────────────────────────────────────
export const GET = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = validateQuery(request, getQuestionsQuerySchema);
  if (validationError) return validationError;

  const { intervieweeId, personaId } = data;

  try {
    const pool = await getPool();

    // ── Path A: fetch by intervieweeId (normal per-interviewee load) ──────────
    if (intervieweeId != null) {
      const result = await pool
        .request()
        .input("intervieweeId", sql.Int, intervieweeId)
        .input("userId",        sql.Int, Number(user.userId))
        .query(`
          SELECT
            i.interview_id,
            i.created_at,
            i.transcript,
            i.persona_output,
            i.question_agent_output,
            i.process_discovery_output,
            q.question_text
          FROM interviewss i
          INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
          INNER JOIN personass p      ON ie.persona_id    = p.persona_id
          INNER JOIN projectss pr     ON p.project_id     = pr.project_id
          LEFT  JOIN questionss q     ON i.interview_id   = q.interview_id
          WHERE ie.interviewee_id = @intervieweeId
            AND pr.created_by     = @userId
          ORDER BY i.created_at DESC, q.question_id ASC
        `);

      const history = groupQuestionHistory(result.recordset);

      return NextResponse.json({
        success: true,
        data: { latest: history[0] || null, history },
      });
    }

    // ── Path B: fetch by personaId — return the most recent shared questions ──
    // We find the newest interview that has questions across ALL interviewees
    // in this persona. This is what gets displayed when a brand-new interviewee
    // (who has no interview row yet) is opened.
    const result = await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .input("userId",    sql.Int, Number(user.userId))
      .query(`
        SELECT TOP 1
          i.interview_id,
          i.created_at,
          i.question_agent_output,
          i.process_discovery_output,
          q.question_text
        FROM interviewss i
        INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
        INNER JOIN personass p      ON ie.persona_id    = p.persona_id
        INNER JOIN projectss pr     ON p.project_id     = pr.project_id
        INNER JOIN questionss q     ON i.interview_id   = q.interview_id  -- INNER: must have questions
        WHERE p.persona_id    = @personaId
          AND pr.created_by   = @userId
        ORDER BY i.created_at DESC, q.question_id ASC
      `);

    if (!result.recordset.length) {
      // No questions generated for this persona yet
      return NextResponse.json({
        success: true,
        data: {
          hasQuestions:          false,
          questionAgentOutput:   [],
          processDiscoveryOutput: [],
          questions:             [],
        },
      });
    }

    // Parse the JSON agent outputs once (same value on every row)
    const firstRow = result.recordset[0];
    let questionAgentOutput   = [];
    let processDiscoveryOutput = [];
    try { questionAgentOutput   = firstRow.question_agent_output   ? JSON.parse(firstRow.question_agent_output)   : []; } catch { /* no-op */ }
    try { processDiscoveryOutput = firstRow.process_discovery_output ? JSON.parse(firstRow.process_discovery_output) : []; } catch { /* no-op */ }

    const questions = result.recordset
      .map((r) => r.question_text)
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        hasQuestions:          true,
        questionAgentOutput,
        processDiscoveryOutput,
        questions,
      },
    });
  } catch (error) {
    console.error("Generate Questions GET Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message, stack: error.stack } },
      { status: 500 }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/generate-questions
// Body: { interviewId, transcript }
// ─────────────────────────────────────────────────────────────────────────────
export const PATCH = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = await validateBody(request, updateTranscriptSchema);
  if (validationError) return validationError;

  const { interviewId, transcript } = data;

  try {
    const pool = await getPool();

    const ownerCheck = await pool
      .request()
      .input("interviewId", sql.Int, interviewId)
      .input("userId",      sql.Int, Number(user.userId))
      .query(`
        SELECT
          i.interview_id,
          pr.description  AS project_description,
          ie.name         AS interviewee_name
        FROM interviewss i
        INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
        INNER JOIN personass p      ON ie.persona_id    = p.persona_id
        INNER JOIN projectss pr     ON p.project_id     = pr.project_id
        WHERE i.interview_id  = @interviewId
          AND pr.created_by   = @userId
      `);

    if (!ownerCheck.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Interview not found" } },
        { status: 404 }
      );
    }

    const interviewContext    = ownerCheck.recordset[0];
    const normalizedTranscript = transcript.trim();
    let computedSummary       = null;

    if (normalizedTranscript) {
      try {
        computedSummary = await generateSummaryFromTranscript({
          projectDescription: interviewContext.project_description || "Project context not provided",
          userAnswers:        normalizedTranscript,
          personaName:        interviewContext.interviewee_name || "",
        });
      } catch {
        // non-fatal — continue without summary
      }
    }

    await pool
      .request()
      .input("interviewId", sql.Int,              interviewId)
      .input("transcript",  sql.NVarChar(sql.MAX), transcript)
      .input("summary",     sql.NVarChar(sql.MAX), computedSummary)
      .query(`
        UPDATE interviewss
        SET transcript = @transcript,
            summary    = @summary
        WHERE interview_id = @interviewId
      `);

    return NextResponse.json({
      success: true,
      data: { summaryGenerated: Boolean(computedSummary) },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/generate-questions
// Body: { personaId, description, user_group, persona_description }
// Generates questions once and writes them to EVERY interviewee in the persona.
// ─────────────────────────────────────────────────────────────────────────────
export const POST = withAuth(async (request, _ctx, user) => {
  const { data, error: validationError } = await validateBody(request, generateQuestionsSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiStandardLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  const {
    personaId,
    projectName,
    description,
    user_group:           userGroup,
    persona_description:  personaDescription,
  } = data;

  try {
    const pool = await getPool();

    // Ownership check
    const ownershipResult = await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .input("userId",    sql.Int, Number(user.userId))
      .query(`
        SELECT p.persona_id
        FROM personass p
        INNER JOIN projectss pr ON p.project_id = pr.project_id
        WHERE p.persona_id    = @personaId
          AND pr.created_by   = @userId
      `);

    if (!ownershipResult.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Persona not found" } },
        { status: 404 }
      );
    }

    // All interviewees under this persona
    const intervieweesResult = await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .query(`
        SELECT interviewee_id
        FROM intervieweess
        WHERE persona_id = @personaId
      `);

    const interviewees = intervieweesResult.recordset;
    if (!interviewees.length) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Add at least one interviewee before generating questions" },
        },
        { status: 400 }
      );
    }

    // Generate questions once for the whole persona
    const { questionAgentQuestions, processDiscoveryQuestions } =
      await generatePersonaQuestions({
        projectName,
        description,
        userGroup,
        personaDescription,
      });

    const questions = [
      ...new Set([...questionAgentQuestions, ...processDiscoveryQuestions]),
    ];

    const questionAgentOutputJson    = JSON.stringify(questionAgentQuestions);
    const processDiscoveryOutputJson = JSON.stringify(processDiscoveryQuestions);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const interviewee of interviewees) {
        // Find the existing interview row (if any)
        const latestInterviewResult = await new sql.Request(transaction)
          .input("intervieweeId", sql.Int, interviewee.interviewee_id)
          .query(`
            SELECT TOP 1 interview_id
            FROM interviewss
            WHERE interviewee_id = @intervieweeId
            ORDER BY created_at DESC, interview_id DESC
          `);

        let interviewId = latestInterviewResult.recordset[0]?.interview_id;

        if (!interviewId) {
          // New interviewee with no interview row yet — create one
          const insertedInterview = await new sql.Request(transaction)
            .input("intervieweeId", sql.Int, interviewee.interviewee_id)
            .query(`
              INSERT INTO interviewss (interviewee_id, transcript, persona_output)
              OUTPUT INSERTED.interview_id
              VALUES (@intervieweeId, NULL, NULL)
            `);
          interviewId = insertedInterview.recordset[0].interview_id;
        } else {
          // Existing interview — clear old questions but KEEP transcript & persona_output
          // so that previously submitted interviewee data is not destroyed on regenerate.
          await new sql.Request(transaction)
            .input("interviewId", sql.Int, interviewId)
            .query(`
              DELETE FROM questionss
              WHERE interview_id = @interviewId
            `);
        }

        // Write the fresh agent outputs to every interview row
        await new sql.Request(transaction)
          .input("interviewId",             sql.Int,              interviewId)
          .input("questionAgentOutput",     sql.NVarChar(sql.MAX), questionAgentOutputJson)
          .input("processDiscoveryOutput",  sql.NVarChar(sql.MAX), processDiscoveryOutputJson)
          .query(`
            UPDATE interviewss
            SET question_agent_output    = @questionAgentOutput,
                process_discovery_output = @processDiscoveryOutput
            WHERE interview_id = @interviewId
          `);

        // Insert each question for this interviewee
        for (const questionText of questions) {
          await new sql.Request(transaction)
            .input("interviewId",  sql.Int,       interviewId)
            .input("questionText", sql.NVarChar,   questionText)
            .query(`
              INSERT INTO questionss (interview_id, question_text)
              VALUES (@interviewId, @questionText)
            `);
        }
      }

      await transaction.commit();
    } catch (transactionError) {
      try { await transaction.rollback(); } catch { /* no-op */ }
      throw transactionError;
    }

    return NextResponse.json({
      success: true,
      data: {
        questionAgentQuestions,
        processDiscoveryQuestions,
        appliedToInterviewees: interviewees.length,
      },
    });
  } catch (error) {
    console.error("Generate Questions POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message, stack: error.stack } },
      { status: 500 }
    );
  }
});