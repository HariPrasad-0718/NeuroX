import { getPool, sql } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const userAnswers = body.user_answers || body.persona_description || "";
    const personaTitle = body.persona_title || body.persona_name || "";
    const interviewId = Number(body.interview_id || 0) || null;

    const payload = {
  username: process.env.AGENT_USERNAME,
  password: process.env.AGENT_PASSWORD,
  name: "Research Summary Agent",

  project_description: body.project_description,
  user_answers: userAnswers,
  transcript: userAnswers,
  persona_name: personaTitle,

  rules: [],
  user_input: JSON.stringify({
    project_description: body.project_description,
    user_answers: userAnswers,
    transcript: userAnswers,
    persona_name: personaTitle,
  }),
};

    const res = await fetch(
      "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const rawText = await res.text();

    console.log("RAW SUMMARY RESPONSE:", rawText);

    let summary = "No summary available";

    try {
      const parsed = JSON.parse(rawText);

      // ✅ smart extraction (like Python)
      const extractSummary = (data) => {
        if (!data) return "";

        if (typeof data === "string") return data;

        if (Array.isArray(data)) {
          for (const item of data) {
            const res = extractSummary(item);
            if (res) return res;
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
              const res = extractSummary(data[key]);
              if (res) return res;
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

    return Response.json({ summary });

  } catch (err) {
    console.error("API ERROR:", err);
    return Response.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}