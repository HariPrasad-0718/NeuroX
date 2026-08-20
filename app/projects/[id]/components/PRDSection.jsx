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
            <div className="premium-loader relative overflow-hidden rounded-2xl border border-[#3730a3] bg-[#172554] px-6 py-8 text-white shadow-[0_24px_70px_rgba(49,46,129,0.3)] sm:px-10">
              <div className="premium-loader-glow premium-loader-glow-one" />
              <div className="premium-loader-glow premium-loader-glow-two" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-300">NeuroX document engine</p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-tight">Generating your PRD</h4>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Turning system flow and product context into a clear, publication-ready document.</p>
                  </div>
                  <div className="premium-loader-orbit" aria-hidden="true"><div className="premium-loader-core" /></div>
                </div>

                <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="premium-loader-progress h-full rounded-full" />
                </div>

                {prdProgress.length < prdSteps.length && (
                  <p className="mt-4 text-xs text-slate-400">AI is structuring your product document<span className="premium-loader-dots">...</span></p>
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
        .premium-loader-glow {
          position: absolute;
          width: 16rem;
          height: 16rem;
          border-radius: 999px;
          filter: blur(54px);
          opacity: 0.3;
          pointer-events: none;
        }

        .premium-loader-glow-one { top: -9rem; right: -4rem; background: #818cf8; }
        .premium-loader-glow-two { bottom: -10rem; left: -5rem; background: #6366f1; }
        .premium-loader-orbit {
          display: flex;
          width: 3.5rem;
          height: 3.5rem;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(165, 180, 252, 0.45);
          border-radius: 999px;
          animation: premium-orbit 3s linear infinite;
        }
        .premium-loader-core {
          width: 1.1rem;
          height: 1.1rem;
          border-radius: 999px;
          background: #a5b4fc;
          box-shadow: 0 0 24px #6366f1;
          animation: premium-breathe 1.8s ease-in-out infinite;
        }
        .premium-loader-progress { width: 42%; background: linear-gradient(90deg, #6366f1, #a5b4fc, #6366f1); background-size: 200% 100%; animation: premium-progress 2.2s ease-in-out infinite; }
        .premium-loader-dots { display: inline-block; width: 1.2rem; overflow: hidden; vertical-align: bottom; animation: premium-dots 1.4s steps(4, end) infinite; }
        @keyframes premium-orbit { to { transform: rotate(360deg); } }
        @keyframes premium-breathe { 0%, 100% { transform: scale(0.72); opacity: 0.55; } 50% { transform: scale(1); opacity: 1; } }
        @keyframes premium-progress { 0% { transform: translateX(-65%); background-position: 0% 50%; } 50% { transform: translateX(95%); background-position: 100% 50%; } 100% { transform: translateX(-65%); background-position: 0% 50%; } }
        @keyframes premium-dots { 0% { width: 0; } 25% { width: 0.4rem; } 50% { width: 0.8rem; } 75%, 100% { width: 1.2rem; } }

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
