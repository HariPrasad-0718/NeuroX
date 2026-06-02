import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";
import { validateBody } from "@/lib/validate";
import { generatePRDSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const PRD_AGENT_NAME = "AI PRD Generator";
const AGENT_TIMEOUT_MS = 180_000;

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseRawResponse(text) {
  if (typeof text !== "string") return text;
  const parsed = tryParseJson(text);
  return parsed ?? text;
}

function stripMarkdownFence(value) {
  const text = String(value || "").trim();
  return text
    .replace(/^```json/i, "")
    .replace(/^```html/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

function normalizeText(text) {
  if (!text) return "";

  const replacements = {
    "\\u2013": "-",
    "\\u2014": "-",
    "\\u2018": "'",
    "\\u2019": "'",
    "\\u201c": '"',
    "\\u201d": '"',
    "\\u2192": "->",
    "\\u2265": ">=",
    "\\u2264": "<=",
    "\\u2022": "*",
    "\\n": "\n",
    "\\t": " ",
  };

  let output = String(text).trim();
  for (const [bad, good] of Object.entries(replacements)) {
    output = output.split(bad).join(good);
  }

  return output.trim();
}

function cleanPrdOutput(text) {
  return normalizeText(stripMarkdownFence(text));
}

function tryParseJsonString(value) {
  if (!value || typeof value !== "string") return null;

  const cleaned = stripMarkdownFence(value);
  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  // Retry with an unescape pass.
  try {
    const unescaped = JSON.parse(`"${cleaned.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
    if (typeof unescaped === "string") {
      const parsed = tryParseJson(unescaped);
      if (parsed) return parsed;
    }
  } catch {
    // no-op
  }

  return null;
}

function tryExtractFromMessageString(msg) {
  if (typeof msg !== "string") return null;

  const singleQuoted = msg.match(/content='([\s\S]*?)'\s+additional_kwargs=/);
  if (singleQuoted) {
    const content = singleQuoted[1];
    if (content.includes("<h1") && content.includes("<h2")) {
      return { prd_output: cleanPrdOutput(content) };
    }

    const parsed = tryParseJsonString(content);
    if (parsed) return parsed;
  }

  const doubleQuoted = msg.match(/content="([\s\S]*?)"\s+additional_kwargs=/);
  if (doubleQuoted) {
    const content = doubleQuoted[1];
    if (content.includes("<h1") && content.includes("<h2")) {
      return { prd_output: cleanPrdOutput(content) };
    }

    const parsed = tryParseJsonString(content);
    if (parsed) return parsed;
  }

  const objectMatch = msg.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const parsed = tryParseJsonString(objectMatch[0]);
    if (parsed) return parsed;
  }

  return null;
}

function collectPossiblePrdStrings(value, acc = [], depth = 0) {
  if (depth > 8 || value === null || value === undefined) return acc;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return acc;

    const parsed = tryParseJsonString(trimmed);
    if (parsed) {
      collectPossiblePrdStrings(parsed, acc, depth + 1);
    } else {
      acc.push(cleanPrdOutput(trimmed));
    }
    return acc;
  }

  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i -= 1) {
      collectPossiblePrdStrings(value[i], acc, depth + 1);
    }
    return acc;
  }

  if (typeof value === "object") {
    const directKeys = ["prd_output", "output", "result", "message", "text", "content"];
    for (const key of directKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        collectPossiblePrdStrings(value[key], acc, depth + 1);
      }
    }

    for (const nestedValue of Object.values(value)) {
      collectPossiblePrdStrings(nestedValue, acc, depth + 1);
    }
  }

  return acc;
}

function isLikelyPrdHtml(text) {
  const value = String(text || "").toLowerCase();
  return value.includes("<h1") || value.includes("<h2") || value.includes("<table");
}

function isCompletePrdHtml(text) {
  const value = String(text || "");
  if (!value) return false;
  return isLikelyPrdHtml(value) && value.length > 1000 && !value.slice(0, 200).includes("...");
}

function extractPrdOutput(result, rawText = "") {
  const messages = result?.response?.messages;

  if (Array.isArray(messages)) {
    let longestHtml = "";

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (typeof msg !== "string") continue;

      const extracted = tryExtractFromMessageString(msg);
      if (!extracted) continue;

      const prd = extracted?.prd_output;
      if (typeof prd === "string" && prd.trim()) {
        const cleaned = cleanPrdOutput(prd);
        if (isCompletePrdHtml(cleaned)) return cleaned;
        if (isLikelyPrdHtml(cleaned) && cleaned.length > longestHtml.length) longestHtml = cleaned;
      }

      if (typeof extracted === "string" && extracted.trim()) {
        const cleaned = cleanPrdOutput(extracted);
        if (isCompletePrdHtml(cleaned)) return cleaned;
        if (isLikelyPrdHtml(cleaned) && cleaned.length > longestHtml.length) longestHtml = cleaned;
      }
    }

    if (longestHtml.length > 1000) {
      return longestHtml;
    }
  }

  const topMessage = result?.message;
  if (typeof topMessage === "string" && topMessage.trim()) {
    const parsed = tryParseJsonString(topMessage);
    if (parsed && typeof parsed === "object") {
      const prd = parsed.prd_output || parsed.output || parsed.result || parsed.message;
      if (typeof prd === "string" && prd.trim()) {
        const cleaned = cleanPrdOutput(prd);
        if (isCompletePrdHtml(cleaned)) return cleaned;
      }
    }

    if (topMessage.includes("<h1") && topMessage.includes("<h2")) {
      const cleaned = cleanPrdOutput(topMessage);
      if (isCompletePrdHtml(cleaned)) return cleaned;
    }
  }

  const candidates = collectPossiblePrdStrings(result, []);
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isLikelyPrdHtml(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate && candidate.length > 80) return candidate;
  }

  const cleanedRaw = cleanPrdOutput(rawText);
  if (isLikelyPrdHtml(cleanedRaw)) return cleanedRaw;

  return "";
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function formatList(items, mapper) {
  if (!Array.isArray(items) || !items.length) return "N/A";
  return items.map(mapper).join("\n\n");
}

function buildProjectBrief({
  project,
  personas,
  interviewees,
  interviews,
  insights,
  problemStatement,
  generatedPersonas,
  informationArchitecture,
  processFlow,
}) {
  const sections = [];

  sections.push(`Project Name:\n${normalizeValue(project?.project_name) || "N/A"}`);
  sections.push(`Client Name:\n${normalizeValue(project?.client_name) || "N/A"}`);
  sections.push(`Domain:\n${normalizeValue(project?.domain) || "N/A"}`);
  sections.push(`Project Description:\n${normalizeValue(project?.description) || "N/A"}`);

  sections.push(
    `Problem Statement:\n${normalizeValue(problemStatement?.problem_statement) || "N/A"}`
  );

  sections.push(
    `Personas:\n${formatList(
      personas,
      (p, index) =>
        `${index + 1}. ${normalizeValue(p.persona_name) || "N/A"}\nDescription: ${
          normalizeValue(p.persona_description) || "N/A"
        }`
    )}`
  );

  sections.push(
    `Interviewees:\n${formatList(
      interviewees,
      (i, index) =>
        `${index + 1}. Name: ${normalizeValue(i.name) || "N/A"}\nGender: ${
          normalizeValue(i.gender) || "N/A"
        }\nAge: ${normalizeValue(i.age) || "N/A"}\nLocation: ${
          normalizeValue(i.location) || "N/A"
        }\nRelationship Status: ${normalizeValue(i.relationship_status) || "N/A"}\nTitle: ${
          normalizeValue(i.title) || "N/A"
        }\nEducation: ${normalizeValue(i.education) || "N/A"}`
    )}`
  );

  sections.push(
    `Interviews:\n${formatList(
      interviews,
      (iv, index) =>
        `Interview ${index + 1}:\nTranscript: ${normalizeValue(iv.transcript) || "N/A"}\nPersona Output: ${
          normalizeValue(iv.persona_output) || "N/A"
        }\nInterview Outcome: ${normalizeValue(iv.interview_outcome) || "N/A"}\nSummary: ${
          normalizeValue(iv.summary) || "N/A"
        }`
    )}`
  );

  sections.push(
    `Persona Insights:\n${formatList(
      insights,
      (row, index) =>
        `Insight ${index + 1}:\nMotivations: ${normalizeValue(row.motivations) || "N/A"}\nFrustrations: ${
          normalizeValue(row.frustrations) || "N/A"
        }\nGoals: ${normalizeValue(row.goals) || "N/A"}\nNeeds: ${normalizeValue(row.needs) || "N/A"}`
    )}`
  );

  sections.push(
    `Generated Personas:\n${formatList(generatedPersonas, (row, index) => {
      const generated = tryParseJson(row.generated_output) || row.generated_output;
      return `Generated Persona ${index + 1}:\nPersona Name: ${
        normalizeValue(row.persona_name) || "N/A"
      }\nDemographics: ${normalizeValue(row.demographics) || "N/A"}\nBackground: ${
        normalizeValue(row.background) || "N/A"
      }\nScenario: ${normalizeValue(row.scenario_text) || "N/A"}\nPersonality: ${
        normalizeValue(row.personality) || "N/A"
      }\nGoals: ${normalizeValue(row.goals) || "N/A"}\nFrustrations: ${
        normalizeValue(row.frustrations) || "N/A"
      }\nMotivations: ${normalizeValue(row.motivations) || "N/A"}\nPrevious Experience: ${
        normalizeValue(row.previous_experience) || "N/A"
      }\nPositive Themes: ${normalizeValue(row.positive_themes) || "N/A"}\nNegative Themes: ${
        normalizeValue(row.negative_themes) || "N/A"
      }\nNeeds & Expectations: ${normalizeValue(row.needs_expectations) || "N/A"}\nGenerated Output: ${
        normalizeValue(generated) || "N/A"
      }`;
    })}`
  );

  const iaParsed = tryParseJson(informationArchitecture?.ia) || informationArchitecture?.ia;
  sections.push(`Information Architecture:\n${normalizeValue(iaParsed) || "N/A"}`);

  const processFlowParsed = tryParseJson(processFlow?.process_flow) || processFlow?.process_flow;
  sections.push(`Process Flow:\n${normalizeValue(processFlowParsed) || "N/A"}`);

  return sections.join("\n\n");
}

export const POST = withAuth(async (request, _ctx, user) => {
  const { data: input, error: validationError } = await validateBody(request, generatePRDSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  try {
    const projectId = Number(input.projectId);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required." } },
        { status: 400 }
      );
    }

    if (!USERNAME || !PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Agent credentials are not configured." },
        },
        { status: 500 }
      );
    }

    const pool = await getPool();

    const [
      projectResult,
      personasResult,
      intervieweesResult,
      interviewsResult,
      insightsResult,
      problemStatementResult,
      generatedPersonasResult,
      iaResult,
      processFlowResult,
    ] = await Promise.all([
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .input("userId", sql.Int, Number(user.userId))
        .query(`
          SELECT TOP 1 project_id, project_name, client_name, description, domain
          FROM projectss
          WHERE project_id = @projectId AND created_by = @userId
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT persona_id, persona_name, persona_description
          FROM personass
          WHERE project_id = @projectId
          ORDER BY persona_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT ie.interviewee_id, ie.persona_id, ie.name, ie.gender, ie.age, ie.location,
                 ie.relationship_status, ie.title, ie.education
          FROM intervieweess ie
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
          ORDER BY ie.interviewee_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT iv.interview_id, iv.interviewee_id, iv.transcript, iv.persona_output,
                 iv.interview_outcome, iv.summary
          FROM interviewss iv
          INNER JOIN intervieweess ie ON ie.interviewee_id = iv.interviewee_id
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
          ORDER BY iv.interview_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT pi.insight_id, pi.interview_id, pi.motivations, pi.frustrations, pi.goals, pi.needs
          FROM persona_insightss pi
          INNER JOIN interviewss iv ON iv.interview_id = pi.interview_id
          INNER JOIN intervieweess ie ON ie.interviewee_id = iv.interviewee_id
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
          ORDER BY pi.insight_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 problem_statement
          FROM problem_statements
          WHERE project_id = @projectId
          ORDER BY problem_statement_id DESC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT generated_persona_id, persona_name, demographics, background, scenario_text,
                 personality, goals, frustrations, motivations, previous_experience,
                 positive_themes, negative_themes, needs_expectations, generated_output
          FROM generated_personass
          WHERE project_id = @projectId
          ORDER BY generated_persona_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 ia
          FROM InformationArchitecture
          WHERE project_id = @projectId
          ORDER BY ia_id DESC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 process_flow
          FROM ProcessFlow
          WHERE project_id = @projectId
          ORDER BY processflow_id DESC
        `),
    ]);

    const project = projectResult.recordset?.[0];
    if (!project) {
      return NextResponse.json(
        { success: false, error: { message: "Project not found." } },
        { status: 404 }
      );
    }

    const projectBrief = buildProjectBrief({
      project,
      personas: personasResult.recordset || [],
      interviewees: intervieweesResult.recordset || [],
      interviews: interviewsResult.recordset || [],
      insights: insightsResult.recordset || [],
      problemStatement: problemStatementResult.recordset?.[0] || null,
      generatedPersonas: generatedPersonasResult.recordset || [],
      informationArchitecture: iaResult.recordset?.[0] || null,
      processFlow: processFlowResult.recordset?.[0] || null,
    });

    const payload = {
      username: USERNAME,
      password: PASSWORD,
      name: PRD_AGENT_NAME,
      prd_context: projectBrief,
      user_input: projectBrief,
      rules: [],
    };

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });

    const text = await response.text();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const result = contentType.includes("application/json") ? tryParseJson(text) : tryParseJson(text);

    if (!response.ok) {
      const rawResponse = parseRawResponse(text);
      logger.error("POST /api/generate-prd upstream error", {
        status: response.status,
        preview: text.slice(0, 500),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: `Agent request failed (${response.status})` },
          raw_response: rawResponse,
        },
        { status: response.status }
      );
    }

    const prdOutput = extractPrdOutput(result || text, text);
    if (!prdOutput) {
      logger.error("POST /api/generate-prd failed to extract prd_output", {
        hasMessages: Array.isArray(result?.response?.messages),
        contentType,
        preview: text.slice(0, 300),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Could not extract prd_output from agent response." },
          raw_response: result || parseRawResponse(text),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { prd_output: prdOutput },
      raw_response: result || parseRawResponse(text),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      logger.error("POST /api/generate-prd timeout", { error });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Request timed out. The agent took too long to respond." },
        },
        { status: 504 }
      );
    }

    logger.error("POST /api/generate-prd error", { error });
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal server error" } },
      { status: 500 }
    );
  }
});
