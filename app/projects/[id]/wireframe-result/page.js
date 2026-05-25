"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Sparkles } from "lucide-react";

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

export default function WireframeResultPage() {
  const router = useRouter();
  const { id } = useParams();
  const [raw, setRaw] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("wireframeResult");
    if (stored) {
      setRaw(stored);
      sessionStorage.removeItem("wireframeResult");
    }
  }, []);

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
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">Section 1</p>
                    <h2 className="text-base font-bold text-white">Wireframe Summary</h2>
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

          </>
        )}
      </div>
    </div>
  );
}
