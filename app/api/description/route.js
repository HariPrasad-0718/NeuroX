import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { descriptionSchema } from "@/lib/schemas";
import logger from "@/lib/logger";
import { aiLightLimiter, rateLimitedResponse } from "@/lib/rateLimit";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL || "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

export const POST = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, descriptionSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiLightLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  const {
    project_description,
    user_answers,
    persona_description,
    persona_title,
    persona_name,
    interview_id,
  } = data;

  const userAnswers = user_answers || persona_description || "";
  const personaTitle = persona_title || persona_name || "";
  const interviewId = interview_id ?? null;

  try {
    const payload = {
      username: process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME,
      password: process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD,
      name: "Research Summary Agent",
      project_description,
      user_answers: userAnswers,
      transcript: userAnswers,
      persona_name: personaTitle,
      rules: [],
      user_input: JSON.stringify({
        project_description,
        user_answers: userAnswers,
        transcript: userAnswers,
        persona_name: personaTitle,
      }),
    };

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    const rawText = await res.text();

    let summary = "No summary available";

    try {
      const parsed = JSON.parse(rawText);

      const extractSummary = (data) => {
        if (!data) return "";
        if (typeof data === "string") return data;
        if (Array.isArray(data)) {
          for (const item of data) {
            const found = extractSummary(item);
            if (found) return found;
          }
        }
        if (typeof data === "object") {
          for (const key of [
            "summary_output",
            "summary",
            "research_summary",
            "message",
            "output",
            "result",
            "text",
            "response",
          ]) {
            if (data[key]) {
              const found = extractSummary(data[key]);
              if (found) return found;
            }
          }
        }
        return "";
      };

      summary = extractSummary(parsed) || rawText;
    } catch {
      summary = rawText;
    }

    if (interviewId && summary && summary !== "No summary available") {
      const pool = await getPool();
      await pool
        .request()
        .input("interviewId", sql.Int, interviewId)
        .input("summary", sql.NVarChar(sql.MAX), summary)
        .query(`
          UPDATE interviewss
          SET summary = @summary
          WHERE interview_id = @interviewId
        `);
    }

    return NextResponse.json({ summary });
  } catch (err) {
    logger.error("POST /api/description error", { error: err });
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
});
