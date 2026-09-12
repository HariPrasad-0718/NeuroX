import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { problemStructuringSchema } from "@/lib/schemas";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";
const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const AGENT_NAME =
  process.env.AGENT5I_PROBLEM_STRUCTURING_AGENT_NAME || "Problem Structuring Agent";

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractProblemStatement(input, depth = 0) {
  if (input == null || depth > 8) return "";

  if (typeof input === "string") {
    const cleaned = input.replace(/```json|```/gi, "").trim();
    const parsed = tryParseJson(cleaned);
    if (parsed) return extractProblemStatement(parsed, depth + 1);

    const quotedMatch = cleaned.match(/"problem_statement"\s*:\s*"((?:\\.|[^"\\])*)"/is);
    if (quotedMatch) return tryParseJson(`"${quotedMatch[1]}"`) || quotedMatch[1].trim();

    const singleQuotedMatch = cleaned.match(/['"]problem_statement['"]\s*:\s*'([^']*)'/is);
    if (singleQuotedMatch) return singleQuotedMatch[1].trim();
    return "";
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const result = extractProblemStatement(item, depth + 1);
      if (result) return result;
    }
    return "";
  }

  if (typeof input !== "object") return "";

  for (const key of ["problem_statement", "problemStatement", "problem", "statement"]) {
    if (typeof input[key] === "string" && input[key].trim()) return input[key].trim();
  }

  for (const value of Object.values(input)) {
    const result = extractProblemStatement(value, depth + 1);
    if (result) return result;
  }

  return "";
}

function buildPayload(empathyDataAndContext) {
  const userInput = { empathy_data_and_context: empathyDataAndContext };

  return {
    username: USERNAME,
    password: PASSWORD,
    name: AGENT_NAME,
    empathy_data_and_context: empathyDataAndContext,
    rules: [],
    user_input: JSON.stringify(userInput),
  };
}

export const POST = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, problemStructuringSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(data.empathy_data_and_context)),
      signal: AbortSignal.timeout(180000),
    });

    const contentType = response.headers.get("content-type") || "";
    let responseData;
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = tryParseJson(text) || text;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Problem Structuring Agent request failed", raw_response: responseData },
        { status: 500 }
      );
    }

    const problemStatement = extractProblemStatement(responseData);
    if (!problemStatement) {
      return NextResponse.json(
        { error: "Problem Structuring Agent returned no problem statement" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, problem_statement: problemStatement });
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
});