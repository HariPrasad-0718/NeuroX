import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { generatePersonaCardSchema } from "@/lib/schemas";
import logger from "@/lib/logger";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL || "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";

const PERSONA_CREATION_AGENT_NAME = "Persona Creation Agent";

// -------- Helpers --------
function tryParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractPersonaPayload(input, depth = 0) {
  if (depth > 6 || input == null) return { problemStatement: "", cards: [] };

  if (typeof input === "string") {
    const parsed = tryParseJSON(input);
    return parsed == null
      ? { problemStatement: "", cards: [] }
      : extractPersonaPayload(parsed, depth + 1);
  }

  if (Array.isArray(input)) {
    if (input.some((item) => item && typeof item === "object" && item.persona_id)) {
      return { problemStatement: "", cards: input.filter((i) => i && typeof i === "object") };
    }
    for (const item of input) {
      const result = extractPersonaPayload(item, depth + 1);
      if (result.cards.length) return result;
    }
    return { problemStatement: "", cards: [] };
  }

  if (typeof input !== "object") return { problemStatement: "", cards: [] };

  if (Array.isArray(input.persona_cards) || typeof input.persona_cards === "string") {
    const problemStatement = String(input.problem_statement || "").trim();
    let cards = input.persona_cards;
    if (typeof cards === "string") {
      const parsed = tryParseJSON(cards);
      if (parsed && !Array.isArray(parsed) && parsed.persona_cards) {
        return extractPersonaPayload(parsed, depth + 1);
      }
      cards = Array.isArray(parsed) ? parsed : [];
    }
    return { problemStatement, cards: Array.isArray(cards) ? cards : [] };
  }

  for (const value of Object.values(input)) {
    const result = extractPersonaPayload(value, depth + 1);
    if (result.cards.length) return result;
  }

  return { problemStatement: "", cards: [] };
}

function buildPayload(empathy_data_and_context) {
  const user_input = {
    empathy_data_and_context,
  };

  return {
    username: USERNAME,
    password: PASSWORD,
    name: PERSONA_CREATION_AGENT_NAME,
    empathy_data_and_context,
    rules: [],
    user_input: JSON.stringify(user_input),
  };
}

// -------- MAIN API --------
export const POST = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, generatePersonaCardSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  const { empathy_data_and_context } = data;

  try {
    const payload = buildPayload(empathy_data_and_context);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180000),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          error: "Agent request failed",
          status_code: response.status,
          raw_response: text,
        },
        { status: 500 }
      );
    }

    let responseData;

    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = tryParseJSON(text) || text;
    }

    const { problemStatement, cards } = extractPersonaPayload(responseData);

    return NextResponse.json({
      success: true,
      problem_statement: problemStatement,
      persona_cards: cards,
    });

  } catch (err) {
    return NextResponse.json(
      {
        error: "Server error",
        details: err.message,
      },
      { status: 500 }
    );
  }
});