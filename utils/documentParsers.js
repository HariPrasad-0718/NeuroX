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

  const summaryMatch = normalized.match(
    /WIREFRAME\s+SUMMARY[:\s]*([\s\S]*?)(?=\n\s*(?:##\s*)?UI\s*\/\s*UX\s+ENHANCEMENTS|$)/i
  );
  const enhancementsMatch = normalized.match(/UI\s*\/\s*UX\s+ENHANCEMENTS[:\s]*([\s\S]*)$/i);

  const summary = summaryMatch ? summaryMatch[1].trim() : "";
  const enhancementsRaw = enhancementsMatch ? enhancementsMatch[1].trim() : "";
  const enhancements = [];

  if (enhancementsRaw) {
    const chunks = enhancementsRaw.split(/\n(?=\s*(?:\*{1,2})?\d+[.)]\s)/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const lineMatch = trimmed.match(/^\*{0,2}\d+[.)]\*{0,2}\s+([\s\S]*)/);
      if (lineMatch) {
        const body = lineMatch[1].replace(/^\*+|\*+$/g, "").trim();
        const [title, ...rest] = body.split("\n");
        enhancements.push({ title: title.trim(), detail: rest.join("\n").trim() });
      } else if (trimmed) {
        enhancements.push({ title: trimmed, detail: "" });
      }
    }
  }

  return { summary, enhancements, raw: normalized };
}

function decodeUnicode(str) {
  return String(str || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}
