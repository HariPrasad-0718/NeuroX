import { NextResponse } from "next/server";

const WEBHOOK_URL = "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";
const USERNAME = process.env.AGENT_USERNAME || process.env.AGENT5I_USERNAME;
const PASSWORD = process.env.AGENT_PASSWORD || process.env.AGENT5I_PASSWORD;
const AGENT_NAME = "UX Journey Flow Generator";

function buildPayload(body) {
  const fallback = body.empathy_map || body.project_description || "";
  const userInput = {
    project_description: body.project_description,
    persona_name: body.persona_name,
    empathy_map: body.empathy_map,
    pain_points: body.pain_points || body.frustrations,
    needs: body.needs,
    scenario: body.scenario,
    goals: body.goals,
    frustrations: body.frustrations,
    motivations: body.motivations,
    background: body.background,
    demographics: body.demographics,
    previous_experience: body.previous_experience,
    behaviours_habits: body.behaviours_habits,
  };

  return {
    username: USERNAME,
    password: PASSWORD,
    name: AGENT_NAME,
    project_description: body.project_description || "",
    persona_name: body.persona_name || "User Persona",
    empathy_map: body.empathy_map || "",
    user_answers: body.user_answers || fallback,
    pain_points: body.pain_points || body.frustrations || fallback,
    needs: body.needs || fallback,
    scenario: body.scenario || fallback,
    goals: body.goals || fallback,
    previous_experience: body.previous_experience || fallback,
    behaviours_habits: body.behaviours_habits || fallback,
    background: body.background || "",
    demographics: body.demographics || "",
    personality: body.personality || "",
    frustrations: body.frustrations || "",
    motivations: body.motivations || "",
    rules: [],
    user_input: JSON.stringify(userInput),
  };
}

function extractFlow(data) {
  if (!data) return null;

  if (typeof data === "string") {
    const cleaned = data.replace(/```json|```/g, "").trim();
    try { return extractFlow(JSON.parse(cleaned)); } catch { return null; }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const r = extractFlow(item);
      if (r) return r;
    }
    return null;
  }

  if (typeof data === "object") {
    if (data.nodes && data.edges) return data;
    const keys = ["process_flow", "flow", "output", "result", "message", "text", "response", "final_response", "data", "content"];
    for (const key of keys) {
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
    if (match) {
      const r = extractFlow(match[1]);
      if (r) return r;
    }
    const r = extractFlow(msg);
    if (r) return r;
  }
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.project_description) {
      return NextResponse.json({ success: false, error: "project_description is required" }, { status: 400 });
    }

    const payload = buildPayload(body);

    // ── INPUT LOG ──────────────────────────────────────────────
    console.log("\n========== PROCESS FLOW: INPUT ==========");
    console.log("project_description:", payload.project_description?.slice(0, 200));
    console.log("persona_name       :", payload.persona_name);
    console.log("empathy_map        :", payload.empathy_map?.slice(0, 300));
    console.log("pain_points        :", payload.pain_points?.slice(0, 200));
    console.log("needs              :", payload.needs?.slice(0, 200));
    console.log("goals              :", payload.goals?.slice(0, 200));
    console.log("scenario           :", payload.scenario?.slice(0, 200));
    console.log("=========================================\n");

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });

    const text = await response.text();

    // ── RAW OUTPUT LOG ────────────────────────────────────────
    console.log("\n========== PROCESS FLOW: RAW AGENT RESPONSE ==========");
    console.log(text.slice(0, 3000));
    console.log("======================================================\n");

    if (!response.ok) {
      return NextResponse.json({ success: false, error: "Agent API failed", details: text }, { status: 500 });
    }

    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    let flow = extractFlowFromMessages(parsed?.response?.messages);
    if (!flow?.nodes) flow = extractFlow(parsed);

    // ── EXTRACTED FLOW LOG ────────────────────────────────────
    console.log("\n========== PROCESS FLOW: EXTRACTED FLOW ==========");
    if (flow) {
      console.log("title   :", flow.title);
      console.log("persona :", flow.persona);
      console.log("nodes   :", flow.nodes?.length, flow.nodes?.map(n => n.label).join(" → "));
      console.log("edges   :", flow.edges?.length);
    } else {
      console.log("FAILED — no flow extracted");
    }
    console.log("===================================================\n");

    if (!flow?.nodes || !flow?.edges) {
      return NextResponse.json({ success: false, error: "Unable to generate process flow", raw: parsed }, { status: 500 });
    }

    const typeMap = { entry: "start", exit_success: "end", exit_fail: "end", action: "process", loop: "process", stage_label: "process" };
    const normalizedFlow = {
      ...flow,
      nodes: flow.nodes.map((n) => ({ ...n, type: typeMap[n.type] || n.type })),
      edges: flow.edges.map((e) => ({
        from: e.from || e.source,
        to: e.to || e.target,
        label: e.label || "",
      })),
    };

    return NextResponse.json({ success: true, process_flow: normalizedFlow });
  } catch (error) {
    console.error("PROCESS FLOW ERROR:", error?.message);
    return NextResponse.json(
      { success: false, error: error?.name === "AbortError" ? "Request timeout" : error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
