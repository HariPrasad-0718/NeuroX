import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";
import { validateBody } from "@/lib/validate";
import { generateBRDSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5idev.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const BRD_AGENT_NAME = process.env.AGENT5I_BRD_AGENT_NAME || "BRD Generator";

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripMarkdownFence(value) {
  const text = String(value || "").trim();
  return text
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

function extractJsonObjectString(value) {
  const text = String(value || "");
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function tryParseJsonString(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const cleaned = stripMarkdownFence(value);
  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  // Mirrors Flask unicode_escape pass.
  const unicodeExpanded = cleaned
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
  if (unicodeExpanded !== cleaned) {
    const parsedUnicode = tryParseJson(unicodeExpanded);
    if (parsedUnicode) return parsedUnicode;
  }

  const extracted = extractJsonObjectString(cleaned);
  if (extracted) {
    const parsedExtracted = tryParseJson(extracted);
    if (parsedExtracted) return parsedExtracted;
  }

  return null;
}

function parseBrdDocument(brdDocRaw) {
  if (brdDocRaw && typeof brdDocRaw === "object") return brdDocRaw;
  const parsed = tryParseJsonString(brdDocRaw);
  if (parsed && typeof parsed === "object") return parsed;
  return null;
}

function tryExtractBrdPayloadFromMessageString(message) {
  if (typeof message !== "string") return null;

  const patterns = [
    /content='([\s\S]*?)'\s+additional_kwargs=/,
    /content="([\s\S]*?)"\s+additional_kwargs=/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match) continue;

    const parsed = tryParseJsonString(match[1]);
    if (parsed && typeof parsed === "object") return parsed;
  }

  return tryParseJsonString(message);
}

function extractBrdDocument(result) {
  const messages = result?.response?.messages || [];
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const parsed = tryExtractBrdPayloadFromMessageString(messages[i]);
      if (parsed && typeof parsed === "object" && parsed.brd_document) {
        const brdData = parseBrdDocument(parsed.brd_document);
        if (brdData) return brdData;
      }
    }
  }

  const topMessage = result?.message;
  const parsedTop = topMessage ? tryParseJsonString(topMessage) : null;
  if (parsedTop && typeof parsedTop === "object" && parsedTop.brd_document) {
    return parseBrdDocument(parsedTop.brd_document);
  }

  return null;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function sanitizeAgentInput(payload) {
  if (!payload || typeof payload !== "object") return null;
  return {
    ...payload,
    username: payload.username ? "[REDACTED]" : "",
    password: payload.password ? "[REDACTED]" : "",
  };
}

function sanitizeAgentResponse(payload) {
  return payload;
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

  sections.push(`Project Name:\n${normalizeText(project?.project_name) || "N/A"}`);
  sections.push(`Client Name:\n${normalizeText(project?.client_name) || "N/A"}`);
  sections.push(`Domain:\n${normalizeText(project?.domain) || "N/A"}`);
  sections.push(`Project Description:\n${normalizeText(project?.description) || "N/A"}`);

  sections.push(
    `Problem Statement:\n${normalizeText(problemStatement?.problem_statement) || "N/A"}`
  );

  sections.push(
    `Personas:\n${formatList(
      personas,
      (p, index) =>
        `${index + 1}. ${normalizeText(p.persona_name) || "N/A"}\nDescription: ${
          normalizeText(p.persona_description) || "N/A"
        }`
    )}`
  );

  sections.push(
    `Interviewees:\n${formatList(
      interviewees,
      (i, index) =>
        `${index + 1}. Name: ${normalizeText(i.name) || "N/A"}\nGender: ${
          normalizeText(i.gender) || "N/A"
        }\nAge: ${normalizeText(i.age) || "N/A"}\nLocation: ${
          normalizeText(i.location) || "N/A"
        }\nRelationship Status: ${normalizeText(i.relationship_status) || "N/A"}\nTitle: ${
          normalizeText(i.title) || "N/A"
        }\nEducation: ${normalizeText(i.education) || "N/A"}`
    )}`
  );

  sections.push(
    `Interviews:\n${formatList(
      interviews,
      (iv, index) =>
        `Interview ${index + 1}:\nTranscript: ${normalizeText(iv.transcript) || "N/A"}\nPersona Output: ${
          normalizeText(iv.persona_output) || "N/A"
        }\nInterview Outcome: ${normalizeText(iv.interview_outcome) || "N/A"}\nSummary: ${
          normalizeText(iv.summary) || "N/A"
        }`
    )}`
  );

  sections.push(
    `Persona Insights:\n${formatList(
      insights,
      (row, index) =>
        `Insight ${index + 1}:\nMotivations: ${normalizeText(row.motivations) || "N/A"}\nFrustrations: ${
          normalizeText(row.frustrations) || "N/A"
        }\nGoals: ${normalizeText(row.goals) || "N/A"}\nNeeds: ${normalizeText(row.needs) || "N/A"}`
    )}`
  );

  sections.push(
    `Generated Personas:\n${formatList(generatedPersonas, (row, index) => {
      const generated = tryParseJson(row.generated_output) || row.generated_output;
      return `Generated Persona ${index + 1}:\nPersona Name: ${
        normalizeText(row.persona_name) || "N/A"
      }\nDemographics: ${normalizeText(row.demographics) || "N/A"}\nBackground: ${
        normalizeText(row.background) || "N/A"
      }\nScenario: ${normalizeText(row.scenario_text) || "N/A"}\nPersonality: ${
        normalizeText(row.personality) || "N/A"
      }\nGoals: ${normalizeText(row.goals) || "N/A"}\nFrustrations: ${
        normalizeText(row.frustrations) || "N/A"
      }\nMotivations: ${normalizeText(row.motivations) || "N/A"}\nPrevious Experience: ${
        normalizeText(row.previous_experience) || "N/A"
      }\nPositive Themes: ${normalizeText(row.positive_themes) || "N/A"}\nNegative Themes: ${
        normalizeText(row.negative_themes) || "N/A"
      }\nNeeds & Expectations: ${normalizeText(row.needs_expectations) || "N/A"}\nGenerated Output: ${
        normalizeText(generated) || "N/A"
      }`;
    })}`
  );

  const iaParsed = tryParseJson(informationArchitecture?.ia) || informationArchitecture?.ia;
  sections.push(`Information Architecture:\n${normalizeText(iaParsed) || "N/A"}`);

  const processFlowParsed = tryParseJson(processFlow?.process_flow) || processFlow?.process_flow;
  sections.push(`Process Flow:\n${normalizeText(processFlowParsed) || "N/A"}`);

  return sections.join("\n\n");
}

export const POST = withAuth(async (request, _ctx, user) => {
  const { data: input, error: validationError } = await validateBody(request, generateBRDSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  let agentInput = null;

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
      name: BRD_AGENT_NAME,
      project_brief: projectBrief,
      user_input: projectBrief,
      rules: [],
      username: USERNAME,
      password: PASSWORD,
    };
    agentInput = sanitizeAgentInput(payload);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000),
    });

    const text = await response.text();
    const data = tryParseJson(text);
    const agentResponse = sanitizeAgentResponse(data);

    if (!response.ok) {
      logger.error("POST /api/generate-brd upstream error", {
        status: response.status,
        preview: text.slice(0, 500),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: `Agent request failed (${response.status})` },
          agent_input: agentInput,
          agent_response: agentResponse,
        },
        { status: response.status }
      );
    }

    if (!data) {
      logger.error("POST /api/generate-brd invalid upstream JSON", {
        preview: text.slice(0, 500),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Agent returned invalid JSON." },
          agent_input: agentInput,
          agent_response: sanitizeAgentResponse(text),
        },
        { status: 502 }
      );
    }

    const brdData = extractBrdDocument(data);
    if (!brdData) {
      logger.error("POST /api/generate-brd failed to extract brd_document", {
        hasTopMessage: Boolean(data?.message),
        hasMessages: Array.isArray(data?.response?.messages),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Could not extract brd_document from agent response." },
          raw_response: data,
          agent_input: agentInput,
          agent_response: agentResponse,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: { brd: brdData } });
  } catch (error) {
    if (error?.name === "AbortError") {
      logger.error("POST /api/generate-brd timeout", { error });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Request timed out. The agent took too long to respond." },
          agent_input: agentInput,
          agent_response: null,
        },
        { status: 504 }
      );
    }

    logger.error("POST /api/generate-brd error", { error });

    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal server error" }, agent_input: agentInput, agent_response: null },
      { status: 500 }
    );
  }
});
