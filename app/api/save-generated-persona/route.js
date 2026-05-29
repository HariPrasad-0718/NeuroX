import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// ======================================================
// HELPERS
// ======================================================

function toText(value) {
  if (!value) return "";

  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).trim())
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }

  return String(value).trim();
}

function extractPersonaName(persona) {
  if (persona.personaName) {
    return String(persona.personaName).trim();
  }

  const header = String(persona.header || "").trim();

  if (!header) return "Persona";

  return header
    .split("—")[0]
    .split(",")[0]
    .trim();
}

// ======================================================
// MAIN API
// ======================================================

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get("projectId"));

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });
    }

    const pool = await getPool();

    const [psResult, gpResult] = await Promise.all([
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`SELECT problem_statement FROM problem_statements WHERE project_id = @projectId`),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`SELECT generated_output, behaviour_and_habits FROM generated_personass WHERE project_id = @projectId`),
    ]);

    if (!gpResult.recordset.length) {
      return NextResponse.json({ success: true, exists: false });
    }

    const problemStatement = psResult.recordset[0]?.problem_statement || "";
    const personas = gpResult.recordset
      .map((row) => {
        try {
          const card = JSON.parse(row.generated_output);
          if (!card.behaviours && row.behaviour_and_habits) card.behaviours = row.behaviour_and_habits;
          return card;
        } catch { return null; }
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, exists: true, problemStatement, personas });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      projectId,
      problemStatement,
      personas,
    } = body;

    console.log("SAVE API BODY:", body);
console.log("PERSONAS:", personas);
    // ======================================================
    // VALIDATION
    // ======================================================

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId required",
        },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // ======================================================
    // SAVE / UPDATE PROBLEM STATEMENT
    // ======================================================

    if (String(problemStatement || "").trim()) {
      await pool
        .request()
        .input("projectId", sql.Int, Number(projectId))
        .input(
          "problemStatement",
          sql.NVarChar(sql.MAX),
          String(problemStatement).trim()
        )
        .query(`
          MERGE problem_statements AS target
          USING (
            SELECT
              @projectId AS project_id,
              @problemStatement AS problem_statement
          ) AS source

          ON target.project_id = source.project_id

          WHEN MATCHED THEN
            UPDATE SET
              problem_statement = source.problem_statement,
              updated_at = GETDATE()

          WHEN NOT MATCHED THEN
            INSERT (
              project_id,
              problem_statement
            )
            VALUES (
              source.project_id,
              source.problem_statement
            );
        `);
    }

    // ======================================================
    // DELETE OLD GENERATED PERSONAS
    // ======================================================

    await pool
      .request()
      .input("projectId", sql.Int, Number(projectId))
      .query(`
        DELETE FROM generated_personass
        WHERE project_id = @projectId
      `);

    // ======================================================
    // INSERT GENERATED PERSONAS
    // ======================================================

    for (const persona of personas || []) {
        console.log("PERSONA INSERT:", persona);

      const personaName = extractPersonaName(persona);

      await pool
        .request()

        .input("projectId", sql.Int, Number(projectId))

        .input(
          "personaName",
          sql.NVarChar(150),
          personaName
        )

        .input(
          "demographics",
          sql.NVarChar(sql.MAX),
          toText(persona.demographics)
        )

        .input(
          "background",
          sql.NVarChar(sql.MAX),
          toText(persona.background)
        )

        .input(
          "scenarioText",
          sql.NVarChar(sql.MAX),
          toText(persona.scenario)
        )

        .input(
          "personality",
          sql.NVarChar(sql.MAX),
          toText(persona.personality)
        )

        .input(
          "behaviourAndHabits",
          sql.NVarChar(sql.MAX),
          toText(persona.behaviours)
        )

        .input(
          "goals",
          sql.NVarChar(sql.MAX),
          toText(persona.goals)
        )

        .input(
          "frustrations",
          sql.NVarChar(sql.MAX),
          toText(persona.frustrations)
        )

        .input(
          "motivations",
          sql.NVarChar(sql.MAX),
          toText(persona.motivations)
        )

        .input(
          "previousExperience",
          sql.NVarChar(sql.MAX),
          toText(persona.previousExperience)
        )

        .input(
          "positiveThemes",
          sql.NVarChar(sql.MAX),
          toText(persona.positiveThemes)
        )

        .input(
          "negativeThemes",
          sql.NVarChar(sql.MAX),
          toText(persona.negativeThemes)
        )

        .input(
          "needsExpectations",
          sql.NVarChar(sql.MAX),
          toText(persona.needs)
        )

        .input(
          "generatedOutput",
          sql.NVarChar(sql.MAX),
          JSON.stringify(persona)
        )

        .query(`
          INSERT INTO generated_personass (
            project_id,
            persona_name,
            demographics,
            background,
            scenario_text,
            personality,
            behaviour_and_habits,
            goals,
            frustrations,
            motivations,
            previous_experience,
            positive_themes,
            negative_themes,
            needs_expectations,
            generated_output
          )
          VALUES (
            @projectId,
            @personaName,
            @demographics,
            @background,
            @scenarioText,
            @personality,
            @behaviourAndHabits,
            @goals,
            @frustrations,
            @motivations,
            @previousExperience,
            @positiveThemes,
            @negativeThemes,
            @needsExpectations,
            @generatedOutput
          )
        `);
    }

    // ======================================================
    // SUCCESS
    // ======================================================

    return NextResponse.json({
      success: true,
      message: "Generated personas saved successfully",
    });

  } catch (error) {

    console.error(
      "SAVE GENERATED PERSONA ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}