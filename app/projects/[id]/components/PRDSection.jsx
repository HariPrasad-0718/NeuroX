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
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-100/70 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-indigo-100/70 blur-3xl" />

              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Preparing Document</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Building Professional PRD View</h4>
                <p className="mt-1 text-sm text-slate-600">Parsing sections, formatting tables, and preparing a clean stakeholder-ready layout.</p>

                <div className="mt-6 space-y-3">
                  {prdProgress.map((step, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm backdrop-blur-sm">
                      {step.done ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-700">✓</span>
                      ) : (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      )}

                      <span className={step.done ? "text-emerald-700" : "text-slate-700"}>{step.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100 sm:col-span-2" />
                </div>

                {prdProgress.length < prdSteps.length && (
                  <p className="mt-4 text-xs text-slate-500">AI is structuring your product document...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {prdError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{prdError}</div>
              )}

              {prdHtml ? (
                <article className="formal-doc mx-auto max-w-[960px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                  <header className="doc-cover border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 px-8 py-10 sm:px-12 sm:py-12">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Product Document</p>
                    <h2 className="text-[34px] font-bold leading-tight text-slate-900">Product Requirements Document</h2>
                    <p className="mt-3 text-[16px] text-slate-700">Structured output optimized for stakeholder review and publication.</p>
                  </header>
                  <div className="doc-html px-8 py-10 sm:px-12">
                    <div dangerouslySetInnerHTML={{ __html: prdHtml }} />
                  </div>
                </article>
              ) : !prdError ? (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-100/70 blur-3xl" />
                  <div className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-indigo-100/70 blur-3xl" />
                  <div className="relative">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Preparing Document</p>
                    <h4 className="mt-2 text-xl font-semibold text-slate-900">Loading PRD Content</h4>
                    <p className="mt-1 text-sm text-slate-600">Fetching and formatting your latest product requirements document.</p>
                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                      <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                      <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100 sm:col-span-2" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load PRD output.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .doc-html :global(h1) {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 0.9rem;
        }

        .doc-html :global(h2) {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 1.5rem 0 0.65rem;
          padding-bottom: 0.45rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .doc-html :global(h3) {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 1.1rem 0 0.5rem;
        }

        .doc-html :global(p),
        .doc-html :global(li) {
          font-size: 0.95rem;
          line-height: 1.75;
          color: #334155;
        }

        .doc-html :global(blockquote) {
          margin: 1rem 0;
          padding: 0.85rem 1rem;
          border-left: 4px solid #0f766e;
          background: #f0fdfa;
          color: #134e4a;
          border-radius: 0.5rem;
          font-style: italic;
        }

        .doc-html :global(h4) {
          font-size: 0.95rem;
          font-weight: 700;
          color: #475569;
          margin: 0.95rem 0 0.4rem;
        }

        .doc-html :global(ul),
        .doc-html :global(ol) {
          margin: 0.5rem 0 0.9rem 1.25rem;
        }

        .doc-html :global(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .doc-html :global(th) {
          background: #0f172a;
          color: #f8fafc;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          padding: 0.6rem 0.7rem;
          text-align: left;
        }

        .doc-html :global(td) {
          border-top: 1px solid #e2e8f0;
          padding: 0.65rem 0.7rem;
          font-size: 0.86rem;
          color: #334155;
          vertical-align: top;
        }

        .doc-html :global(tr:nth-child(even) td) {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
