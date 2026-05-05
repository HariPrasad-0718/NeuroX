const WEBHOOK_URL = process.env.AGENT5I_WEBHOOK_URL || "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";
const AGENT5I_USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const AGENT5I_PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const PERSONA_AGENT_NAME = process.env.AGENT5I_PERSONA_AGENT_NAME || "User Persona Enhancer";
const QUESTION_AGENT_NAME = process.env.AGENT5I_QUESTION_AGENT_NAME || "User Group Question Generator";
const PERSONA_GENERATOR_AGENT_NAME =
  process.env.AGENT5I_PERSONA_GENERATOR_AGENT_NAME || "Persona Generator Agent";
const SUMMARY_AGENT_NAME =
  process.env.AGENT5I_SUMMARY_AGENT_NAME || "Research Summary Agent";

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractDescription(data) {
  if (!data) return "";

  if (typeof data === "string") {
    const parsed = tryParseJson(data);
    return parsed ? extractDescription(parsed) : data.trim();
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractDescription(item);
      if (found) return found;
    }
    return "";
  }

  if (typeof data === "object") {
    const keys = [
      "persona_description",
      "message",
      "output",
      "result",
      "text",
      "response",
    ];

    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string") {
        const parsed = tryParseJson(value);
        return parsed ? extractDescription(parsed) : value.trim();
      }
      if (value && (typeof value === "object" || Array.isArray(value))) {
        const found = extractDescription(value);
        if (found) return found;
      }
    }
  }

  return "";
}

function extractQuestions(data) {
  if (!data) return [];

  if (typeof data === "string") {
    const parsed = tryParseJson(data);
    if (parsed) return extractQuestions(parsed);

    const lines = data
      .split(/\r?\n+/)
      .map((line) => line.replace(/^\s*\d+[\.)]\s*/, "").trim())
      .filter(Boolean);
    return lines.slice(0, 5);
  }

  if (Array.isArray(data)) {
    return data.map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
  }

  if (typeof data === "object") {
    const keys = ["questions", "message", "output", "result", "text", "response"];

    for (const key of keys) {
      const value = data[key];

      if (Array.isArray(value)) {
        return value.map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
      }

      if (typeof value === "string") {
        const parsed = tryParseJson(value);
        if (parsed) {
          const parsedQuestions = extractQuestions(parsed);
          if (parsedQuestions.length > 0) return parsedQuestions;
        }

        const lines = value
          .split(/\r?\n+/)
          .map((line) => line.replace(/^\s*\d+[\.)]\s*/, "").trim())
          .filter(Boolean);
        if (lines.length > 0) return lines.slice(0, 5);
      }

      if (value && (typeof value === "object" || Array.isArray(value))) {
        const nested = extractQuestions(value);
        if (nested.length > 0) return nested;
      }
    }
  }

  return [];
}

function extractPersonaOutput(data) {
  if (!data) return "";

  if (typeof data === "string") {
    const parsed = tryParseJson(data);
    return parsed ? extractPersonaOutput(parsed) : data.trim();
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractPersonaOutput(item);
      if (found) return found;
    }
    return "";
  }

  if (typeof data === "object") {
    const keys = ["persona_output", "message", "output", "result", "text", "response"];

    for (const key of keys) {
      const value = data[key];

      if (typeof value === "string") {
        const parsed = tryParseJson(value);
        if (parsed) {
          const nested = extractPersonaOutput(parsed);
          if (nested) return nested;
        }
        if (value.trim()) return value.trim();
      }

      if (value && (typeof value === "object" || Array.isArray(value))) {
        const nested = extractPersonaOutput(value);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function extractSummary(data) {
  if (!data) return "";

  if (typeof data === "string") {
    const parsed = tryParseJson(data);
    return parsed ? extractSummary(parsed) : data.trim();
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractSummary(item);
      if (found) return found;
    }
    return "";
  }

  if (typeof data === "object") {
    const keys = [
      "summary_output",
      "summary",
      "research_summary",
      "message",
      "output",
      "result",
      "text",
      "response",
    ];

    for (const key of keys) {
      const value = data[key];

      if (typeof value === "string") {
        const parsed = tryParseJson(value);
        if (parsed) {
          const nested = extractSummary(parsed);
          if (nested) return nested;
        }
        if (value.trim()) return value.trim();
      }

      if (value && (typeof value === "object" || Array.isArray(value))) {
        const nested = extractSummary(value);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function buildPersonaPayload(projectDescription, personaTitle, personaDescription) {
  const userInput = {
    project_description: projectDescription,
    persona_title: personaTitle,
    persona_description: personaDescription,
  };

  return {
    username: AGENT5I_USERNAME,
    password: AGENT5I_PASSWORD,
    name: PERSONA_AGENT_NAME,
    project_description: projectDescription,
    persona_title: personaTitle,
    persona_description: personaDescription,
    rules: [],
    user_input: JSON.stringify(userInput),
  };
}

function buildQuestionPayload(description, userGroup, personaDescription) {
  const userInput = {
    description,
    user_group: userGroup,
    persona_description: personaDescription,
  };

  return {
    username: AGENT5I_USERNAME,
    password: AGENT5I_PASSWORD,
    name: QUESTION_AGENT_NAME,
    description,
    user_group: userGroup,
    persona_description: personaDescription,
    rules: [],
    user_input: JSON.stringify(userInput),
  };
}

function buildPersonaGeneratorPayload(projectDescription, userAnswers, personaName) {
  const userInput = {
    project_description: projectDescription,
    user_answers: userAnswers,
    persona_name: personaName,
  };

  return {
    username: AGENT5I_USERNAME,
    password: AGENT5I_PASSWORD,
    name: PERSONA_GENERATOR_AGENT_NAME,
    project_description: projectDescription,
    user_answers: userAnswers,
    persona_name: personaName,
    rules: [],
    user_input: JSON.stringify(userInput),
  };
}

function buildSummaryPayload(projectDescription, userAnswers, personaName) {
  const userInput = {
    project_description: projectDescription,
    user_answers: userAnswers,
    transcript: userAnswers,
    persona_name: personaName,
  };

  return {
    username: AGENT5I_USERNAME,
    password: AGENT5I_PASSWORD,
    name: SUMMARY_AGENT_NAME,
    project_description: projectDescription,
    user_answers: userAnswers,
    transcript: userAnswers,
    persona_name: personaName,
    rules: [],
    user_input: JSON.stringify(userInput),
  };
}

async function callAgent(payload) {
  if (!AGENT5I_USERNAME || !AGENT5I_PASSWORD) {
    throw new Error("Agent credentials are missing. Set AGENT5I_USERNAME and AGENT5I_PASSWORD.");
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Agent request failed (${res.status}): ${raw.slice(0, 500)}`);
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(raw);
  }

  const parsed = tryParseJson(raw.trim());
  return parsed ?? raw;
}

export async function enhancePersonaDescription({
  projectDescription,
  personaTitle,
  personaDescription,
}) {
  const normalizedProjectDescription = (projectDescription || "").trim();
  const normalizedPersonaTitle = (personaTitle || "").trim();
  const normalizedPersonaDescription = (personaDescription || "").trim() || "No description provided";

  if (!normalizedProjectDescription || !normalizedPersonaTitle) {
    return normalizedPersonaDescription;
  }

  const payload = buildPersonaPayload(
    normalizedProjectDescription,
    normalizedPersonaTitle,
    normalizedPersonaDescription
  );

  const responseData = await callAgent(payload);
  const enhanced = extractDescription(responseData);
  console.log("Agent5i response:", { responseData, extractedDescription: enhanced });
  return enhanced || normalizedPersonaDescription;
}

export async function generatePersonaQuestions({
  description,
  userGroup,
  personaDescription,
}) {
  const normalizedDescription = (description || "").trim();
  const normalizedUserGroup = (userGroup || "").trim();
  const normalizedPersonaDescription = (personaDescription || "").trim() || "No persona description provided";

  if (!normalizedDescription) {
    throw new Error("description is required");
  }

  if (!normalizedUserGroup) {
    throw new Error("user_group is required");
  }

  const payload = buildQuestionPayload(
    normalizedDescription,
    normalizedUserGroup,
    normalizedPersonaDescription
  );

  const responseData = await callAgent(payload);
  const questions = extractQuestions(responseData);

  if (!questions.length) {
    throw new Error("No questions were generated by the agent");
  }

  return questions;
}

export async function generatePersonaFromTranscript({
  projectDescription,
  userAnswers,
  personaName,
}) {
  const normalizedProjectDescription = (projectDescription || "").trim();
  const normalizedUserAnswers = (userAnswers || "").trim();
  const normalizedPersonaName = (personaName || "").trim();

  if (!normalizedProjectDescription) {
    throw new Error("project_description is required");
  }

  if (!normalizedUserAnswers) {
    throw new Error("user_answers is required");
  }

  const payload = buildPersonaGeneratorPayload(
    normalizedProjectDescription,
    normalizedUserAnswers,
    normalizedPersonaName
  );

  const responseData = await callAgent(payload);
  const personaOutput = extractPersonaOutput(responseData);

  if (!personaOutput) {
    throw new Error("No persona output was generated by the agent");
  }

  return personaOutput;
}

export async function generateSummaryFromTranscript({
  projectDescription,
  userAnswers,
  personaName,
}) {
  const normalizedProjectDescription = (projectDescription || "").trim();
  const normalizedUserAnswers = (userAnswers || "").trim();
  const normalizedPersonaName = (personaName || "").trim();

  if (!normalizedProjectDescription) {
    throw new Error("project_description is required");
  }

  if (!normalizedUserAnswers) {
    throw new Error("user_answers is required");
  }

  const payload = buildSummaryPayload(
    normalizedProjectDescription,
    normalizedUserAnswers,
    normalizedPersonaName
  );

  const responseData = await callAgent(payload);
  const summary = extractSummary(responseData);

  if (!summary) {
    throw new Error("No summary was generated by the agent");
  }

  return summary;
}
