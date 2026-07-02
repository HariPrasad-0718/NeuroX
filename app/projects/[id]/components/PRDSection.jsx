"use client";

import { Download, X } from "lucide-react";

export default function PRDSection({
  isPrdModalOpen,
  onClosePrdModal,
  prdLoading,
  prdError,
  prdProgress,
  prdSteps,
  prdHtml,
  isDownloadingPrd,
  onDownloadPrdDoc,
  onRegeneratePrd,
}) {
  if (!isPrdModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8"
      onClick={onClosePrdModal}
    >
      <div
        className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Generated Document</p>
            <h3 className="text-base font-semibold text-gray-900">Product Requirements Document</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRegeneratePrd}
              disabled={prdLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={onDownloadPrdDoc}
              disabled={!prdHtml || isDownloadingPrd}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isDownloadingPrd ? "Preparing..." : "Download Word"}
            </button>
            <button
              type="button"
              onClick={onClosePrdModal}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
              aria-label="Close PRD modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[84vh] overflow-auto bg-[#e8ebf0] p-5">
          {prdLoading ? (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">Generating PRD Document</p>

              <div className="space-y-3">
                {prdProgress.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    {step.done ? (
                      <span className="font-bold text-green-600">✓</span>
                    ) : (
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
                    )}

                    <span className={step.done ? "text-green-700" : "text-slate-600"}>{step.label}</span>
                  </div>
                ))}
              </div>

              {prdProgress.length < prdSteps.length && (
                <p className="text-xs text-slate-400">AI is structuring your product document...</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {prdError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{prdError}</div>
              )}

              {prdHtml ? (
                <article className="formal-doc mx-auto max-w-[920px] overflow-hidden border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                  <header className="doc-cover border-b border-slate-200 px-12 py-12">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Product Document</p>
                    <h2 className="text-[34px] font-bold leading-tight text-slate-900">Product Requirements Document</h2>
                    <p className="mt-3 text-[16px] text-slate-700">Structured output optimized for stakeholder review and publication.</p>
                  </header>
                  <div className="doc-html px-12 py-10">
                    <div dangerouslySetInnerHTML={{ __html: prdHtml }} />
                  </div>
                </article>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No PRD output available.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
