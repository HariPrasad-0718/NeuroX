import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5idev.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const APP_PROMPT_AGENT_NAME =
  process.env.AGENT5I_APP_PROMPT_AGENT_NAME || "Prompt Generator Agent";

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value).trim();
}

function extractPrompt(rawMessage) {
  if (rawMessage && typeof rawMessage === "object") {
    return rawMessage;
  }

  if (typeof rawMessage === "string") {
    let cleaned = rawMessage.trim();
    cleaned = cleaned.replace(/^```json/i, "");
    cleaned = cleaned.replace(/^```/, "");
    cleaned = cleaned.replace(/```$/, "");
    cleaned = cleaned.trim();

    const direct = tryParseJson(cleaned);
    if (direct) return direct;

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const extracted = tryParseJson(match[0]);
      if (extracted) return extracted;
    }
  }

  return null;
}

function pickPrompt(parsed, rawMessage) {
  if (parsed && typeof parsed === "object") {
    const candidates = [
      parsed.PROMPT,
      parsed.prompt,
      parsed.generated_prompt,
      parsed.output_prompt,
      parsed.app_prompt,
      parsed.message,
      parsed.output,
      parsed.result,
      parsed.text,
    ];

    for (const candidate of candidates) {
      const text = normalizeText(candidate);
      if (text) return text;
    }
  }

  return normalizeText(rawMessage);
}

function toShortList(items, max = 5) {
  return items.filter(Boolean).slice(0, max);
}

function buildUserInput({
  project,
  problemStatement,
  processFlow,
  iaData,
  personas,
  interviews,
  interviewees,
}) {
  const sections = [];

  sections.push(`Project Name:\n${normalizeText(project?.project_name) || "N/A"}`);
  sections.push(`Client Name:\n${normalizeText(project?.client_name) || "N/A"}`);
  sections.push(`Project Description:\n${normalizeText(project?.description) || "N/A"}`);

  sections.push(`Problem Statement:\n${normalizeText(problemStatement) || "N/A"}`);

  sections.push(
    `Process Flow:\n${
      normalizeText(processFlow)
        ? JSON.stringify(processFlow, null, 2)
        : "N/A"
    }`
  );

  sections.push(
    `Information Architecture:\n${
      normalizeText(iaData)
        ? JSON.stringify(iaData, null, 2)
        : "N/A"
    }`
  );

  if (personas.length) {
    sections.push(
      `Generated Personas:\n${personas
        .map((persona, index) => `Persona ${index + 1}:\n${normalizeText(persona)}`)
        .join("\n\n")}`
    );
  } else {
    sections.push("Generated Personas:\nN/A");
  }

  if (interviewees.length) {
    sections.push(
      `Interviewees:\n${interviewees
        .map(
          (item, index) =>
            `${index + 1}. ${normalizeText(item.name) || "Unknown"} | ${
              normalizeText(item.title) || "No title"
            } | ${normalizeText(item.location) || "No location"}`
        )
        .join("\n")}`
    );
  } else {
    sections.push("Interviewees:\nN/A");
  }

  if (interviews.length) {
    sections.push(
      `Interview Summaries and Outcomes:\n${interviews
        .map((row, index) => {
          const summary = normalizeText(row.summary) || "No summary";
          const outcome = normalizeText(row.interview_outcome) || "No interview outcome";
          const transcriptSnippet = normalizeText(row.transcript).slice(0, 1500) || "No transcript";

          return [
            `Interview ${index + 1}:`,
            `Summary: ${summary}`,
            `Outcome: ${outcome}`,
            `Transcript Snippet: ${transcriptSnippet}`,
          ].join("\n");
        })
        .join("\n\n")}`
    );
  } else {
    sections.push("Interview Summaries and Outcomes:\nN/A");
  }

  return sections.join("\n\n");
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "projectId is required" },
        { status: 400 }
      );
    }

    if (!USERNAME || !PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Agent credentials are missing. Set AGENT5I_USERNAME and AGENT5I_PASSWORD.",
        },
        { status: 500 }
      );
    }

    const pool = await getPool();
    const projectIdNumber = Number(projectId);

    const [projectResult, problemResult, personasResult, intervieweesResult, interviewsResult, iaResult] =
      await Promise.all([
        pool
          .request()
          .input("projectId", sql.Int, projectIdNumber)
          .query(
            "SELECT TOP 1 project_name, client_name, description FROM projectss WHERE project_id = @projectId"
          ),
        pool
          .request()
          .input("projectId", sql.Int, projectIdNumber)
          .query(
            "SELECT TOP 1 problem_statement FROM problem_statements WHERE project_id = @projectId ORDER BY updated_at DESC"
          ),
        pool
          .request()
          .input("projectId", sql.Int, projectIdNumber)
          .query(
            "SELECT TOP 3 generated_output FROM generated_personass WHERE project_id = @projectId ORDER BY created_at DESC"
          ),
        pool
          .request()
          .input("projectId", sql.Int, projectIdNumber)
          .query(`
            SELECT TOP 10 i.name, i.title, i.location
            FROM intervieweess i
            INNER JOIN personass p ON p.persona_id = i.persona_id
            WHERE p.project_id = @projectId
            ORDER BY i.created_at DESC
          `),
        pool
          .request()
          .input("projectId", sql.Int, projectIdNumber)
          .query(`
            SELECT TOP 5 iv.summary, iv.interview_outcome, iv.transcript
            FROM interviewss iv
            INNER JOIN intervieweess ie ON ie.interviewee_id = iv.interviewee_id
            INNER JOIN personass p ON p.persona_id = ie.persona_id
            WHERE p.project_id = @projectId
            ORDER BY iv.created_at DESC
          `),
        pool
          .request()
          .input("projectId", sql.Int, projectIdNumber)
          .query(
            "SELECT TOP 1 ia FROM InformationArchitecture WHERE project_id = @projectId ORDER BY created_at DESC"
          ),
      ]);

    let processFlow = null;
    try {
      const pfResult = await pool
        .request()
        .input("projectId", sql.Int, projectIdNumber)
        .query(
          "SELECT TOP 1 process_flow FROM ProcessFlow WHERE project_id = @projectId ORDER BY created_at DESC"
        );

      processFlow = tryParseJson(pfResult.recordset?.[0]?.process_flow) || pfResult.recordset?.[0]?.process_flow || null;
    } catch {
      processFlow = null;
    }

    const project = projectResult.recordset?.[0] || null;

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const problemStatement = problemResult.recordset?.[0]?.problem_statement || "";

    const personas = toShortList(
      (personasResult.recordset || []).map((row) => {
        const parsed = tryParseJson(row.generated_output);
        return parsed || row.generated_output;
      }),
      3
    );

    const interviewees = toShortList(intervieweesResult.recordset || [], 10);
    const interviews = toShortList(interviewsResult.recordset || [], 5);

    const iaRaw = iaResult.recordset?.[0]?.ia;
    const iaData = tryParseJson(iaRaw) || iaRaw || null;

    const userInput = buildUserInput({
      project,
      problemStatement,
      processFlow,
      iaData,
      personas,
      interviews,
      interviewees,
    });

    const payload = {
      name: APP_PROMPT_AGENT_NAME,
      user_input: userInput,
      username: USERNAME,
      password: PASSWORD,
    };

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180000),
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent request failed (${response.status})`,
          raw: text.slice(0, 1200),
        },
        { status: response.status }
      );
    }

    const data = tryParseJson(text) || { message: text };
    const rawMessage = data?.message ?? data?.output ?? text;
    const parsed = extractPrompt(rawMessage);
    const prompt = pickPrompt(parsed, rawMessage);

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "No prompt found in agent response",
          raw: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt,
      rawMessage,
      payloadPreview: {
        name: payload.name,
        user_input: userInput,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.name === "TimeoutError"
            ? "Agent request timed out"
            : error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
