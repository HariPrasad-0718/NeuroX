export function parsePersonaOutput(rawOutput, fallbackName) {
  const normalized = String(rawOutput || "").replace(/\r\n/g, "\n").trim();

  const getHeadingBlock = (text, heading) => {
    const regex = new RegExp(`${heading}:?\\s*([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`, "i");
    return text.match(regex)?.[1]?.trim() || "";
  };

  const getBullets = (block) => {
    if (!block) return [];
    return block
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  };

  return {
    name: fallbackName || "Persona",
    says: getBullets(getHeadingBlock(normalized, "Says")),
    thinks: getBullets(getHeadingBlock(normalized, "Thinks")),
    does: getBullets(getHeadingBlock(normalized, "Does")),
    feels: getBullets(getHeadingBlock(normalized, "Feels")),
    painPoints: getBullets(getHeadingBlock(normalized, "Pain Points")),
    needs: getBullets(getHeadingBlock(normalized, "Needs")),
  };
}

export function buildPersonaOutput(data) {
  return `Says:
${(data.says || []).map((x) => `- ${x}`).join("\n")}

Thinks:
${(data.thinks || []).map((x) => `- ${x}`).join("\n")}

Does:
${(data.does || []).map((x) => `- ${x}`).join("\n")}

Feels:
${(data.feels || []).map((x) => `- ${x}`).join("\n")}

Pain Points:
${(data.painPoints || []).map((x) => `- ${x}`).join("\n")}

Needs:
${(data.needs || []).map((x) => `- ${x}`).join("\n")}`;
}

export function parseSummaryAndInsights(rawText) {
  const normalized = String(rawText || "").replace(/\\n/g, "\n").trim();
  const parts = normalized.split(/Key Insights:/i);

  const summaryPart = (parts[0] || "").replace(/User Summary:/i, "").trim();

  const insightsPart = parts[1]
    ? parts[1]
        .split("\n")
        .map((line) => line.replace(/^[-•*\d.\s]+/, "").trim())
        .filter(Boolean)
    : [];

  return {
    summaryPart,
    insightsPart,
  };
}

export function parseWireframeResult(raw) {
  const text = decodeUnicode(raw || "");
  const normalized = text.replace(/\r\n/g, "\n");

  const toObject = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return toObject(parsed);
      }
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const normalizeEnhancements = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") {
            const line = item.trim();
            if (!line) return null;
            return { title: line, detail: "" };
          }
          if (!item || typeof item !== "object") return null;

          const title = String(item.what || item.title || item.label || "").trim();
          const detail = String(item.why || item.detail || item.description || "").trim();

          if (!title && !detail) return null;
          return { title: title || detail, detail: title && detail ? detail : "" };
        })
        .filter(Boolean);
    }

    const textValue = String(value).trim();
    if (!textValue) return [];

    return textValue
      .split(/\n(?=\s*(?:\*{1,2})?\d+[.)]\s)/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const lineMatch = chunk.match(/^\*{0,2}\d+[.)]\*{0,2}\s+([\s\S]*)/);
        if (!lineMatch) return { title: chunk, detail: "" };
        const body = lineMatch[1].replace(/^\*+|\*+$/g, "").trim();
        const [title, ...rest] = body.split("\n");
        return { title: title.trim(), detail: rest.join("\n").trim() };
      });
  };

  const root = toObject(normalized);
  const firstLayer = root && root.result ? toObject(root.result) || root : root;

  let payload = firstLayer;
  const nestedSummaryObject = firstLayer && typeof firstLayer.wireframe_summary === "string"
    ? toObject(firstLayer.wireframe_summary)
    : null;
  if (nestedSummaryObject) {
    payload = {
      ...firstLayer,
      ...nestedSummaryObject,
    };
  }

  const summary = String(
    payload?.wireframe_summary ||
    payload?.summary ||
    ""
  ).trim();

  const figmaPrompt = String(
    payload?.figma_prompt ||
    payload?.prompt ||
    ""
  ).trim();

  const enhancements = normalizeEnhancements(
    payload?.ux_enhancements || payload?.enhancements || ""
  );

  if (summary || enhancements.length || figmaPrompt) {
    return {
      summary,
      enhancements,
      figmaPrompt,
      raw: normalized,
      structured: payload,
    };
  }

  const summaryMatch = normalized.match(
    /WIREFRAME\s+SUMMARY[:\s]*([\s\S]*?)(?=\n\s*(?:##\s*)?(?:UI\s*\/\s*UX\s+ENHANCEMENTS|FIGMA\s+PROMPT)|$)/i
  );
  const enhancementsMatch = normalized.match(
    /UI\s*\/\s*UX\s+ENHANCEMENTS[:\s]*([\s\S]*?)(?=\n\s*(?:##\s*)?FIGMA\s+PROMPT|$)/i
  );
  const figmaPromptMatch = normalized.match(/FIGMA\s+PROMPT[:\s]*([\s\S]*)$/i);

  const fallbackSummary = summaryMatch ? summaryMatch[1].trim() : "";
  const fallbackEnhancementsRaw = enhancementsMatch ? enhancementsMatch[1].trim() : "";
  const fallbackPrompt = figmaPromptMatch ? figmaPromptMatch[1].trim() : "";

  return {
    summary: fallbackSummary,
    enhancements: normalizeEnhancements(fallbackEnhancementsRaw),
    figmaPrompt: fallbackPrompt,
    raw: normalized,
    structured: null,
  };
}

function decodeUnicode(str) {
  return String(str || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}
