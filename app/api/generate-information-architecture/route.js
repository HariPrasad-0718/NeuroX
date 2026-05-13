import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

const WEBHOOK_URL =
  "https://agent5idev.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = "yarramachu.sunaini@c5i.ai";
const PASSWORD = "Subbareddy@9014";

const SYSTEM_PROMPT = `
You are a Senior UX Information Architect.

Return ONLY valid JSON.

FORMAT:
{
  "IA_JSON": {
    "name": "Homepage",
    "type": "page",
    "children": []
  },
  "IA_SUMMARY": "summary"
}
`;


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


// -------------------------------------
// POST
// -------------------------------------
export async function POST(req) {

  try {

    const body = await req.json();

    const { projectId } = body;

    if (!projectId) {

      return NextResponse.json({
        success: false,
        error: "projectId required",
      });
    }

    // -------------------------------------
    // DB CONNECTION
    // -------------------------------------
const pool = await getPool();
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
    // GET GENERATED PERSONAS
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

    const personas = [];

    // -------------------------------------
    // ADD PROBLEM STATEMENT FIRST
    // -------------------------------------
    personas.push({
      PROBLEM_STATEMENT: problemStatement,
    });

    // -------------------------------------
    // ADD ALL PERSONAS
    // -------------------------------------
    for (const row of personaResult.recordset) {

      if (!row.generated_output) continue;

      try {

        let parsed =
          typeof row.generated_output === "string"
            ? JSON.parse(row.generated_output)
            : row.generated_output;

        // if array
        if (Array.isArray(parsed)) {

          parsed.forEach((p) => personas.push(p));

        }

        // if object
        else if (typeof parsed === "object") {

          personas.push(parsed);
        }

      } catch (err) {

        console.error(
          "Failed parsing generated_output:",
          err
        );
      }
    }

    if (personas.length <= 1) {
  return NextResponse.json({
    success: false,
    error: "No personas found for this project",
  });
}
    // -------------------------------------
    // DEBUG
    // -------------------------------------
    console.log(
      "\n=========== FINAL IA INPUT ==========="
    );

    console.log(
      JSON.stringify(personas, null, 2)
    );

    // -------------------------------------
    // FORMAT INPUT
    // -------------------------------------
    const formattedInput =
      formatPersonaInput(personas);

    const fullPrompt = `
${SYSTEM_PROMPT}

INPUT:

${formattedInput.slice(0, 12000)}
`;

    // -------------------------------------
    // PAYLOAD
    // -------------------------------------
    const payload = {

      name: "IA Agent",

      input_info: fullPrompt,

      username: USERNAME,

      password: PASSWORD,
    };

    console.log(
      "\n=========== PAYLOAD ==========="
    );

    console.log(
      JSON.stringify(payload, null, 2)
    );

    // -------------------------------------
    // API CALL
    // -------------------------------------
    const response = await fetch(
      WEBHOOK_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log(
      "\n=========== IA RESPONSE ==========="
    );

    console.log(
      JSON.stringify(data, null, 2)
    );

    // -------------------------------------
    // GET RAW RESPONSE
    // -------------------------------------
    // -------------------------------------
// GET RAW RESPONSE
// -------------------------------------
const rawMessage =
  data?.final_response ||
  data?.message ||
  data?.output ||
  data?.result ||
  data?.data;
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
};

try {

  // CASE 1 → Proper JSON
  iaData = JSON.parse(cleaned);

} catch (err) {

  // CASE 2 → IA_JSON='{}' format

  const iaJsonMatch =
  cleaned.match(/IA_JSON='({[\s\S]*})'/);

  const summaryMatch =
    cleaned.match(/IA_SUMMARY='([\s\S]*?)'/);

  if (iaJsonMatch) {

    try {

      iaData.IA_JSON = JSON.parse(
        iaJsonMatch[1]
      );

    } catch (e) {

      console.error(
        "Failed parsing IA_JSON:",
        e
      );
    }
  }

  if (summaryMatch) {

    iaData.IA_SUMMARY =
      summaryMatch[1];
  }
}

    // -------------------------------------
    // PARSE IA_JSON IF STRING
    // -------------------------------------
    if (
      typeof iaData?.IA_JSON === "string"
    ) {

      try {

        iaData.IA_JSON = JSON.parse(
          iaData.IA_JSON
        );

      } catch (err) {

        console.error(
          "Failed parsing IA_JSON"
        );
      }
    }

    // -------------------------------------
    // SUCCESS
    // -------------------------------------
    return NextResponse.json({

      success: true,

      information_architecture: iaData,

      sent_input: personas,
    });

  } catch (err) {

    console.error(
      "\n=========== IA ERROR ==========="
    );

    console.error(err);

    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}