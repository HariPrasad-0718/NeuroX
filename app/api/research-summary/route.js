import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { cleanResearchSummary } from "@/lib/cleanResearchSummary";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME =
  process.env.AGENT5I_USERNAME ||
  process.env.AGENT_USERNAME ||
  "";

const PASSWORD =
  process.env.AGENT5I_PASSWORD ||
  process.env.AGENT_PASSWORD ||
  "";

const AGENT_NAME =
  process.env.AGENT5I_RESEARCH_SUMMARY_AGENT_NAME ||
  "User Research Summary Report Generator";

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId is required",
        },
        { status: 400 }
      );
    }

    if (!USERNAME || !PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: "Agent credentials are missing.",
        },
        { status: 500 }
      );
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("projectId", sql.Int, Number(projectId))
      .query(`
        SELECT TOP 1

            p.description,

            i.summary,

            i.persona_output,

            gp.generated_output

        FROM projectss p

        LEFT JOIN personass pe
            ON pe.project_id = p.project_id

        LEFT JOIN intervieweess ie
            ON ie.persona_id = pe.persona_id

        LEFT JOIN interviewss i
            ON i.interviewee_id = ie.interviewee_id

        LEFT JOIN generated_personass gp
            ON gp.project_id = p.project_id

        WHERE p.project_id = @projectId

        ORDER BY
            i.created_at DESC,
            gp.created_at DESC
      `);

    if (!result.recordset.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Project data not found.",
        },
        { status: 404 }
      );
    }

    const row = result.recordset[0];

    const payload = {
      username: USERNAME,
      password: PASSWORD,
      name: AGENT_NAME,

      project_description: row.description || "",
      research_summary: row.summary || "",
      empathy_map: row.persona_output || "",
      persona_card: row.generated_output || "",
    };

    console.log("========== Research Summary Payload ==========");
    console.log(payload);

    let response;

    try {
      response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000),
      });
    } catch (err) {
      if (err?.name === "TimeoutError") {
        return NextResponse.json(
          {
            success: false,
            error: "Agent request timed out.",
          },
          { status: 504 }
        );
      }

      throw err;
    }

    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent request failed (${response.status})`,
          raw: rawText,
        },
        { status: response.status }
      );
    }

    const parsed = tryParseJson(rawText);
    console.log("TOP LEVEL KEYS:");
console.log(Object.keys(parsed));

console.log("PARSED OBJECT:");
console.dir(parsed, { depth: null });

    let report = "";

    if (parsed) {
      report =
    parsed.output?.content ||
    parsed.output ||
    parsed.content ||
    parsed.message ||
    parsed.final_response ||
    "";
    } else {
      report = rawText;
    }
    console.log("RAW TEXT:");
console.log(rawText);

console.log("PARSED RESPONSE:");
console.dir(parsed, { depth: null });
    report = cleanResearchSummary(report);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: "Agent returned an empty report.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Research Summary API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}