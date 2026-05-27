import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { generateUXJourneySchema } from "@/lib/schemas";
import logger from "@/lib/logger";
import { aiStandardLimiter, rateLimitedResponse } from "@/lib/rateLimit";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL || "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

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

export const POST = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, generateUXJourneySchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiStandardLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  try {
    const payload = buildPayload(data);

    logger.debug("UX journey payload built", { agentName: payload.name });

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });

    const text = await response.text();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    logger.debug("UX journey raw response received", { hasNodes: !!parsed?.nodes });

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
    logger.error("UX journey generation failed", { error });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
});