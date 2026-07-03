"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Download } from "lucide-react";

import { generateResearchSummary } from "@/services/researchSummaryApi";
import ResearchSummaryViewer from "./ResearchSummaryViewer";
import DownloadResearchSummaryButton from "./DownloadResearchSummaryButton";

export default function ResearchSummaryModal({
  open,
  projectId,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    loadResearchSummary();
  }, [open]);

  async function loadResearchSummary() {
    try {
      setLoading(true);
      setError("");
      setReport("");

      const result = await generateResearchSummary(projectId);
      console.log(result);
      console.log(result.report);
      setReport(result.report || "");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate Research Summary.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}

        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
              Generated Report
            </p>

            <h2 className="text-lg font-semibold text-gray-900">
              User Research Summary
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              AI generated stakeholder-ready research document
            </p>
          </div>

          <div className="flex items-center gap-2">

            {!loading && report && (
              <DownloadResearchSummaryButton
                report={report}
              />
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        </div>

        {/* Body */}

        <div className="max-h-[84vh] overflow-y-auto bg-[#e8ebf0] px-6 py-6">
                    {loading ? (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">
                Generating User Research Summary
              </p>

              <div className="space-y-3">

                <div className="flex items-center gap-3 text-sm">
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div className="absolute h-5 w-5 animate-ping rounded-full bg-indigo-200 opacity-50" />
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>

                  <span className="text-slate-600">
                    Reading project data...
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div className="absolute h-5 w-5 animate-ping rounded-full bg-indigo-200 opacity-50" />
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>

                  <span className="text-slate-600">
                    Analyzing research findings...
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div className="absolute h-5 w-5 animate-ping rounded-full bg-indigo-200 opacity-50" />
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>

                  <span className="text-slate-600">
                    Structuring stakeholder report...
                  </span>
                </div>

              </div>

              <p className="text-xs text-slate-400">
                AI is preparing your research summary...
              </p>
            </div>

          ) : error ? (

            <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>

          ) : report ? (

            <ResearchSummaryViewer
              report={report}
            />

          ) : (

            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
              No Research Summary available.
            </div>

          )}
        </div>
                {/* Footer */}
        {!loading && report && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-2">

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Close
            </button>

          </div>
        )}

      </div>
    </div>
  );
}