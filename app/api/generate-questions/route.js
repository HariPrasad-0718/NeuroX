import { NextResponse } from "next/server";

const WEBHOOK_URL = "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

export async function POST(req) {
  try {
    const body = await req.json();
    const project = body.project || {};

    const user_input = `
Project: ${project.name || ""}
Client: ${project.client || ""}
Description: ${project.desc || ""}
Persona: ${project.persona || "users"}

Generate 5 empathy interview questions.

Return JSON array only like:
[{"question":"...","step":"Empathize"}]
`;

    const payload = {
      username: process.env.AGENT_USERNAME,
      password: process.env.AGENT_PASSWORD,
      name: process.env.AGENT_NAME,
      user_input,
    };

    const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  body: JSON.stringify(payload),
});


const text = await res.text();

if (!res.ok) {
  return NextResponse.json({
    success: false,
    error: "Agent API failed",
    status: res.status,
    raw: text,
  });
}

let data;
try {
  data = JSON.parse(text);
} catch (err) {
  return NextResponse.json({
    success: false,
    error: "Agent returned non-JSON response",
    raw: text,
  });
}

    // const data = await res.json();

    // 🛑 SAFETY CHECK
    if (!data.message) {
      return NextResponse.json({
        success: false,
        error: "No message from agent",
      });
    }

    let questions = [];

    try {
      const parsedMessage = JSON.parse(data.message);

      if (parsedMessage.empathize_questions) {
        questions = JSON.parse(parsedMessage.empathize_questions);
      } else {
        throw new Error("Missing empathize_questions");
      }
    } catch (parseError) {
      console.error("PARSE ERROR:", parseError);

      return NextResponse.json({
        success: false,
        error: "Invalid AI response format",
      });
    }

    const formatted = questions.map((q) => q.question);

    return NextResponse.json({
      success: true,
      questions: formatted,
    });

  } catch (err) {
    console.error("AGENT ERROR:", err);

    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}