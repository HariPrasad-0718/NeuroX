import { NextResponse } from "next/server";

const WEBHOOK_URL =
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT_USERNAME;
const PASSWORD = process.env.AGENT_PASSWORD;

const UX_JOURNEY_AGENT_NAME = "UX Journey Flow Generator";

function extractUxJourney(data) {
  if (!data) return {};

  // String response
  if (typeof data === "string") {
    let cleaned = data.trim();

    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "");
    }

    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "");
    }

    cleaned = cleaned.replace(/```$/, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return extractUxJourney(parsed);
    } catch {
      return {};
    }
  }

  // Array response
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = extractUxJourney(item);
      if (result?.nodes && result?.edges) {
        return result;
      }
    }
  }

  // Object response
  if (typeof data === "object") {
    if (data.nodes && data.edges) {
      return data;
    }

    const wrapperKeys = [
      "process_flow",
      "flow",
      "message",
      "output",
      "result",
      "text",
      "response",
      "data",
    ];

    for (const key of wrapperKeys) {
      if (!data[key]) continue;

      const result = extractUxJourney(data[key]);

      if (result?.nodes && result?.edges) {
        return result;
      }
    }
  }

  return {};
}

function buildPayload(body) {
  const section = (label, value) => {
    if (!value) return "";
    return `[${label}]\n${value}\n`;
  };

  const userInput = [
    section("PROJECT DESCRIPTION", body.project_description),
    section("PERSONA NAME", body.persona_name),
    section("INTERVIEW TRANSCRIPTS", body.user_answers),
    section("RESEARCH SUMMARY", body.research_summary),
    section("EMPATHY MAP", body.empathy_map),
    section("PAIN POINTS", body.pain_points),
    section("NEEDS", body.needs),
    section("BACKGROUND", body.background),
    section("DEMOGRAPHICS", body.demographics),
    section("SCENARIO", body.scenario),
    section("PERSONALITY", body.personality),
    section("GOALS", body.goals),
    section("FRUSTRATIONS", body.frustrations),
    section("MOTIVATIONS", body.motivations),
    section("PREVIOUS EXPERIENCE", body.previous_experience),
    section("BEHAVIOURS AND HABITS", body.behaviours_habits),
    section("POSITIVE THEMES", body.positive_themes),
    section("NEGATIVE THEMES", body.negative_themes),
    section("NEEDS AND EXPECTATIONS", body.needs_expectations),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    username: USERNAME,
    password: PASSWORD,
    name: UX_JOURNEY_AGENT_NAME,

    ...body,

    rules: [],
    user_input: userInput,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.project_description) {
      return NextResponse.json(
        { error: "project_description is required" },
        { status: 400 }
      );
    }

    const payload = buildPayload(body);

    console.log("UX JOURNEY PAYLOAD:", payload);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    console.log("UX JOURNEY RAW RESPONSE:", parsed);

    const flow = extractUxJourney(parsed);

    if (!flow?.nodes || !flow?.edges) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to extract process flow",
          raw: parsed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      process_flow: flow,
    });
  } catch (error) {
    console.error("UX JOURNEY ERROR:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}