import { NextResponse } from "next/server";

const WEBHOOK_URL = "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || "yarramachu.sunaini@c5i.ai";
const PASSWORD = process.env.AGENT5I_PASSWORD || "Subbareddy@9014";

const PERSONA_CREATION_AGENT_NAME = "Persona Creation Agent";

// -------- Helpers --------
function tryParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractPersonaCard(data) {
  if (!data) return {};

  const unwrap = (obj) => {
    if (!obj) return obj;

    if (typeof obj === "string") {
      try {
        return unwrap(JSON.parse(obj));
      } catch {
        return obj;
      }
    }

    const wrappers = ["message", "output", "result", "text", "response"];
    for (let key of wrappers) {
      if (obj[key]) return unwrap(obj[key]);
    }

    return obj;
  };

  const cleanData = unwrap(data);

  console.log("CLEANED AGENT DATA:", cleanData); // ✅ DEBUG

  if (typeof cleanData !== "object") {
    return {
      name: "Persona",
      background: String(cleanData),
      goals: [],
      needs: [],
      frustrations: [],
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
  quote: cleanData.QUOTE || "",
  background: cleanData.BACKGROUND || "",

  goals: toArray(cleanData.GOALS),
  frustrations: toArray(cleanData.FRUSTRATIONS),
  motivations: toArray(cleanData.MOTIVATIONS),
  needs: toArray(cleanData["NEEDS & EXPECTATIONS"]),
  positiveThemes: toArray(cleanData["POSITIVE THEMES"]),
  negativeThemes: toArray(cleanData["NEGATIVE THEMES"]),
  behaviours: toArray(cleanData["BEHAVIOURS & HABITS"]),
  personality: toArray(cleanData.PERSONALITY),
  previousExperience: toArray(cleanData["PREVIOUS EXPERIENCE"]),

  // ✅ ADD THESE
  demographics: cleanData.DEMOGRAPHICS || {},
  problemStatement:
    cleanData["PROBLEM STATEMENT"] ||
    cleanData.problem_statement ||
    cleanData.problemStatement ||
    "",
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
export async function POST(req) {
  try {
    const body = await req.json();
    const empathy_data_and_context = body?.empathy_data_and_context?.trim();

    if (!empathy_data_and_context) {
      return NextResponse.json(
        { error: "empathy_data_and_context is required" },
        { status: 400 }
      );
    }

    const payload = buildPayload(empathy_data_and_context);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

    const personaCard = extractPersonaCard(responseData);

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
}