import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET interviewees
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get("personaId");

    if (!personaId) {
      return NextResponse.json(
        { success: false, error: { message: "personaId required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("personaId", sql.Int, Number(personaId))
      .query(`
        SELECT * FROM intervieweess
        WHERE persona_id = @personaId
      `);

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("INTERVIEWEE API ERROR:", error);

    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// POST interviewee
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      personaId,
      name,
      gender,
      age,
      location,
      relationship_status,
      title,
      education,
    } = body;

    const pool = await getPool();

    await pool
      .request()
      .input("personaId", sql.Int, personaId)
      .input("name", sql.NVarChar, name)
      .input("gender", sql.NVarChar, gender)
      .input("age", sql.Int, age || null)
      .input("location", sql.NVarChar, location)
      .input("relationship_status", sql.NVarChar, relationship_status)
      .input("title", sql.NVarChar, title)
      .input("education", sql.NVarChar, education)
      .query(`
        INSERT INTO intervieweess
        (persona_id, name, gender, age, location, relationship_status, title, education)
        VALUES
        (@personaId, @name, @gender, @age, @location, @relationship_status, @title, @education)
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("INTERVIEWEE INSERT ERROR:", error);

    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}