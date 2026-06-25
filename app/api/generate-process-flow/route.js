import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { generateProcessFlowSchema } from "@/lib/schemas";
import logger from "@/lib/logger";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";

//start
const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL || "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";
const USERNAME = process.env.AGENT_USERNAME || process.env.AGENT5I_USERNAME;
const PASSWORD = process.env.AGENT_PASSWORD || process.env.AGENT5I_PASSWORD;
const AGENT_NAME = "UX Journey Flow Generator";

function buildPayload(input) {
  const fallback = input.empathy_map || input.project_description || "";
  return {
    username: USERNAME,
    password: PASSWORD,
    name: AGENT_NAME,
    project_description: input.project_description || "",
    persona_name: input.persona_name || "User Persona",
    empathy_map: input.empathy_map || "",
    user_answers: fallback,
    pain_points: input.frustrations || fallback,
    needs: input.needs || fallback,
    scenario: input.scenario || fallback,
    goals: input.goals || fallback,
    previous_experience: input.previous_experience || fallback,
    behaviours_habits: input.behaviours_habits || fallback,
    background: input.background || "",
    demographics: input.demographics || "",
    personality: input.personality || "",
    frustrations: input.frustrations || "",
    motivations: input.motivations || "",
    rules: [],
    user_input: JSON.stringify(input),
  };
}

function extractFlow(data) {
  if (!data) return null;
  if (typeof data === "string") {
    const cleaned = data.replace(/```json|```/g, "").trim();
    try { return extractFlow(JSON.parse(cleaned)); } catch { return null; }
  }
  if (Array.isArray(data)) {
    for (const item of data) { const r = extractFlow(item); if (r) return r; }
    return null;
  }
  if (typeof data === "object") {
    if (data.nodes && data.edges) return data;
    if (Array.isArray(data.steps) && data.steps.length) {
      const nodes = data.steps.map((s) => ({
        id: String(s.id),
        label: s.label || s.description || "Step",
        type: s.type === "entry" ? "start" : s.type === "exit_success" || s.type === "exit_fail" ? "end" : s.type === "decision" ? "decision" : "process",
      }));
      const edges = data.steps.flatMap((s, i) => {
        const e = [];
        if (i < data.steps.length - 1) e.push({ from: String(s.id), to: String(data.steps[i + 1].id), label: "" });
        if (s.type === "loop" && i > 0) e.push({ from: String(s.id), to: String(data.steps[i - 1].id), label: "retry" });
        return e;
      });
      return { ...data, nodes, edges };
    }
    for (const key of ["process_flow", "flow", "output", "result", "message", "text", "response", "final_response", "data", "content"]) {
      if (!data[key]) continue;
      const r = extractFlow(data[key]);
      if (r) return r;
    }
  }
  return null;
}

function extractFlowFromMessages(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const contentStr = typeof msg === "string" ? msg : JSON.stringify(msg);
    const match = contentStr.match(/content='([\s\S]+?)'\s+additional_kwargs/);
    if (match) { const r = extractFlow(match[1]); if (r) return r; }
    const r = extractFlow(msg);
    if (r) return r;
  }
  return null;
}

function normalizeFlow(flow) {
  const typeMap = { entry: "start", exit_success: "end", exit_fail: "end", action: "process", loop: "process", stage_label: "process" };
  return {
    ...flow,
    nodes: flow.nodes.map((n) => ({ ...n, type: typeMap[n.type] || n.type })),
    edges: flow.edges.map((e) => ({
      from: String(e.from || e.source || ""),
      to: String(e.to || e.target || ""),
      label: e.label || "",
    })).filter((e) => e.from && e.to),
  };
}

async function callAgent(pfInput) {
  const payload = buildPayload(pfInput);
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Agent API failed: ${text.slice(0, 200)}`);

  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  let flow = extractFlowFromMessages(parsed?.response?.messages);
  if (!flow?.nodes) flow = extractFlow(parsed);

  return normalizeFlow(flow);
}

export const POST = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, generateProcessFlowSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  const { projectId, regenerate } = data;

  try {
    const pool = await getPool();

    // ── CHECK EXISTING ──────────────────────────────────────
    if (!regenerate) {
      const existing = await pool.request()
        .input("projectId", sql.Int, Number(projectId))
        .query("SELECT TOP 1 process_flow FROM ProcessFlow WHERE project_id = @projectId");

      if (existing.recordset.length) {
        try {
          const stored = JSON.parse(existing.recordset[0].process_flow);
          return NextResponse.json({ success: true, process_flow: stored, fromDb: true });
        } catch { /* fall through */ }
      }
    }

    // ── REGENERATE: USE STORED pf_input ───────────────────
    if (regenerate) {
      const stored = await pool.request()
        .input("projectId", sql.Int, Number(projectId))
        .query("SELECT TOP 1 pf_input FROM ProcessFlow WHERE project_id = @projectId");
      if (stored.recordset.length && stored.recordset[0].pf_input) {
        let pfInput;
        try { pfInput = JSON.parse(stored.recordset[0].pf_input); } catch { pfInput = null; }
        if (pfInput) {
          logger.debug("Regenerating process flow from stored pf_input");
          const flow = await callAgent(pfInput);
          logger.debug("Process flow regenerated", { nodeCount: flow?.nodes?.length });
          await pool.request()
            .input("projectId", sql.Int, Number(projectId))
            .input("processFlow", sql.NVarChar(sql.MAX), JSON.stringify(flow))
            .query("UPDATE ProcessFlow SET process_flow = @processFlow, created_at = GETDATE() WHERE project_id = @projectId");
          return NextResponse.json({ success: true, process_flow: flow });
        }
      }
      // No stored pf_input — fall through to rebuild from DB
    }


    // ── BUILD INPUT FROM DB ─────────────────────────────────
    const [psResult, gpResult, projResult] = await Promise.all([
      pool.request().input("projectId", sql.Int, Number(projectId))
        .query("SELECT TOP 1 problem_statement FROM problem_statements WHERE project_id = @projectId"),
      pool.request().input("projectId", sql.Int, Number(projectId))
        .query("SELECT TOP 1 generated_output FROM generated_personass WHERE project_id = @projectId ORDER BY created_at ASC"),
      pool.request().input("projectId", sql.Int, Number(projectId))
        .query("SELECT TOP 1 description, project_name FROM projectss WHERE project_id = @projectId"),
    ]);

    let personaCard = {};
    if (gpResult.recordset[0]?.generated_output) {
      try { personaCard = JSON.parse(gpResult.recordset[0].generated_output); } catch { }
    }

   const pfInput = {
  project_description:
    projResult.recordset[0]?.description || "",

  problem_statement:
    psResult.recordset[0]?.problem_statement || "",

  persona_name:
    personaCard.persona_name ||
    personaCard.personaName ||
    personaCard.name ||
    "User Persona",

  background:
    personaCard.background || "",

  demographics:
    typeof personaCard.demographics === "object"
      ? JSON.stringify(personaCard.demographics)
      : personaCard.demographics || "",

  scenario:
    personaCard.scenario || "",

  personality:
    Array.isArray(personaCard.personality)
      ? personaCard.personality.join(", ")
      : personaCard.personality || "",

  goals:
    Array.isArray(personaCard.goals)
      ? personaCard.goals.join(", ")
      : personaCard.goals || "",

  frustrations:
    Array.isArray(personaCard.frustrations)
      ? personaCard.frustrations.join(", ")
      : personaCard.frustrations || "",

  motivations:
    Array.isArray(personaCard.motivations)
      ? personaCard.motivations.join(", ")
      : personaCard.motivations || "",

  needs:
    Array.isArray(personaCard.needs)
      ? personaCard.needs.join(", ")
      : personaCard.needs || "",

  behaviours_habits:
    Array.isArray(personaCard.behaviours)
      ? personaCard.behaviours.join(", ")
      : personaCard.behaviours || "",

  previous_experience:
    Array.isArray(personaCard.previousExperience)
      ? personaCard.previousExperience.join(", ")
      : personaCard.previousExperience || "",
};

    // ── CALL AGENT ──────────────────────────────────────────
    const flow = await callAgent(pfInput);

    // ── UPSERT ──────────────────────────────────────────────
    await pool.request()
      .input("projectId", sql.Int, Number(projectId))
      .input("pfInput", sql.NVarChar(sql.MAX), JSON.stringify(pfInput))
      .input("processFlow", sql.NVarChar(sql.MAX), JSON.stringify(flow))
      .query(`
        MERGE ProcessFlow AS target
        USING (SELECT @projectId AS project_id) AS source
        ON target.project_id = source.project_id
        WHEN MATCHED THEN UPDATE SET
          process_flow = @processFlow,
          pf_input = @pfInput,
          created_at = GETDATE()
        WHEN NOT MATCHED THEN INSERT (project_id, pf_input, process_flow)
          VALUES (@projectId, @pfInput, @processFlow);
      `);

    return NextResponse.json({ success: true, process_flow: flow });
  } catch (error) {
  logger.error("generate-process-flow failed", {
    message: error?.message,
    stack: error?.stack,
  });

  return NextResponse.json(
    {
      success: false,
      error:
        error?.name === "AbortError"
          ? "Request timeout"
          : error?.message || "Internal server error",
    },
    { status: 500 }
  );
}
      
});
