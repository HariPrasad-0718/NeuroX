import { Paragraph, TextRun } from "docx";

export function formatKeyLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function decodeUnicode(str) {
  return String(str || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

export function decodeEscapedText(value) {
  return String(value || "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

export function stripFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

export function normalizeLooseText(value) {
  return stripFence(String(value || ""))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export function appendWordValue(paragraphs, value, depth = 0) {
  if (value === null || value === undefined) {
    paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
    return;
  }

  if (typeof value === "string") {
    const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    if (!lines.length) {
      paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
      return;
    }

    lines.forEach((line) => {
      paragraphs.push(new Paragraph({ text: line, spacing: { after: 120 } }));
    });
    return;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
      return;
    }

    value.forEach((item, index) => {
      if (item && typeof item === "object") {
        paragraphs.push(
          new Paragraph({
            text: `Item ${index + 1}`,
            bullet: { level: Math.min(depth, 2) },
            spacing: { after: 80 },
          })
        );
        appendWordValue(paragraphs, item, depth + 1);
      } else {
        paragraphs.push(
          new Paragraph({
            text: String(item),
            bullet: { level: Math.min(depth, 2) },
            spacing: { after: 120 },
          })
        );
      }
    });
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) => {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `${formatKeyLabel(key)}:`, bold: true })],
          spacing: { after: 80 },
        })
      );
      appendWordValue(paragraphs, nested, depth + 1);
    });
    return;
  }

  paragraphs.push(new Paragraph({ text: String(value), spacing: { after: 120 } }));
}

export function cleanPrdHtml(value) {
  const text = String(value || "").trim();

  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\sjavascript:/gi, " ");
}

export function sanitizePrdText(value) {
  if (!value) return "";

  let text = String(value).trim();

  text = text.replace(/```html/g, "");
  text = text.replace(/```/g, "");

  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  const escapeReplacements = {
    "\\u2013": "–",
    "\\u2014": "—",
    "\\u2018": "'",
    "\\u2019": "'",
    "\\u201c": '"',
    "\\u201d": '"',
    "\\u2192": "→",
    "\\u2265": "≥",
    "\\u2264": "≤",
    "\\u2022": "•",
    "\\n": "\n",
    "\\t": " ",
  };

  for (const [bad, good] of Object.entries(escapeReplacements)) {
    const escaped = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "g"), good);
  }

  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");

  text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  text = text.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  text = text.replace(/\sjavascript:/gi, " ");

  if (!text.startsWith("<") && !text.includes("<h1") && !text.includes("<h2")) {
    text = text
      .split(/\n+/)
      .filter((line) => line.trim())
      .map((line) => `<p>${line.trim()}</p>`)
      .join("");
  }

  return text.trim();
}

export function cleanPrdOutput(text) {
  if (!text) return "";

  let cleaned = text.trim();

  cleaned = cleaned.replace(/```html/g, "");
  cleaned = cleaned.replace(/```/g, "");

  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  const replacements = {
    "\\u2013": "–",
    "\\u2014": "—",
    "\\u2018": "'",
    "\\u2019": "'",
    "\\u201c": '"',
    "\\u201d": '"',
    "\\u2192": "→",
    "\\u2265": "≥",
    "\\u2264": "≤",
    "\\u2022": "•",
    "\\n": "\n",
    "\\t": " ",
  };

  for (const [bad, good] of Object.entries(replacements)) {
    cleaned = cleaned.replace(new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), good);
  }

  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

export function formatApiResponse(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function convertMarkdownToHtml(text) {
  if (!text) return "";

  let html = text;

  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^---$/gm, '<hr />');

  html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)+/g, function (match) {
    if (match.includes('<ol>')) return match;
    return `<ol>${match}</ol>`;
  });

  const lines = html.split("\n");
  const result = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      result.push('<br />');
      continue;
    }

    if (/^<[hH][1-6]/.test(line) || /^<ul>/.test(line) || /^<ol>/.test(line) || /^<li>/.test(line) || /^<table>/.test(line) || /^<hr \/>/.test(line)) {
      result.push(line);
      continue;
    }

    result.push(`<p>${line}</p>`);
  }

  return result.join("\n");
}
