"use client";

import { Download, X, ChevronDown } from "lucide-react";
import { useState } from "react";

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
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!isPrdModalOpen) return null;

  const sections = [
    { id: "executive", label: "Executive Summary" },
    { id: "problem", label: "Business Problem" },
    { id: "objectives", label: "Objectives & Metrics" },
    { id: "personas", label: "Target Personas" },
    { id: "features", label: "Feature Overview" },
    { id: "stories", label: "User Stories" },
    { id: "requirements", label: "Functional Req." },
    { id: "api", label: "API Requirements" },
    { id: "security", label: "Security" },
    { id: "scope", label: "Scope & Constraints" },
    { id: "roadmap", label: "Release Roadmap" },
    { id: "risks", label: "Risks" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClosePrdModal}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-[#1a3a52] to-[#2d5a7b] px-6 py-5 text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Generated Document</p>
            <h3 className="mt-1 text-xl font-bold">Product Requirements Document</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRegeneratePrd}
              disabled={prdLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={onDownloadPrdDoc}
              disabled={!prdHtml || isDownloadingPrd}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isDownloadingPrd ? "Preparing..." : "Download"}
            </button>
            <button
              type="button"
              onClick={onClosePrdModal}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20"
              aria-label="Close PRD modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden bg-white">
          {/* Loading State */}
          {prdLoading ? (
            <div className="w-full flex items-center justify-center p-8">
              <div className="premium-loader relative overflow-hidden rounded-2xl border border-[#3730a3] bg-[#172554] px-6 py-8 text-white shadow-[0_24px_70px_rgba(49,46,129,0.3)] sm:px-10 max-w-3.5xl w-full">
                <div className="premium-loader-glow premium-loader-glow-one" />
                <div className="premium-loader-glow premium-loader-glow-two" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-300">NeuroX document engine</p>
                      <h4 className="mt-2 text-2xl font-semibold tracking-tight">Generating your PRD</h4>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Structuring comprehensive product requirements from your project context.</p>
                    </div>
                    <div className="premium-loader-orbit" aria-hidden="true">
                      <div className="premium-loader-core" />
                    </div>
                  </div>

                  <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="premium-loader-progress h-full rounded-full" />
                  </div>

                  {prdProgress.length < prdSteps.length && (
                    <p className="relative mt-4 text-xs text-slate-400">AI is structuring your document<span className="premium-loader-dots">...</span></p>
                  )}
                </div>
              </div>
            </div>
          ) : prdError ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 max-w-md w-full text-sm text-rose-700">
                <p className="font-semibold mb-2">Error Generating PRD</p>
                <p>{prdError}</p>
              </div>
            </div>
          ) : prdHtml ? (
            <div className="flex-1 overflow-y-auto bg-white p-8">
              <div className="prose-document max-w-4xl mx-auto">
                <div dangerouslySetInnerHTML={{ __html: prdHtml }} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No PRD data available.
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .premium-loader-glow {
          position: absolute;
          width: 400px;
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

        .premium-loader-progress {
          width: 42%;
          background: linear-gradient(90deg, #6366f1, #a5b4fc, #6366f1);
          background-size: 200% 100%;
          animation: premium-progress 2.2s ease-in-out infinite;
        }

        .premium-loader-dots {
          display: inline-block;
          width: 1.2rem;
          overflow: hidden;
          vertical-align: bottom;
          animation: premium-dots 1.4s steps(4, end) infinite;
        }

        @keyframes premium-orbit { to { transform: rotate(360deg); } }
        @keyframes premium-breathe { 0%, 100% { transform: scale(0.72); opacity: 0.55; } 50% { transform: scale(1); opacity: 1; } }
        @keyframes premium-progress { 0% { transform: translateX(-65%); background-position: 0% 50%; } 50% { transform: translateX(95%); background-position: 100% 50%; } 100% { transform: translateX(-65%); background-position: 0% 50%; } }
        @keyframes premium-dots { 0% { width: 0; } 25% { width: 0.4rem; } 50% { width: 0.8rem; } 75%, 100% { width: 1.2rem; } }

        /* Professional Document Styling */
        .prose-document {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #2d2d2d;
          line-height: 1.6;
        }

        .prose-document :global(h1) {
          font-family: "Merriweather", Georgia, serif;
          font-size: 2rem;
          font-weight: 700;
          color: #1a3a52;
          margin: 0 0 1.5rem;
          border-bottom: 2px solid #10b981;
          padding-bottom: 1rem;
          text-wrap: balance;
        }

        .prose-document :global(h2) {
          font-family: "Merriweather", Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a3a52;
          margin: 2rem 0 1rem;
          border-bottom: 2px solid #10b981;
          padding-bottom: 0.5rem;
          text-wrap: balance;
        }

        .prose-document :global(h3) {
          font-family: "Merriweather", Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a3a52;
          margin: 1.5rem 0 0.75rem;
        }

        .prose-document :global(h4) {
          font-family: "Merriweather", Georgia, serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a3a52;
          margin: 1.25rem 0 0.5rem;
        }

        .prose-document :global(p) {
          margin-bottom: 1rem;
          color: #616161;
          line-height: 1.7;
          max-width: 65ch;
        }

        .prose-document :global(ul),
        .prose-document :global(ol) {
          margin: 1rem 0 1.5rem 1.5rem;
        }

        .prose-document :global(li) {
          margin-bottom: 0.5rem;
          color: #616161;
        }

        .prose-document :global(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #e5e0d9;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
        }

        .prose-document :global(thead) {
          background-color: #f8f7f5;
        }

        .prose-document :global(th) {
          background-color: #f8f7f5;
          color: #1a3a52;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.75rem 1rem;
          text-align: left;
        }

        .prose-document :global(td) {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e0d9;
          color: #616161;
        }

        .prose-document :global(tr:hover) {
          background-color: #f8f7f5;
        }

        .prose-document :global(blockquote) {
          margin: 1rem 0;
          padding-left: 1rem;
          border-left: 3px solid #10b981;
          color: #616161;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
