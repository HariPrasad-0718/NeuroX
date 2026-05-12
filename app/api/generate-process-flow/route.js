import { NextResponse } from "next/server";

const WEBHOOK_URL =
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT_USERNAME;
const PASSWORD = process.env.AGENT_PASSWORD;

const UX_JOURNEY_AGENT_NAME = "UX Journey Flow Generator";

function extractUxJourney(data) {
  if (!data) return {};

  // String response
  // String response
if (typeof data === "string") {
  let cleaned = data.trim();

  // remove process_flow='...'
  if (cleaned.startsWith("process_flow='")) {
    cleaned = cleaned
      .replace(/^process_flow='/, "")
      .replace(/'$/, "");
  }

  // remove markdown wrappers
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
  } catch (err) {
    console.error("STRING PARSE ERROR:", err, cleaned);
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
function extractSection(text, sectionName) {
  if (!text) return "";

  const regex = new RegExp(
  `${sectionName}:\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Za-z\\s]+:|\\Z)`,
  "i"
);

  const match = text.match(regex);

  return match ? match[1].trim() : "";
}

function buildPayload(body) {
  const empathyMap = body.empathy_map || "";

  const user_answers =
    extractSection(empathyMap, "Says") || "No interview transcripts available";

  const research_summary =
    extractSection(empathyMap, "User Summary") ||
    extractSection(empathyMap, "Summary") ||
    "No research summary available";

  const pain_points =
    extractSection(empathyMap, "Pain Points") ||
    "No pain points available";

  const needs =
    extractSection(empathyMap, "Needs") ||
    "No needs available";

  const background =
    extractSection(empathyMap, "Education") ||
    "No background available";

  const demographics = `
Gender: ${extractSection(empathyMap, "Gender") || "Unknown"}
Age: ${extractSection(empathyMap, "Age") || "Unknown"}
Location: ${extractSection(empathyMap, "Location") || "Unknown"}
Relationship Status: ${
    extractSection(empathyMap, "Relationship Status") || "Unknown"
  }
`.trim();

  const scenario =
    extractSection(empathyMap, "Scenario") ||
    "User wants a structured and connected UX workflow";

  const personality =
    extractSection(empathyMap, "Feels") ||
    "User is collaborative and process-driven";

  const goals =
    extractSection(empathyMap, "Goals") ||
    "Improve workflow efficiency and collaboration";

  const frustrations =
    extractSection(empathyMap, "Frustrations") ||
    pain_points;

  const motivations =
    extractSection(empathyMap, "Motivations") ||
    "Reduce manual effort and improve traceability";

  const previous_experience =
    extractSection(empathyMap, "Previous Experience") ||
    "Experience with fragmented UX workflows";

  const behaviours_habits =
    extractSection(empathyMap, "Does") ||
    "Conducts interviews and synthesizes insights manually";

  const positive_themes =
    extractSection(empathyMap, "Key Insights") ||
    "Automation and centralized systems improve workflow";

  const negative_themes =
    extractSection(empathyMap, "Pain Points") ||
    "Scattered notes and inconsistent collaboration";

  const needs_expectations =
    extractSection(empathyMap, "Needs") ||
    "Connected and flexible UX system";

  const section = (label, value) => {
    if (!value) return "";
    return `[${label}]\n${value}\n`;
  };

  const userInput = [
    section("PROJECT DESCRIPTION", body.project_description),
    section("PERSONA NAME", body.persona_name),
    section("INTERVIEW TRANSCRIPTS", user_answers),
    section("RESEARCH SUMMARY", research_summary),
    section("EMPATHY MAP", empathyMap),
    section("PAIN POINTS", pain_points),
    section("NEEDS", needs),
    section("BACKGROUND", background),
    section("DEMOGRAPHICS", demographics),
    section("SCENARIO", scenario),
    section("PERSONALITY", personality),
    section("GOALS", goals),
    section("FRUSTRATIONS", frustrations),
    section("MOTIVATIONS", motivations),
    section("PREVIOUS EXPERIENCE", previous_experience),
    section("BEHAVIOURS AND HABITS", behaviours_habits),
    section("POSITIVE THEMES", positive_themes),
    section("NEGATIVE THEMES", negative_themes),
    section("NEEDS AND EXPECTATIONS", needs_expectations),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    username: USERNAME,
    password: PASSWORD,
    name: UX_JOURNEY_AGENT_NAME,

    project_description: body.project_description,
    persona_name: body.persona_name,
    empathy_map: empathyMap,

    user_answers,
    research_summary,
    pain_points,
    needs,
    background,
    demographics,
    scenario,
    personality,
    goals,
    frustrations,
    motivations,
    previous_experience,
    behaviours_habits,
    positive_themes,
    negative_themes,
    needs_expectations,

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
    if (!response.ok) {
  return NextResponse.json(
    {
      error: "Agent request failed",
      status: response.status,
    },
    { status: response.status }
  );
}

    const text = await response.text();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    console.log("UX JOURNEY RAW RESPONSE:", parsed);

    const flow = extractUxJourney(
  parsed.final_response || parsed
);

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