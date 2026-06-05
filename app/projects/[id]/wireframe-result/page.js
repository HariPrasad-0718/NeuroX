"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, LayoutDashboard, Sparkles, X } from "lucide-react";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

function decodeUnicode(str) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function parseResult(raw) {
  const text = decodeUnicode(raw || "");

  // Normalize: collapse \r\n
  const normalized = text.replace(/\r\n/g, "\n");

  // Extract WIREFRAME SUMMARY block
  const summaryMatch = normalized.match(
    /WIREFRAME\s+SUMMARY[:\s]*([\s\S]*?)(?=\n\s*(?:##\s*)?UI\s*\/\s*UX\s+ENHANCEMENTS|$)/i
  );
  // Extract UI/UX ENHANCEMENTS block
  const enhancementsMatch = normalized.match(
    /UI\s*\/\s*UX\s+ENHANCEMENTS[:\s]*([\s\S]*)$/i
  );

  const summary = summaryMatch ? summaryMatch[1].trim() : "";
  const enhancementsRaw = enhancementsMatch ? enhancementsMatch[1].trim() : "";
  const enhancements = [];

  if (enhancementsRaw) {
    // Split on any line that starts with: "1.", "1)", "**1.", "**1)", "- 1.", etc.
    const chunks = enhancementsRaw.split(/\n(?=\s*(?:\*{1,2})?\d+[.)]\s)/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      // Strip leading bold markers and number
      const lineMatch = trimmed.match(/^\*{0,2}\d+[.)]\*{0,2}\s+([\s\S]*)/);
      if (lineMatch) {
        const body = lineMatch[1].replace(/^\*+|\*+$/g, "").trim();
        const [title, ...rest] = body.split("\n");
        enhancements.push({ title: title.trim(), detail: rest.join("\n").trim() });
      } else if (trimmed) {
        // Non-numbered line — treat as a plain item
        enhancements.push({ title: trimmed, detail: "" });
      }
    }
  }

  return { summary, enhancements, raw: normalized };
}

function formatKeyLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toObjectIfPossible(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function stripFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

function extractJsonObjectString(value) {
  const text = String(value || "");
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function parseLooseJson(value) {
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

  // Try a relaxed unescape pass for doubly-escaped JSON.
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

function normalizeLooseText(value) {
  return stripFence(String(value || ""))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function appendWordValue(paragraphs, value, depth = 0) {
  if (value === null || value === undefined) {
    paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
    return;
  }

  if (typeof value === "string") {
    const lines = value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

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

function cleanPrdHtml(value) {
  const text = String(value || "").trim();

  // basic sanitization for display safety
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\sjavascript:/gi, " ");
}

function decodeEscapedText(value) {
  return String(value || "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

function extractPrdMarkup(value, depth = 0) {
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

function formatApiResponse(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function isHtmlLike(value) {
  return typeof value === "string" && /<[^>]+>/.test(value);
}

function extractDocumentFromAgentResponse(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return null;

  const parsed = typeof value === "string" ? parseApiJson(value) || toObjectIfPossible(value) : value;
  if (!parsed || typeof parsed !== "object") return null;

  const nestedKeys = ["data", "message", "final_response", "content", "output", "result", "body"];
  for (const key of nestedKeys) {
    const nested = parsed[key];
    if (!nested) continue;

    const extracted = extractDocumentFromAgentResponse(nested, depth + 1);
    if (extracted) return extracted;
  }

  if (parsed.brd_document) {
    const brdDocument = typeof parsed.brd_document === "string" ? parseApiJson(parsed.brd_document) || toObjectIfPossible(parsed.brd_document) : parsed.brd_document;
    if (brdDocument && typeof brdDocument === "object") return brdDocument;
  }

  return parsed;
}

function renderDocumentValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-slate-500">-</p>;
  }

  if (typeof value === "string") {
    if (isHtmlLike(value)) {
      return (
        <div className="space-y-6">
        <div
 className="
mx-auto max-w-[1100px]
rounded-[18px]
border border-[#dbe1ea]
bg-white
p-10
shadow-[0_8px_30px_rgba(15,23,42,0.08)]
prose max-w-none
prose-p:text-[15px] prose-p:leading-8 prose-p:text-slate-700
prose-li:text-slate-700
prose-strong:text-slate-900

/* HEADINGS STYLE */
prose-h1:bg-violet-100
prose-h1:text-violet-900
prose-h1:px-4
prose-h1:py-3
prose-h1:rounded-lg
prose-h1:border-l-4
prose-h1:border-violet-500
prose-h1:mb-6

prose-h2:bg-violet-50
prose-h2:text-violet-800
prose-h2:px-4
prose-h2:py-2
prose-h2:rounded-md
prose-h2:border-l-4
prose-h2:border-violet-400
prose-h2:mt-8
prose-h2:mb-4

/* spacing between sections */
prose-p:mb-4
prose-li:mb-1

/* TABLES */
prose-table:border
prose-table:border-gray-300
prose-table:rounded-lg
prose-th:bg-violet-600
prose-th:text-white
prose-th:text-xs
prose-th:uppercase
prose-th:tracking-wider
prose-th:p-3

prose-td:border
prose-td:border-gray-200
prose-td:p-3
"
  dangerouslySetInnerHTML={{ __html: prdHtml }}
/></div>
      );
    }

    const lines = value
      .split(/(?:\r?\n|\\n)+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <p key={`${depth}-line-${idx}`} className="text-[16px] leading-8 text-[#4d466d]">
            {line}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    return (
      <ol className="space-y-3 pl-5 list-decimal marker:text-[#6c3dff]">
        {value.map((item, idx) => (
          <li key={`${depth}-arr-${idx}`} className="text-[16px] text-[#4d466d]">
            {item && typeof item === "object" ? renderDocumentValue(item, depth + 1) : String(item)}
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, nested]) => (
          <div key={`${depth}-obj-${key}`} className="rounded-[18px] border border-[#dacfff] bg-[#faf7ff] p-4 shadow-[0_8px_24px_rgba(108,61,255,0.06)]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6c3dff]">
              {formatKeyLabel(key)}
            </p>
            <div>{renderDocumentValue(nested, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-[16px] text-[#4d466d]">{String(value)}</p>;
}

function renderAgentResponseDocument(rawResponse, title) {
  const responseDocument = extractDocumentFromAgentResponse(rawResponse);
  if (!responseDocument) return null;

  const entries = Object.entries(responseDocument);
  const heading = String(
    responseDocument?.document_meta?.project_name ||
    responseDocument?.project_name ||
    responseDocument?.name ||
    title ||
    "Agent Response Document"
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-[#dacfff] bg-white p-7 shadow-[0_10px_35px_rgba(108,61,255,0.08)]">
        <div className="inline-flex rounded-full border border-[#dacfff] bg-[#f8f4ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c3dff]">
          Agent Response Document
        </div>
        <h4 className="mt-4 text-[38px] font-extrabold leading-none text-[#6c3dff]" style={{ fontFamily: "Syne, sans-serif" }}>{heading}</h4>
        <p className="mt-3 max-w-3xl text-[17px] leading-8 text-[#6b6390]">
          Structured JSON response received from the agent, rendered as a document for easier review.
        </p>
      </div>

      {entries.map(([key, value]) => (
        <section key={key} className="rounded-[30px] border border-[#dacfff] bg-white p-7 shadow-[0_10px_35px_rgba(108,61,255,0.08)]">
          <div className="mb-5 border-b border-[#e8deff] pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c3dff]">{formatKeyLabel(key)}</p>
          </div>
          <div className="prose prose-slate max-w-none">{renderDocumentValue(value)}</div>
        </section>
      ))}
    </div>
  );
}

function parseApiJson(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function WireframeResultPage() {
  const router = useRouter();
  const { id } = useParams();
  const [raw, setRaw] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [isBrdModalOpen, setIsBrdModalOpen] = useState(false);
  const [brdLoading, setBrdLoading] = useState(false);
  const [brdError, setBrdError] = useState("");
  const [brdData, setBrdData] = useState(null);
  const [isDownloadingBrd, setIsDownloadingBrd] = useState(false);
  const [brdShowRaw, setBrdShowRaw] = useState(false);
  const [brdCollapsed, setBrdCollapsed] = useState({});
  const [isPrdModalOpen, setIsPrdModalOpen] = useState(false);
  const [prdLoading, setPrdLoading] = useState(false);
  const [prdError, setPrdError] = useState("");
  const [prdHtml, setPrdHtml] = useState("");
  const [prdRawResponse, setPrdRawResponse] = useState("");
  const [isDownloadingPrd, setIsDownloadingPrd] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("wireframeResult");
    const fallback = sessionStorage.getItem("wireframeResultFallback") === "1";
    if (stored) {
      setRaw(stored);
      setIsFallback(fallback);
      sessionStorage.removeItem("wireframeResult");
      sessionStorage.removeItem("wireframeResultFallback");
    }
  }, []);

  useEffect(() => {
    if (!isPromptModalOpen && !isBrdModalOpen && !isPrdModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPromptModalOpen(false);
        setIsBrdModalOpen(false);
        setIsPrdModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPromptModalOpen, isBrdModalOpen, isPrdModalOpen]);

  const handleOpenPromptModal = async () => {
    setIsPromptModalOpen(true);

    if (!id) {
      setPromptError("Project id is missing.");
      return;
    }

    if (agentPrompt && !promptError) {
      return;
    }

    setPromptLoading(true);
    setPromptError("");

    try {
      const res = await fetch("/api/generate-app-build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(id) }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to get prompt from agent");
      }

      const promptText = String(data.prompt || data.rawMessage || "").trim();
      setAgentPrompt(promptText);
    } catch (err) {
      setPromptError(err.message || "Failed to get prompt from agent");
      setAgentPrompt("");
    } finally {
      setPromptLoading(false);
    }
  };

  const handleOpenBrdModal = async () => {
    setIsBrdModalOpen(true);

    if (!id) {
      setBrdError("Project id is missing.");
      return;
    }

    setBrdLoading(true);
    setBrdError("");
    setBrdShowRaw(false);
    setBrdCollapsed({});

    try {
      const res = await fetch("/api/generate-brd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(id) }),
      });

      const bodyText = await res.text();
      const data = parseApiJson(bodyText);

      if (!data) {
        throw new Error("API returned invalid JSON.");
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || data?.error || "Failed to generate BRD document");
      }

      setBrdData(data?.data?.brd || data?.brd || null);
    } catch (err) {
      setBrdError(err.message || "Failed to generate BRD document");
      setBrdData(null);
    } finally {
      setBrdLoading(false);
    }
  };

  const handleOpenPrdModal = async () => {
    setIsPrdModalOpen(true);

    if (!id) {
      setPrdError("Project id is missing.");
      return;
    }

    setPrdLoading(true);
    setPrdError("");
    setPrdRawResponse("");

    try {
      const res = await fetch("/api/generate-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(id) }),
      });

      const bodyText = await res.text();
      const data = parseApiJson(bodyText);

      setPrdRawResponse(formatApiResponse(data?.agent_response || ""));

      if (!data) {
        setPrdError("API returned invalid JSON.");
        setPrdHtml("");
        return;
      }

      if (!res.ok || !data?.success) {
        setPrdError(data?.error?.message || data?.error || "Failed to generate PRD document");
        setPrdHtml("");
        return;
      }

      const nextHtml = cleanPrdHtml(
        data?.data?.prd_output ||
          data?.prd_output ||
          extractPrdMarkup(data?.raw_response || "")
      );
      if (!nextHtml) {
        setPrdError("PRD output is empty.");
        setPrdHtml("");
        return;
      }

      setPrdHtml(nextHtml);
    } catch (err) {
      setPrdError(err.message || "Failed to generate PRD document");
      setPrdHtml("");
    } finally {
      setPrdLoading(false);
    }
  };

  const handleDownloadPrdDoc = async () => {
    if (!prdHtml || isDownloadingPrd) return;

    setIsDownloadingPrd(true);
    try {
      const parser = new DOMParser();
      const dom = parser.parseFromString(prdHtml, "text/html");

      const children = [];
      let titleAdded = false;
      const elements = dom.body.querySelectorAll("h1, h2, h3, p, li, table");

      elements.forEach((element) => {
        const tag = element.tagName.toLowerCase();
        const text = (element.textContent || "").trim();

        if (tag === "h1") {
          titleAdded = true;
          children.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 220 },
            })
          );
          return;
        }

        if (tag === "h2") {
          children.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 180, after: 120 },
            })
          );
          return;
        }

        if (tag === "h3") {
          children.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 140, after: 100 },
            })
          );
          return;
        }

        if (tag === "p") {
          if (text) {
            children.push(new Paragraph({ text, spacing: { after: 120 } }));
          }
          return;
        }

        if (tag === "li") {
          if (text) {
            children.push(new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } }));
          }
          return;
        }

        if (tag === "table") {
          const rows = Array.from(element.querySelectorAll("tr"));
          if (!rows.length) return;

          const maxCols = rows.reduce(
            (max, row) => Math.max(max, row.querySelectorAll("td,th").length),
            0
          );
          if (!maxCols) return;

          const tableRows = rows.map((row) => {
            const cells = Array.from(row.querySelectorAll("td,th"));
            const tableCells = [];

            for (let i = 0; i < maxCols; i += 1) {
              const cellText = (cells[i]?.textContent || "").trim();
              tableCells.push(
                new TableCell({
                  children: [new Paragraph({ text: cellText || " " })],
                })
              );
            }

            return new TableRow({ children: tableCells });
          });

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            })
          );
          children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        }
      });

      if (!titleAdded) {
        children.unshift(
          new Paragraph({
            text: "Product Requirements Document",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          })
        );
      }

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "product-requirements-document.docx");
    } finally {
      setIsDownloadingPrd(false);
    }
  };

  // ── BRD section definitions (mirrors Flask renderSections) ──────────────────
  const BRD_SECTIONS = [
    { key: "business_problem",          num: "01", title: "Business Problem",           type: "prose" },
    { key: "objectives_and_outcomes",   num: "02", title: "Objectives & Outcomes",      type: "prose" },
    { key: "users_and_personas",        num: "03", title: "Users & Personas",           type: "tags" },
    { key: "business_requirements",     num: "04", title: "Business Requirements",      type: "requirements" },
    { key: "functional_scope",          num: "05", title: "Functional Scope",           type: "prose" },
    { key: "non_functional_expectations", num: "06", title: "Non Functional Expectations", type: "prose" },
    { key: "integrations",              num: "07", title: "Integrations",               type: "tags" },
    { key: "compliance_and_security",   num: "08", title: "Compliance & Security",      type: "prose" },
    { key: "success_metrics",           num: "09", title: "Success Metrics",            type: "metrics_table" },
    { key: "key_stakeholders",          num: "10", title: "Key Stakeholders",           type: "editable" },
    { key: "project_constraints",       num: "11", title: "Project Constraints",        type: "constraints_table" },
    { key: "cost_benefit_analysis",     num: "12", title: "Cost Benefit Analysis",      type: "costtable" },
    { key: "document_approval",         num: "13", title: "Document Approval",          type: "editable" },
    { key: "draft_assumptions",         num: "14", title: "Draft Assumptions",          type: "tags" },
  ];

  // Resolve brd object from API response
  const brdDoc = (() => {
    if (!brdData) return null;
    if (typeof brdData === "object") return brdData;
    try { return JSON.parse(brdData); } catch { return null; }
  })();

  const brdMeta =
    brdDoc?.document_meta && typeof brdDoc.document_meta === "object"
      ? brdDoc.document_meta
      : null;

  const brdActiveSections = BRD_SECTIONS.filter((s) => {
    if (!brdDoc) return false;
    const v = brdDoc[s.key];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  const toggleBrdSection = (key) =>
    setBrdCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // Helper: extract label:value from a labeled string (mirrors Flask get())
  const getLabelVal = (text, label) => {
    const m = String(text || "").match(new RegExp(`${label}:\\s*([^.]+)`, "i"));
    return m ? m[1].trim() : "";
  };

  const getConstraintVal = (text, label) => {
    const m = String(text || "").match(
      new RegExp(`${label}:\\s*(.*?)(?=(?:Constraint|Description|Impact|Mitigation):|$)`, "i")
    );
    return m ? m[1].trim() : "";
  };

  // ── Section content renderer (mirrors Flask renderContent) ──────────────────
  const renderBrdContent = (value, type) => {
    if (type === "prose") {
      return (
        <p className="text-[13px] leading-[1.9] text-gray-700 whitespace-pre-wrap">
          {String(value || "")}
        </p>
      );
    }

    if (type === "tags") {
      if (!Array.isArray(value)) return null;
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, i) => (
            <span
              key={i}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    if (type === "requirements") {
      if (!Array.isArray(value)) return null;
      return (
        <div className="space-y-2">
          {value.map((line, i) => {
            const parts = String(line || "").split("|").map((p) => p.trim());
            const id   = parts[0] || `BR-${String(i + 1).padStart(3, "0")}`;
            const desc = parts[1] || "";
            const pri  = (parts[2] || "").replace(/priority:/i, "").trim();
            const priColor =
              pri.toLowerCase() === "high"   ? "border-red-300 bg-red-50 text-red-700" :
              pri.toLowerCase() === "medium" ? "border-amber-300 bg-amber-50 text-amber-700" :
                                               "border-green-300 bg-green-50 text-green-700";
            return (
              <div
                key={i}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
              >
                <code className="shrink-0 rounded bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                  {id}
                </code>
                <span className="flex-1 text-[13px] text-gray-700">{desc || "—"}</span>
                {pri && (
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${priColor}`}>
                    {pri}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (type === "metrics_table") {
      if (!Array.isArray(value)) return null;
      const cols = ["Metric", "Baseline", "Target", "Measurement", "Review"];
      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-[12px] text-gray-700">
            <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>{cols.map((h) => <th key={h} className="border-b border-gray-200 px-4 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {value.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                  {cols.map((lbl) => (
                    <td key={lbl} className="border-b border-gray-100 px-4 py-2">
                      {getLabelVal(item, lbl)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === "constraints_table") {
      if (!Array.isArray(value)) return null;
      const cols = ["Constraint", "Description", "Impact", "Mitigation"];
      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-[12px] text-gray-700">
            <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>{cols.map((h) => <th key={h} className="border-b border-gray-200 px-4 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {value.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                  {cols.map((lbl) => (
                    <td key={lbl} className="border-b border-gray-100 px-4 py-2">
                      {getConstraintVal(item, lbl)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === "editable") {
      if (!Array.isArray(value)) return null;
      return (
        <div className="space-y-2">
          {value.map((item, i) => (
            <input
              key={i}
              defaultValue={String(item || "")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            />
          ))}
        </div>
      );
    }

    if (type === "costtable") {
      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-[12px] text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 px-4 py-2 font-semibold">Cost</th>
                <th className="border-b border-gray-200 px-4 py-2 font-semibold">Benefit</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((row) => (
                <tr key={row} className={row % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                  <td className="border-b border-gray-100 px-4 py-3" contentEditable suppressContentEditableWarning />
                  <td className="border-b border-gray-100 px-4 py-3" contentEditable suppressContentEditableWarning />
                </tr>
              ))}
              <tr className="bg-gray-100">
                <td className="px-4 py-2 font-semibold">Total Cost:</td>
                <td className="px-4 py-2 font-semibold">Expected ROI:</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p className="text-[13px] leading-[1.9] text-gray-700 whitespace-pre-wrap">
        {String(value || "")}
      </p>
    );
  };

  const handleDownloadBrdDoc = async () => {
    if (!brdDoc || isDownloadingBrd) return;
    setIsDownloadingBrd(true);
    try {
      const title = String(brdMeta?.project_name || "Business Requirements Document");
      const paragraphs = [
        new Paragraph({
          children: [new TextRun({ text: "Business Requirements Document", bold: true, size: 36 })],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }),
        new Paragraph({
          children: [new TextRun({ text: title, italics: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
        }),
      ];
      if (brdMeta) {
        paragraphs.push(
          new Paragraph({ text: "Document Meta", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } })
        );
        Object.entries(brdMeta).forEach(([key, value]) => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${formatKeyLabel(key)}: `, bold: true }),
                new TextRun({ text: String(value ?? "") }),
              ],
              spacing: { after: 120 },
            })
          );
        });
      }
      brdActiveSections.forEach((section) => {
        paragraphs.push(
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 140 },
          })
        );
        appendWordValue(paragraphs, brdDoc[section.key], 0);
      });
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      saveAs(blob, `${safeName || "brd-document"}.docx`);
    } finally {
      setIsDownloadingBrd(false);
    }
  };

  const { summary, enhancements, raw: parsedRaw } = parseResult(raw);
  const hasContent = summary || enhancements.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => router.push(`/projects/${id}`)}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Wireframe Analysis</h1>
          <p className="text-xs text-gray-500">AI-generated design review</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {isFallback && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>The wireframe agent is temporarily unavailable. This is a placeholder analysis — re-upload your image once the agent service is restored.</span>
          </div>
        )}

        {!hasContent ? (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-16 text-center">
            <p className="text-sm text-gray-400">No analysis result found.</p>
          </div>
        ) : (
          <>
            {/* WIREFRAME SUMMARY */}
            {summary && (
              <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">Section 1</p>
                      <h2 className="text-base font-bold text-white">Wireframe Summary</h2>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenPromptModal}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Prompt
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenBrdModal}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Generate BRD Document
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenPrdModal}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Generate PRD Document
                    </button>
                  </div>
                </div>
                {/* Body */}
                <div className="px-7 py-6">
                  {summary.split("\n\n").filter(Boolean).map((para, i) => (
                    <p key={i} className="text-sm text-gray-700 leading-7 mb-4 last:mb-0">{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* UI/UX ENHANCEMENTS */}
            {enhancements.length > 0 && (
              <div className="rounded-2xl border border-purple-100 bg-white shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-200">Section 2</p>
                    <h2 className="text-base font-bold text-white">UI/UX Enhancements</h2>
                  </div>
                </div>
                {/* Enhancement items */}
                <div className="px-6 py-5 space-y-3">
                  {enhancements.map((item, i) => (
                    <div
                      key={i}
                      className="group flex gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-4 transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm"
                    >
                      {/* Number badge */}
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</p>
                        {item.detail && (
                          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: if parsing found nothing structured, show raw */}
            {!summary && enhancements.length === 0 && parsedRaw && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-7">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{parsedRaw}</pre>
              </div>
            )}

            {isPromptModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
                onClick={() => setIsPromptModalOpen(false)}
              >
                <div
                  className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4">
                    <h3 className="text-base font-semibold text-white">Prompt from Agent</h3>
                    <button
                      type="button"
                      onClick={() => setIsPromptModalOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                      aria-label="Close prompt modal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="max-h-[70vh] overflow-auto bg-slate-50 p-5">
                    {promptLoading ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                        Fetching prompt from agent...
                      </div>
                    ) : promptError ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        {promptError}
                      </div>
                    ) : agentPrompt ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                          {agentPrompt}
                        </pre>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                        Prompt not available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isBrdModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 pb-10 pt-8"
                onClick={() => setIsBrdModalOpen(false)}
              >
                {/* Modal shell — max-w-4xl gives A4-ish width */}
                <div
                  className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-300 bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* ── Title bar ── */}
                  <div className="flex items-center justify-between bg-gray-900 px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">📋</span>
                      <span className="text-sm font-semibold text-white">BRD Generator</span>
                      <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
                        Agent5i Powered
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadBrdDoc}
                        disabled={!brdDoc || isDownloadingBrd}
                        className="inline-flex h-8 items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {isDownloadingBrd ? "Preparing…" : "Download Word"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBrdModalOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition"
                        aria-label="Close BRD modal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Document body ── */}
                  <div className="max-h-[84vh] overflow-y-auto bg-gray-100 px-6 py-6">
                    {brdLoading ? (
                      /* Loading state */
                      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                        <p className="text-sm text-gray-500">Generating BRD document…</p>
                      </div>
                    ) : brdError ? (
                      /* Error state */
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                        {brdError}
                      </div>
                    ) : brdDoc ? (
                      /* ── Paper document ── */
                      <div className="mx-auto max-w-[760px] rounded-lg border border-gray-300 bg-white shadow-[0_6px_28px_rgba(0,0,0,0.10)]">

                        {/* Document cover */}
                        <div className="rounded-t-lg border-b border-gray-200 bg-gray-900 px-10 py-10 text-center">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                            Business Requirements Document
                          </p>
                          <h2 className="text-[22px] font-bold leading-snug text-white">
                            {brdMeta?.project_name || "Untitled Project"}
                          </h2>
                          {brdMeta && (
                            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-gray-400">
                              {brdMeta.version     && <span>v{brdMeta.version}</span>}
                              {brdMeta.date_submitted && <><span>·</span><span>{brdMeta.date_submitted}</span></>}
                              {brdMeta.status && (
                                <><span>·</span>
                                <span className="rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-emerald-400">
                                  {brdMeta.status}
                                </span></>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Meta strip */}
                        {brdMeta && (
                          <div className="border-b border-gray-200 bg-gray-50 px-10 py-5">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                              {[
                                { key: "project_name",    label: "📁 Project" },
                                { key: "project_manager", label: "👤 PM" },
                                { key: "date_submitted",  label: "📅 Date" },
                                { key: "version",         label: "🏷 Version" },
                                { key: "status",          label: "📌 Status" },
                                { key: "department",      label: "🏢 Dept" },
                              ].map((f) => (
                                <div key={f.key}>
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-gray-400">
                                    {f.label}
                                  </p>
                                  <input
                                    type="text"
                                    defaultValue={String(brdMeta[f.key] || "")}
                                    placeholder="[TBC]"
                                    className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section cards */}
                        <div className="divide-y divide-gray-100">
                          {brdActiveSections.length === 0 ? (
                            <p className="px-10 py-10 text-center text-sm text-gray-400">
                              No BRD sections found in the agent response.
                            </p>
                          ) : (
                            brdActiveSections.map((section) => {
                              const collapsed = Boolean(brdCollapsed[section.key]);
                              return (
                                <div key={section.key}>
                                  {/* Section header row — clickable to collapse */}
                                  <button
                                    type="button"
                                    onClick={() => toggleBrdSection(section.key)}
                                    className="flex w-full items-center gap-4 px-10 py-4 text-left transition-colors hover:bg-gray-50"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                                      {section.num}
                                    </span>
                                    <span className="flex-1 text-[14px] font-semibold text-gray-800">
                                      {section.title}
                                    </span>
                                    <span className="shrink-0 text-xs text-gray-400">
                                      {collapsed ? "▶" : "▼"}
                                    </span>
                                  </button>

                                  {/* Section body */}
                                  {!collapsed && (
                                    <div className="border-t border-gray-100 bg-white px-10 pb-7 pt-5">
                                      {renderBrdContent(brdDoc[section.key], section.type)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Raw JSON toggle */}
                        <div className="rounded-b-lg border-t border-gray-200 bg-gray-50 px-10 py-4">
                          <button
                            type="button"
                            onClick={() => setBrdShowRaw((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                          >
                            <span>{"{ }"}</span>
                            {brdShowRaw ? "Hide Raw JSON" : "View Raw JSON"}
                          </button>
                          {brdShowRaw && (
                            <pre className="mt-3 overflow-auto rounded-lg bg-gray-950 p-4 text-[11px] leading-5 text-gray-200">
                              {JSON.stringify(brdDoc, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400 shadow-sm">
                        No BRD data available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isPrdModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
                onClick={() => setIsPrdModalOpen(false)}
              >
                <div
                  className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4">
                    <h3 className="text-base font-semibold text-white">Generated PRD Document</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadPrdDoc}
                        disabled={!prdHtml || isDownloadingPrd}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        {isDownloadingPrd ? "Preparing..." : "Download Word"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPrdModalOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Close PRD modal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[76vh] overflow-auto bg-slate-50 p-5">
                    {prdLoading ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                        Generating PRD document from project data...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {prdError && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            {prdError}
                          </div>
                        )}

                        {prdHtml ? (
                          <div className="mx-auto max-w-[1100px] rounded-[18px] border border-[#dbe1ea] bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
                            <div
                              className="prose prose-slate max-w-none prose-h1:text-center prose-h1:border-b prose-h1:border-violet-600 prose-h1:pb-4 prose-h1:text-[30px] prose-h2:rounded-lg prose-h2:border-l-[6px] prose-h2:border-violet-600 prose-h2:bg-violet-50 prose-h2:px-4 prose-h2:py-3 prose-h2:text-violet-900 prose-table:border prose-table:border-gray-300 prose-th:bg-violet-700 prose-th:text-white prose-th:text-[12px] prose-th:uppercase prose-th:tracking-wide prose-td:align-top"
                              dangerouslySetInnerHTML={{ __html: prdHtml }}
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                            No PRD output available.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
