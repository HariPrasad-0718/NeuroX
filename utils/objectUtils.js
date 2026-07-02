export function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/\n|,/)
    .map((line) => line.replace(/^\s*[-*•\d]+[.)-]?\s*/, "").trim())
    .filter(Boolean);
}

export function parseDemographics(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;

  const obj = {};
  String(value)
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (!key || !rest.length) return;
      obj[key.trim()] = rest.join(":").trim();
    });

  return obj;
}

export function parseHeaderText(rawHeader, fallbackName) {
  const lines = String(rawHeader || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let name = "";
  let role = "";
  let quote = "";

  lines.forEach((line) => {
    if (/^(persona\s*)?name\s*:/i.test(line)) {
      name = line.replace(/.*?:\s*/, "").trim();
      return;
    }
    if (/^(role|title)\s*:/i.test(line)) {
      role = line.replace(/.*?:\s*/, "").trim();
      return;
    }
    if (/^quote\s*:/i.test(line)) {
      quote = line.replace(/.*?:\s*/, "").replace(/["“”]/g, "").trim();
      return;
    }
    if (!quote && (line.includes('"') || line.includes("“"))) {
      quote = line.replace(/["“”]/g, "").trim();
    }
  });

  if (!name && lines.length) {
    name = lines[0].replace(/.*?:\s*/, "").trim();
  }

  return {
    name: name || fallbackName || "Persona",
    role,
    quote,
  };
}

export function parseThemeLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeAgentCard(raw = {}) {
  return {
    header: raw.header || raw.HEADER || "",
    name: raw.name || raw.NAME || "",
    quote: raw.quote || raw.QUOTE || "",
    background: raw.background || raw.BACKGROUND || "",
    scenario: raw.scenario || raw.SCENARIO || "",
    demographics: raw.demographics || raw.DEMOGRAPHICS || "",
    personality: raw.personality || raw.PERSONALITY || [],
    behaviours: raw.behaviours || raw["BEHAVIOURS & HABITS"] || [],
    goals: raw.goals || raw.GOALS || [],
    frustrations: raw.frustrations || raw.FRUSTRATIONS || [],
    motivations: raw.motivations || raw.MOTIVATIONS || [],
    previousExperience: raw.previousExperience || raw["PREVIOUS EXPERIENCE"] || [],
    positiveThemes: raw.positiveThemes || raw["POSITIVE THEMES"] || [],
    negativeThemes: raw.negativeThemes || raw["NEGATIVE THEMES"] || [],
    needs: raw.needs || raw["NEEDS & EXPECTATIONS"] || [],
    problemStatement:
      raw.problemStatement ||
      raw.problem_statement ||
      raw["PROBLEM STATEMENT"] ||
      "",
  };
}

export function buildPersonaContext(persona, fallbackProjectName) {
  const validOutputs = (persona.outputs || []).filter((output) => {
    const summary = String(output.summary || "").trim();
    const outcome = String(output.interviewOutcome || "").trim();
    const personaOutput = String(output.personaOutput || "").trim();

    const hasSummary = summary && summary.toLowerCase() !== "no summary available";
    const hasOutcome =
      outcome &&
      outcome.toLowerCase() !== "no outcome available" &&
      outcome.toLowerCase() !== "no interview outcome available";
    const hasPersonaOutput =
      personaOutput && personaOutput.toLowerCase() !== "no persona output available";

    const hasDemographics = Boolean(
      output.demographics?.gender ||
        output.demographics?.age !== undefined ||
        output.demographics?.location ||
        output.demographics?.relationshipStatus ||
        output.demographics?.title ||
        output.demographics?.education
    );

    return hasSummary && hasOutcome && hasPersonaOutput && hasDemographics;
  });

  return `Persona ID: ${persona.personaId}
Persona Name: ${persona.personaName}
Project Name: ${persona.projectName || fallbackProjectName || ""}
Project Description: ${persona.projectDescription || ""}
Persona Outputs:
${validOutputs.length
  ? validOutputs
      .map((output, index) => {
        const createdAt = output.generatedAt ? new Date(output.generatedAt).toISOString() : "";
        const metadata = [
          `Output ${index + 1}`,
          output.interviewId ? `Interview ID: ${output.interviewId}` : "",
          output.intervieweeId ? `Interviewee ID: ${output.intervieweeId}` : "",
          output.intervieweeName ? `Interviewee Name: ${output.intervieweeName}` : "",
          createdAt ? `Generated At: ${createdAt}` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        const demographicsText = [
          output.demographics?.gender ? `Gender: ${output.demographics.gender}` : "",
          output.demographics?.age !== undefined && output.demographics?.age !== null
            ? `Age: ${output.demographics.age}`
            : "",
          output.demographics?.location ? `Location: ${output.demographics.location}` : "",
          output.demographics?.relationshipStatus
            ? `Relationship Status: ${output.demographics.relationshipStatus}`
            : "",
          output.demographics?.title ? `Title: ${output.demographics.title}` : "",
          output.demographics?.education ? `Education: ${output.demographics.education}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        return `${metadata}
${demographicsText ? `${demographicsText}\n` : ""}
Summary:
${output.summary || "No summary available"}

Interview Outcome:
${output.interviewOutcome || "No interview outcome available"}

Persona Output:
${output.personaOutput || "No persona output available"}`;
      })
      .join("\n\n")
  : "No valid interview details available."}`;
}

export function toObjectIfPossible(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function extractJsonObjectString(value) {
  const text = String(value || "");
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export function parseLooseJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;

  const cleaned = stripFence(value);

  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === "object") return direct;
    if (typeof direct === "string") {
      const nested = parseLooseJson(direct);
      if (nested) return nested;
    }
  } catch {
    // continue
  }

  const extracted = extractJsonObjectString(cleaned);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // continue
    }
  }

  const relaxed = cleaned
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"');
  if (relaxed !== cleaned) {
    try {
      const parsed = JSON.parse(relaxed);
      if (parsed && typeof parsed === "object") return parsed;
      if (typeof parsed === "string") {
        const nested = parseLooseJson(parsed);
        if (nested) return nested;
      }
    } catch {
      // continue
    }

    const extractedRelaxed = extractJsonObjectString(relaxed);
    if (extractedRelaxed) {
      try {
        const parsed = JSON.parse(extractedRelaxed);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // continue
      }
    }
  }

  return null;
}
