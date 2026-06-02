"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, LayoutDashboard, Sparkles, X } from "lucide-react";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
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
    if (!isPromptModalOpen && !isBrdModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPromptModalOpen(false);
        setIsBrdModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPromptModalOpen, isBrdModalOpen]);

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

    if (brdData && !brdError) {
      return;
    }

    setBrdLoading(true);
    setBrdError("");

    try {
      const res = await fetch("/api/generate-brd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(id) }),
      });

      const data = await res.json();
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

  const renderBrdValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    if (typeof value === "string") {
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
            <p key={`${depth}-line-${idx}`} className="text-sm leading-6 text-slate-700">
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
        <ol className="space-y-3 pl-5 list-decimal marker:text-indigo-500">
          {value.map((item, idx) => (
            <li key={`${depth}-arr-${idx}`} className="text-sm text-slate-700">
              {item && typeof item === "object" ? renderBrdValue(item, depth + 1) : String(item)}
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
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map(([key, nested]) => (
            <div key={`${depth}-obj-${key}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formatKeyLabel(key)}
              </p>
              <div>{renderBrdValue(nested, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <p className="text-sm text-slate-700">{String(value)}</p>;
  };

  const normalizedBrd = (() => {
    if (!brdData) return null;
    if (typeof brdData === "object") return brdData;
    return toObjectIfPossible(brdData) || { raw_output: String(brdData) };
  })();

  const effectiveBrd = (() => {
    if (!normalizedBrd || typeof normalizedBrd !== "object") return normalizedBrd;

    const rawFromFallback = normalizedBrd.raw_brd_document;
    if (!rawFromFallback) return normalizedBrd;

    const parsed = parseLooseJson(rawFromFallback);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return {
      ...normalizedBrd,
      full_brd_document: normalizeLooseText(rawFromFallback),
    };
  })();

  const brdMeta =
    effectiveBrd && effectiveBrd.document_meta && typeof effectiveBrd.document_meta === "object"
      ? effectiveBrd.document_meta
      : null;

  const brdSections = effectiveBrd
    ? Object.entries(effectiveBrd).filter(([key]) => key !== "document_meta")
    : [];

  const handleDownloadBrdDoc = async () => {
    if (!effectiveBrd || isDownloadingBrd) return;

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

      brdSections.forEach(([key, value]) => {
        paragraphs.push(
          new Paragraph({
            text: formatKeyLabel(key),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 140 },
          })
        );
        appendWordValue(paragraphs, value, 0);
      });

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);

      const safeName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

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
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
                onClick={() => setIsBrdModalOpen(false)}
              >
                <div
                  className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4">
                    <h3 className="text-base font-semibold text-white">Generated BRD Document</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadBrdDoc}
                        disabled={!effectiveBrd || isDownloadingBrd}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        {isDownloadingBrd ? "Preparing..." : "Download Word"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBrdModalOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Close BRD modal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[70vh] overflow-auto bg-slate-50 p-5">
                    {brdLoading ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                        Generating BRD document from project data...
                      </div>
                    ) : brdError ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        {brdError}
                      </div>
                    ) : effectiveBrd ? (
                      <div className="space-y-5">
                        {normalizedBrd?.note && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {normalizedBrd.note}
                          </div>
                        )}
                        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-cyan-50 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Business Requirements Document</p>
                          <h4 className="mt-2 text-lg font-bold text-slate-900">
                            {String(brdMeta?.project_name || "Project BRD")}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            Structured output generated from project data, personas, interviews, insights, IA, and process flow.
                          </p>
                        </div>

                        {brdMeta && (
                          <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h5 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-600">Document Meta</h5>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {Object.entries(brdMeta).map(([key, value]) => (
                                <div key={`meta-${key}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {formatKeyLabel(key)}
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-800">
                                    {String(value ?? "-")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {brdSections.map(([key, value]) => (
                          <section key={`section-${key}`} className="rounded-xl border border-slate-200 bg-white p-5">
                            <h5 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-600">
                              {formatKeyLabel(key)}
                            </h5>
                            <div>{renderBrdValue(value, 0)}</div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                        BRD data not available.
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
