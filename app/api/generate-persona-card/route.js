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

function hasPersonaSignals(obj) {
  if (!obj || typeof obj !== "object") return false;

  const normalizedKeys = Object.keys(obj).map((k) => String(k).toLowerCase().trim());
  const expected = [
    "name",
    "header",
    "quote",
    "background",
    "scenario",
    "goals",
    "frustrations",
    "motivations",
    "demographics",
    "personality",
    "behaviours & habits",
    "behaviors & habits",
    "previous experience",
    "positive themes",
    "negative themes",
    "needs & expectations",
    "problem statement",
    "problem_statement",
    "problemstatement",
  ];

  return expected.some((key) => normalizedKeys.includes(key));
}

function findFirstKeyCaseInsensitive(obj, expectedKey) {
  if (!obj || typeof obj !== "object") return null;
  const target = String(expectedKey || "").toLowerCase();
  for (const key of Object.keys(obj)) {
    if (String(key).toLowerCase() === target) return key;
  }
  return null;
}

function extractPersonaCards(input, depth = 0) {
  if (depth > 6 || input == null) return [];

  if (typeof input === "string") {
    const parsed = tryParseJSON(input);
    return parsed == null ? [] : extractPersonaCards(parsed, depth + 1);
  }

  if (Array.isArray(input)) {
    // If this already looks like persona-card rows, use it directly.
    if (input.some((item) => item && typeof item === "object" && (item.PERSONA_ID || item.persona_id || item.personaId))) {
      return input.filter((item) => item && typeof item === "object");
    }

    for (const item of input) {
      const cards = extractPersonaCards(item, depth + 1);
      if (cards.length) return cards;
    }
    return [];
  }

  if (typeof input !== "object") return [];

  const personaCardsKey = findFirstKeyCaseInsensitive(input, "persona_cards");
  if (personaCardsKey) {
    return extractPersonaCards(input[personaCardsKey], depth + 1);
  }

  for (const value of Object.values(input)) {
    const cards = extractPersonaCards(value, depth + 1);
    if (cards.length) return cards;
  }

  return [];
}

function pickPersonaCard(cards, targetPersonaId) {
  if (!cards.length) return null;

  const normalizedTarget = String(targetPersonaId || "").trim();
  if (normalizedTarget) {
    const exact = cards.find((card) => {
      const cardId = String(card.PERSONA_ID || card.persona_id || card.personaId || "").trim();
      return cardId && cardId === normalizedTarget;
    });
    if (exact) return exact;
  }

  const firstSpecific = cards.find((card) => {
    const cardId = String(card.PERSONA_ID || card.persona_id || card.personaId || "").trim();
    return cardId && cardId !== "0";
  });

  return firstSpecific || cards[0];
}

function pickSharedProblemStatement(cards) {
  if (!Array.isArray(cards) || !cards.length) return "";

  const getStatement = (card) =>
    String(
      card?.["PROBLEM_STATEMENT"] ||
      card?.["PROBLEM STATEMENT"] ||
      card?.problem_statement ||
      card?.problemStatement ||
      ""
    ).trim();

  const preferred = cards.find((card) => {
    const cardId = String(card?.PERSONA_ID || card?.persona_id || card?.personaId || "").trim();
    return !cardId && getStatement(card);
  });

  if (preferred) return getStatement(preferred);

  const fallback = cards.find((card) => getStatement(card));
  return fallback ? getStatement(fallback) : "";
}

function findPersonaPayload(input, depth = 0) {
  if (depth > 6 || input == null) return null;

  if (typeof input === "string") {
    const parsed = tryParseJSON(input);
    if (parsed != null) return findPersonaPayload(parsed, depth + 1);
    return null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findPersonaPayload(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof input !== "object") return null;

  if (hasPersonaSignals(input)) return input;

  const preferredKeys = [
    "persona_card",
    "data",
    "result",
    "output",
    "response",
    "message",
    "text",
    "content",
  ];

  for (const key of preferredKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const found = findPersonaPayload(input[key], depth + 1);
      if (found) return found;
    }
  }

  for (const value of Object.values(input)) {
    const found = findPersonaPayload(value, depth + 1);
    if (found) return found;
  }

  return input;
}

function extractFallbackText(input) {
  if (!input) return "";

  if (typeof input === "string") return input.trim();

  if (Array.isArray(input)) {
    for (const item of input) {
      const t = extractFallbackText(item);
      if (t) return t;
    }
    return "";
  }

  if (typeof input !== "object") return "";

  const preferred = ["message", "text", "content", "response", "output", "result"];
  for (const key of preferred) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const t = extractFallbackText(input[key]);
      if (t) return t;
    }
  }

  for (const value of Object.values(input)) {
    const t = extractFallbackText(value);
    if (t) return t;
  }

  return "";
}

function extractPersonaCard(data, options = {}) {
  if (!data) return {};

  const { targetPersonaId = "" } = options;

  const cards = extractPersonaCards(data);
  const selectedFromCards = pickPersonaCard(cards, targetPersonaId);
  const sharedProblemStatement = pickSharedProblemStatement(cards);

  const cleanData = selectedFromCards || findPersonaPayload(data) || data;
  const fallbackText = extractFallbackText(data);

  logger.debug("Persona card data extracted from agent response", { hasPersonaSignals: hasPersonaSignals(cleanData) });

  if (typeof cleanData !== "object") {
    return {
      name: "Persona",
      background: String(cleanData || fallbackText || ""),
      goals: [],
      needs: [],
      frustrations: [],
      problemStatement: "",
    };
  }
 const toArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "object") {
    return Object.values(value).map((v) => String(v).trim());
  }

  if (typeof value === "string") {
    return value
      .split(/\n|•/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

  return {
    name: cleanData.NAME || cleanData.name || "Persona",
    header: cleanData.HEADER || cleanData.header || "",
    quote: cleanData.QUOTE || cleanData.quote || "",
    background: cleanData.BACKGROUND || cleanData.background || "",
    scenario: cleanData.SCENARIO || cleanData.scenario || "",

    goals: toArray(cleanData.GOALS || cleanData.goals),
    frustrations: toArray(cleanData.FRUSTRATIONS || cleanData.frustrations),
    motivations: toArray(cleanData.MOTIVATIONS || cleanData.motivations),
    needs: toArray(
      cleanData["NEEDS & EXPECTATIONS"] ||
      cleanData.needs ||
      cleanData.needs_and_expectations
    ),
    positiveThemes: toArray(
      cleanData["POSITIVE THEMES"] || cleanData.positiveThemes || cleanData.positive_themes
    ),
    negativeThemes: toArray(
      cleanData["NEGATIVE THEMES"] || cleanData.negativeThemes || cleanData.negative_themes
    ),
    behaviours: toArray(
      cleanData["BEHAVIOURS & HABITS"] ||
      cleanData["BEHAVIORS & HABITS"] ||
      cleanData.behaviours ||
      cleanData.behaviors
    ),
    personality: toArray(cleanData.PERSONALITY || cleanData.personality),
    previousExperience: toArray(
      cleanData["PREVIOUS EXPERIENCE"] || cleanData.previousExperience || cleanData.previous_experience
    ),

    demographics: cleanData.DEMOGRAPHICS || cleanData.demographics || {},
    problemStatement:
      cleanData["PROBLEM STATEMENT"] ||
      cleanData.PROBLEM_STATEMENT ||
      cleanData.problem_statement ||
      cleanData.problemStatement ||
      sharedProblemStatement ||
      "",
    rawText: fallbackText,
  };
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
  const targetPersonaId =
    String(empathy_data_and_context).match(/Persona ID:\s*([0-9]+)/i)?.[1] || "";

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

    const personaCard = extractPersonaCard(responseData, { targetPersonaId });

    return NextResponse.json({
      success: true,
      persona_card: personaCard,
      raw: responseData,
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