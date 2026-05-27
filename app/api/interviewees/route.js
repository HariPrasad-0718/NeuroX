import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody, validateQuery } from "@/lib/validate";
import {
  getIntervieweesQuerySchema,
  createIntervieweeSchema,
  deleteIntervieweeQuerySchema,
} from "@/lib/schemas";

// GET interviewees
export const GET = withAuth(async (req) => {
  const { data, error: validationError } = validateQuery(req, getIntervieweesQuerySchema);
  if (validationError) return validationError;

  const { personaId } = data;

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .query(`
        SELECT * FROM intervieweess
        WHERE persona_id = @personaId
      `);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// POST interviewee
export const POST = withAuth(async (req) => {
  const { data, error: validationError } = await validateBody(req, createIntervieweeSchema);
  if (validationError) return validationError;

  const { personaId, name, gender, age, location, relationship_status, title, education } = data;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const insertIntervieweeResult = await new sql.Request(transaction)
      .input("personaId", sql.Int, personaId)
      .input("name", sql.NVarChar, name)
      .input("gender", sql.NVarChar, gender)
      .input("age", sql.Int, age ?? null)
      .input("location", sql.NVarChar, location)
      .input("relationship_status", sql.NVarChar, relationship_status)
      .input("title", sql.NVarChar, title)
      .input("education", sql.NVarChar, education)
      .query(`
        INSERT INTO intervieweess
        (persona_id, name, gender, age, location, relationship_status, title, education)
        OUTPUT INSERTED.interviewee_id
        VALUES
        (@personaId, @name, @gender, @age, @location, @relationship_status, @title, @education)
      `);

    const newIntervieweeId = insertIntervieweeResult.recordset[0].interviewee_id;

    const latestSetResult = await new sql.Request(transaction)
      .input("personaId", sql.Int, personaId)
      .input("newIntervieweeId", sql.Int, newIntervieweeId)
      .query(`
        SELECT TOP 1 i.interview_id
        FROM interviewss i
        INNER JOIN intervieweess ie ON i.interviewee_id = ie.interviewee_id
        WHERE ie.persona_id = @personaId
          AND ie.interviewee_id <> @newIntervieweeId
        ORDER BY i.created_at DESC
      `);

    if (latestSetResult.recordset.length > 0) {
      const templateInterviewId = latestSetResult.recordset[0].interview_id;

      const templateQuestionsResult = await new sql.Request(transaction)
        .input("templateInterviewId", sql.Int, templateInterviewId)
        .query(`
          SELECT question_text
          FROM questionss
          WHERE interview_id = @templateInterviewId
          ORDER BY question_id ASC
        `);

      if (templateQuestionsResult.recordset.length > 0) {
        const newInterviewResult = await new sql.Request(transaction)
          .input("intervieweeId", sql.Int, newIntervieweeId)
          .query(`
            INSERT INTO interviewss (interviewee_id, transcript)
            OUTPUT INSERTED.interview_id
            VALUES (@intervieweeId, NULL)
          `);

        const newInterviewId = newInterviewResult.recordset[0].interview_id;

        for (const row of templateQuestionsResult.recordset) {
          await new sql.Request(transaction)
            .input("interviewId", sql.Int, newInterviewId)
            .input("questionText", sql.NVarChar, row.question_text)
            .query(`
              INSERT INTO questionss (interview_id, question_text)
              VALUES (@interviewId, @questionText)
            `);
        }
      }
    }

    await transaction.commit();
    return NextResponse.json({ success: true });
  } catch (transactionError) {
    try { await transaction.rollback(); } catch { /* no-op */ }
    return NextResponse.json(
      { success: false, error: { message: transactionError.message } },
      { status: 500 }
    );
  }
});

// DELETE interviewee
export const DELETE = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = validateQuery(req, deleteIntervieweeQuerySchema);
  if (validationError) return validationError;

  const { intervieweeId } = data;

  try {
    const pool = await getPool();

    const ownershipResult = await pool
      .request()
      .input("intervieweeId", sql.Int, intervieweeId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT ie.interviewee_id
        FROM intervieweess ie
        INNER JOIN personass p ON ie.persona_id = p.persona_id
        INNER JOIN projectss pr ON p.project_id = pr.project_id
        WHERE ie.interviewee_id = @intervieweeId
          AND pr.created_by = @userId
      `);

    if (!ownershipResult.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Interviewee not found" } },
        { status: 404 }
      );
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("intervieweeId", sql.Int, intervieweeId)
        .query(`
          DELETE pi
          FROM persona_insightss pi
          INNER JOIN interviewss i ON pi.interview_id = i.interview_id
          WHERE i.interviewee_id = @intervieweeId
        `);

      await new sql.Request(transaction)
        .input("intervieweeId", sql.Int, intervieweeId)
        .query(`
          DELETE q
          FROM questionss q
          INNER JOIN interviewss i ON q.interview_id = i.interview_id
          WHERE i.interviewee_id = @intervieweeId
        `);

      await new sql.Request(transaction)
        .input("intervieweeId", sql.Int, intervieweeId)
        .query(`
          DELETE FROM interviewss
          WHERE interviewee_id = @intervieweeId
        `);

      await new sql.Request(transaction)
        .input("intervieweeId", sql.Int, intervieweeId)
        .query(`
          DELETE FROM intervieweess
          WHERE interviewee_id = @intervieweeId
        `);

      await transaction.commit();
    } catch (transactionError) {
      try { await transaction.rollback(); } catch { /* no-op */ }
      throw transactionError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
