import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { validateBody } from "@/lib/validate";
import { generateIASchema } from "@/lib/schemas";
import logger from "@/lib/logger";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const IA_AGENT_NAME = process.env.AGENT5I_IA_AGENT_NAME || "IA Agent";

const IA_PROMPT = `
You are a Senior UX Information Architect.

Return ONLY valid JSON.

FORMAT:
{
  "IA_JSON": "{\\"name\\":\\"Homepage\\",\\"type\\":\\"page\\",\\"children\\":[]}",
  "IA_SUMMARY": "summary text",
  "PROMPT": "prompt text"
}
`;

const SEED_IA_JSON = {
  name: "Homepage",
  type: "page",
  children: [
    {
      name: "Patient Care",
      type: "page",
      children: [
        {
          name: "Patient Directory",
          type: "page",
          children: [
            { name: "Search Patient", type: "action", children: [] },
            {
              name: "Patient Profile",
              type: "page",
              children: [
                { name: "Visit History", type: "component", children: [] },
                { name: "Active Treatment Plan", type: "component", children: [] },
                { name: "Prescriptions", type: "component", children: [] },
                { name: "Lab Results", type: "component", children: [] },
                { name: "Add Clinical Notes", type: "action", children: [] },
                { name: "Send Referral", type: "action", children: [] },
              ],
            },
          ],
        },
        {
          name: "Appointments",
          type: "page",
          children: [
            { name: "Book Appointment", type: "action", children: [] },
            {
              name: "Upcoming Appointments",
              type: "page",
              children: [{ name: "Reschedule or Cancel", type: "action", children: [] }],
            },
            { name: "Appointment Status", type: "component", children: [] },
          ],
        },
      ],
    },
    {
      name: "Health Records",
      type: "page",
      children: [
        {
          name: "Reports and Results",
          type: "page",
          children: [
            {
              name: "View Lab Report",
              type: "page",
              children: [{ name: "Result Explanation", type: "component", children: [] }],
            },
            { name: "Download or Share Report", type: "action", children: [] },
          ],
        },
        {
          name: "Prescriptions Management",
          type: "page",
          children: [
            { name: "Request Renewal", type: "action", children: [] },
            { name: "Prescription History", type: "component", children: [] },
          ],
        },
      ],
    },
    {
      name: "Hospital Operations",
      type: "page",
      children: [
        {
          name: "Live Operations Overview",
          type: "page",
          children: [
            { name: "Bed Occupancy Status", type: "component", children: [] },
            { name: "Staff On Duty", type: "component", children: [] },
            { name: "Critical Alerts", type: "component", children: [] },
          ],
        },
        {
          name: "Staff and Resource Management",
          type: "page",
          children: [
            {
              name: "Staff Scheduling",
              type: "page",
              children: [{ name: "Reassign Staff", type: "action", children: [] }],
            },
            { name: "Department Capacity", type: "component", children: [] },
          ],
        },
      ],
    },
    {
      name: "Requests and Approvals",
      type: "page",
      children: [
        {
          name: "Pending Requests",
          type: "page",
          children: [{ name: "Approve or Reject", type: "action", children: [] }],
        },
        { name: "Request History", type: "component", children: [] },
      ],
    },
    {
      name: "Communication and Reminders",
      type: "page",
      children: [
        {
          name: "Care Team Messaging",
          type: "page",
          children: [{ name: "Send Message", type: "action", children: [] }],
        },
        {
          name: "Notifications and Reminders",
          type: "page",
          children: [
            { name: "Follow-up Reminders", type: "component", children: [] },
            { name: "Medication Reminders", type: "component", children: [] },
          ],
        },
      ],
    },
  ],
};

const SEED_IA_SUMMARY =
  "This Information Architecture describes a unified healthcare coordination product designed to reduce fragmented patient care and operational workflows by centralizing clinical, administrative, and patient-facing tasks. From the Homepage, users navigate into Patient Care to find patients, view a complete longitudinal profile, review visit history, lab results, prescriptions, and treatment plans, and perform core actions such as adding clinical notes or sending referrals without switching systems. Appointments supports a clear end-to-end flow for booking, tracking, and managing visits with real-time status visibility, addressing missed follow-ups and uncertainty. Health Records provides a single place to view, understand, share, and manage lab reports and prescriptions, including renewal requests, eliminating manual calls and physical paperwork. Hospital Operations gives operational teams live visibility into bed occupancy, staff availability, and critical capacity alerts, with direct access to staff scheduling and resource adjustments to resolve issues early. Requests and Approvals consolidates operational decisions into one workflow to remove email-based delays and improve accountability. Communication and Reminders connects care teams and patients through messaging and automated follow-up and medication reminders, supporting continuity of care and proactive engagement across the full healthcare journey.";


// -------------------------------------
// FORMAT INPUT
// -------------------------------------
function formatPersonaInput(personas) {

  let result = "";

  personas.forEach((p, index) => {

    result += `\n===== PERSONA ${index + 1} =====\n`;

    Object.entries(p).forEach(([key, value]) => {

      let formattedValue = value;

      if (Array.isArray(value)) {

        formattedValue = value.join("\n");

      } else if (
        typeof value === "object" &&
        value !== null
      ) {

        formattedValue = JSON.stringify(
          value,
          null,
          2
        );
      }

      result += `\n${key}:\n${formattedValue}\n`;

    });

  });

  return result;
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function extractFirstJsonArray(text) {
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeIaData(parsed, fallbackSummary = "", fallbackPrompt = "") {
  const next = {
    IA_JSON: null,
    IA_SUMMARY: fallbackSummary || "",
    PROMPT: fallbackPrompt || "",
  };

  if (!parsed || typeof parsed !== "object") {
    return next;
  }

  if (parsed.IA_SUMMARY && typeof parsed.IA_SUMMARY === "string") {
    next.IA_SUMMARY = parsed.IA_SUMMARY;
  }

  if (parsed.PROMPT && typeof parsed.PROMPT === "string") {
    next.PROMPT = parsed.PROMPT;
  }

  if (parsed.IA_JSON) {
    next.IA_JSON = parsed.IA_JSON;
    return next;
  }

  // Accept direct IA tree responses: { name, type, children }.
  if (
    parsed.name ||
    parsed.title ||
    Array.isArray(parsed.children) ||
    parsed.type
  ) {
    next.IA_JSON = parsed;
    return next;
  }

  return next;
}

const DEFINE_FIELD_MAP = {
  persona_id: "PERSONA_ID",
  header: "HEADER",
  background: "BACKGROUND",
  demographics: "DEMOGRAPHICS",
  personality: "PERSONALITY",
  "behaviours & habits": "BEHAVIOURS & HABITS",
  behaviors: "BEHAVIOURS & HABITS",
  behaviours: "BEHAVIOURS & HABITS",
  needs: "NEEDS & EXPECTATIONS",
  previousexperience: "PREVIOUS EXPERIENCE",
  previousExperience: "PREVIOUS EXPERIENCE",
  positivethemes: "POSITIVE THEMES",
  positiveThemes: "POSITIVE THEMES",
  negativethemes: "NEGATIVE THEMES",
  negativeThemes: "NEGATIVE THEMES",
  personaname: "HEADER",
  name: "HEADER",
  goals: "GOALS",
  frustrations: "FRUSTRATIONS",
  motivations: "MOTIVATIONS",
  "previous experience": "PREVIOUS EXPERIENCE",
  scenario: "SCENARIO",
  "positive themes": "POSITIVE THEMES",
  "negative themes": "NEGATIVE THEMES",
  "needs & expectations": "NEEDS & EXPECTATIONS",
};

const DEFINE_REQUIRED_HINT_FIELDS = ["HEADER", "BACKGROUND", "NEEDS & EXPECTATIONS"];

const DEFINE_ALLOWED_FIELDS = [
  "PERSONA_ID",
  "HEADER",
  "BACKGROUND",
  "DEMOGRAPHICS",
  "PERSONALITY",
  "BEHAVIOURS & HABITS",
  "GOALS",
  "FRUSTRATIONS",
  "MOTIVATIONS",
  "PREVIOUS EXPERIENCE",
  "SCENARIO",
  "POSITIVE THEMES",
  "NEGATIVE THEMES",
  "NEEDS & EXPECTATIONS",
];

function toAgentString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (item === null || item === undefined ? "" : String(item).trim()))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value).trim();
}

function normalizeDefinePersonaRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const normalized = {};

  Object.entries(record).forEach(([key, value]) => {
    const mappedKey = DEFINE_FIELD_MAP[String(key || "").trim().toLowerCase()] || key;
    normalized[mappedKey] = toAgentString(value);
  });

  if (!DEFINE_REQUIRED_HINT_FIELDS.some((field) => normalized[field])) {
    return null;
  }

  const ordered = {};
  DEFINE_ALLOWED_FIELDS.forEach((field) => {
    if (normalized[field]) {
      ordered[field] = normalized[field];
    }
  });

  return ordered;
}

function parseDefinePayload(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDefinePersonaRecord(item)).filter(Boolean);
  }

  if (typeof value === "object") {
    if (Array.isArray(value.personas)) {
      return parseDefinePayload(value.personas);
    }

    if (Array.isArray(value.define_outputs)) {
      return parseDefinePayload(value.define_outputs);
    }

    const normalized = normalizeDefinePersonaRecord(value);
    return normalized ? [normalized] : [];
  }

  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed) {
      return parseDefinePayload(parsed);
    }
  }

  return [];
}

function parseDefineRecordRawOutput(rawValue) {
  if (!rawValue) return [];

  if (typeof rawValue === "object") {
    return parseDefinePayload(rawValue);
  }

  if (typeof rawValue !== "string") {
    return [];
  }

  const directParsed = tryParseJson(rawValue);
  if (directParsed) {
    return parseDefinePayload(directParsed);
  }

  const arrayCandidate = extractFirstJsonArray(rawValue);
  const arrayParsed = arrayCandidate && tryParseJson(arrayCandidate);
  if (arrayParsed) {
    return parseDefinePayload(arrayParsed);
  }

  const objectCandidate = extractFirstJsonObject(rawValue);
  const objectParsed = objectCandidate && tryParseJson(objectCandidate);
  if (objectParsed) {
    return parseDefinePayload(objectParsed);
  }

  return [];
}

function dedupePersonas(personas) {
  const seen = new Set();
  const result = [];

  for (const persona of personas) {
    const key = (persona.PERSONA_ID || persona.HEADER || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(persona);
  }

  return result;
}


// -------------------------------------
// POST
// -------------------------------------
export const POST = withAuth(async (req, _ctx, user) => {
  const { data, error: validationError } = await validateBody(req, generateIASchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  const { projectId, combinedPersonaOutput, regenerate } = data;

  try {

    // -------------------------------------
    // DB CONNECTION
    // -------------------------------------
const pool = await getPool();

    // -------------------------------------
    // CHECK EXISTING IA
    // -------------------------------------
    if (!regenerate) {
      const existingIA = await pool.request()
        .input("projectId", sql.Int, Number(projectId))
        .query(`SELECT TOP 1 ia FROM InformationArchitecture WHERE project_id = @projectId ORDER BY created_at DESC`);
      if (existingIA.recordset.length) {
        try {
          const stored = JSON.parse(existingIA.recordset[0].ia);
          return NextResponse.json({ success: true, information_architecture: stored, fromDb: true });
        } catch { /* fall through to regenerate */ }
      }
    }

    // -------------------------------------
    // GET PROBLEM STATEMENT
    // -------------------------------------
    const problemResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT TOP 1 problem_statement
        FROM problem_statements
        WHERE project_id = @projectId
      `);

    const problemStatement =
      problemResult.recordset[0]
        ?.problem_statement || "";

    // -------------------------------------
    // GET DEFINE PHASE OUTPUTS
    // -------------------------------------
    const personaResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT generated_output
FROM generated_personass
WHERE project_id = @projectId
ORDER BY created_at ASC
      `);

    const definePersonas = [];

    const providedDefineOutputs = parseDefinePayload(combinedPersonaOutput);
    if (providedDefineOutputs.length) {
      definePersonas.push(...providedDefineOutputs);
    }

    // -------------------------------------
    // ADD ALL DEFINE RECORDS
    // -------------------------------------
    for (const row of personaResult.recordset) {

      if (!row.generated_output) continue;

      try {
        const parsedPersonas = parseDefineRecordRawOutput(row.generated_output);
        if (parsedPersonas.length) {
          definePersonas.push(...parsedPersonas);
        }

      } catch (err) {

        logger.warn("Failed parsing generated_output", { error: err });
      }
    }

    const defineOutputs = [
      {
        PROBLEM_STATEMENT: toAgentString(problemStatement),
      },
      ...dedupePersonas(definePersonas),
    ];

    if (defineOutputs.length <= 1) {
  return NextResponse.json({
    success: false,
    error: "No define phase combined outputs found for this project",
  });
}
    logger.debug("IA generation input built", { personaCount: defineOutputs.length });

    const formattedInput = formatPersonaInput(defineOutputs);
    const fullPrompt = `${IA_PROMPT}\n\nINPUT:\n\n${formattedInput}`;

    if (!USERNAME || !PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Agent credentials are missing. Set AGENT5I_USERNAME and AGENT5I_PASSWORD.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------
    // PAYLOAD
    // -------------------------------------
    const payload = {

      name: IA_AGENT_NAME,

      input_info: fullPrompt,

      username: USERNAME,

      password: PASSWORD,
    };

    logger.debug("IA agent payload built", { agentName: payload.name });

    // -------------------------------------
    // API CALL
    // -------------------------------------
    let response;
    try {
      response = await fetch(
        WEBHOOK_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(180000),
        }
      );
    } catch (fetchErr) {
      if (fetchErr?.name === "TimeoutError") {
        return NextResponse.json(
          {
            success: false,
            error: "Agent request timed out",
          },
          { status: 504 }
        );
      }

      throw fetchErr;
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const raw = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent request failed (${response.status})`,
          raw: raw.slice(0, 1000),
        },
        { status: response.status }
      );
    }

    const data = tryParseJson(raw) || { raw, contentType };

    logger.debug("IA agent response received", { hasMessage: !!data?.message });

    // -------------------------------------
    // GET RAW RESPONSE
    // -------------------------------------
    // -------------------------------------
// GET RAW RESPONSE
// -------------------------------------
const rawMessage = data?.message;
    if (!rawMessage) {

      return NextResponse.json({
        success: false,
        error: "No response from IA agent",
        raw: data,
      });
    }

    // -------------------------------------
    // CLEAN RESPONSE
    // -------------------------------------
    let cleaned = String(rawMessage).trim();

    cleaned = cleaned.replace(
      /^```json/,
      ""
    );

    cleaned = cleaned.replace(
      /^```/,
      ""
    );

    cleaned = cleaned.replace(
      /```$/,
      ""
    );

    cleaned = cleaned.trim();

    // -------------------------------------
// PARSE JSON
// -------------------------------------
// -------------------------------------
// PARSE IA RESPONSE
// -------------------------------------

let iaData = {
  IA_JSON: null,
  IA_SUMMARY: "",
  PROMPT: "",
};

const directParsed = tryParseJson(cleaned);

if (directParsed) {
  iaData = normalizeIaData(directParsed);
} else {

  // CASE 2 → IA_JSON='{}' format

  const iaJsonMatch =
  cleaned.match(/IA_JSON='({[\s\S]*})'/);

  const summaryMatch =
    cleaned.match(/IA_SUMMARY='([\s\S]*?)'/);

  const promptMatch =
    cleaned.match(/PROMPT='([\s\S]*?)'/);

  if (iaJsonMatch) {

    try {

      iaData.IA_JSON = JSON.parse(
        iaJsonMatch[1]
      );

    } catch (e) {

      logger.warn("Failed parsing IA_JSON from regex match", { error: e });
    }
  }

  if (summaryMatch) {

    iaData.IA_SUMMARY =
      summaryMatch[1];
  }

  if (promptMatch) {
    iaData.PROMPT = promptMatch[1];
  }

  // CASE 3 → text before/after JSON object
  if (!iaData.IA_JSON) {
    const jsonCandidate = extractFirstJsonObject(cleaned);
    const extractedParsed =
      jsonCandidate && tryParseJson(jsonCandidate);

    if (extractedParsed) {
      iaData = normalizeIaData(
        extractedParsed,
        iaData.IA_SUMMARY,
        iaData.PROMPT
      );
    }
  }
}

    // -------------------------------------
    // PARSE IA_JSON IF STRING
    // -------------------------------------
    if (typeof iaData?.IA_JSON === "string") {

      if (!iaData.IA_JSON) {
        return NextResponse.json({
          success: false,
          error: "Failed parsing IA_JSON: IA_JSON is empty",
          raw: iaData,
        });
      }

      const parsedIaJson = tryParseJson(iaData.IA_JSON);

      if (!parsedIaJson) {
        return NextResponse.json({
          success: false,
          error: "Failed parsing IA_JSON: invalid JSON",
          raw: iaData,
        });
      }

      iaData.IA_JSON = parsedIaJson;
    }

    if (!iaData.IA_JSON) {
      return NextResponse.json({
        success: false,
        error: "Agent returned invalid IA data.",
        raw: iaData,
      });
    }

    if (!iaData.PROMPT) {
      iaData.PROMPT = fullPrompt;
    }

    // -------------------------------------
    // SUCCESS
    // -------------------------------------
    // -------------------------------------
    // SAVE IA TO DB (UPSERT)
    // -------------------------------------
    try {
      await pool.request()
        .input("projectId", sql.Int, Number(projectId))
        .input("ia", sql.NVarChar(sql.MAX), JSON.stringify(iaData))
        .query(`MERGE InformationArchitecture AS target
          USING (SELECT @projectId AS project_id, @ia AS ia) AS source
          ON target.project_id = source.project_id
          WHEN MATCHED THEN UPDATE SET ia = source.ia, created_at = GETDATE()
          WHEN NOT MATCHED THEN INSERT (project_id, ia) VALUES (source.project_id, source.ia);`);
    } catch (dbErr) { logger.error("IA DB save error", { error: dbErr }); }

    // -------------------------------------
    // SUCCESS
    // -------------------------------------
    return NextResponse.json({

      success: true,

      information_architecture: iaData,

      sent_input: defineOutputs,
    });

  } catch (err) {

    logger.error("POST /api/generate-information-architecture error", { error: err });

    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
});
