import { cleanPrdHtml, cleanPrdOutput, decodeEscapedText, formatApiResponse, stripFence } from "./stringUtils";
import { parseWireframeResult } from "./documentParsers";

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

export function tryParseJsonString(value) {
  if (!value) return null;

  let cleaned = String(value).trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace("```json", "").trim();
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace("```", "").trim();
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3).trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
    } catch {
      return null;
    }
  }
}

export function normalizeLooseText(value) {
  return stripFence(String(value || ""))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export function extractPrdMarkup(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return "";

  if (typeof value === "object") {
    const directKeys = ["prd_output", "message", "final_response", "content", "output", "result"];
    for (const key of directKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = extractPrdMarkup(value[key], depth + 1);
        if (found) return found;
      }
    }

    if (Array.isArray(value.messages)) {
      for (let i = value.messages.length - 1; i >= 0; i -= 1) {
        const found = extractPrdMarkup(value.messages[i], depth + 1);
        if (found) return found;
      }
    }

    for (const nested of Object.values(value)) {
      const found = extractPrdMarkup(nested, depth + 1);
      if (found) return found;
    }

    return "";
  }

  const raw = decodeEscapedText(value).trim();
  if (!raw) return "";

  const stripped = stripFence(raw)
    .replace(/^```html/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  if (stripped.includes("<h1") && stripped.includes("<h2")) {
    return stripped;
  }

  const prdOutputAssignment = stripped.match(/prd_output\s*[:=]\s*['"]([\s\S]*)['"]$/i);
  if (prdOutputAssignment) {
    const found = extractPrdMarkup(prdOutputAssignment[1], depth + 1);
    if (found) return found;
  }

  const parsed = parseLooseJson(stripped);
  if (parsed) {
    const found = extractPrdMarkup(parsed, depth + 1);
    if (found) return found;
  }

  return "";
}

export { cleanPrdHtml, cleanPrdOutput, decodeEscapedText, formatApiResponse, parseWireframeResult };
