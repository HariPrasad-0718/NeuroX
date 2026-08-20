"use client";

export default function DocumentActionBar({
  canGenerateDocuments,
  isOpeningPrd,
  hasBrdDocument,
  hasPrdDocument,
  onGenerateBrd,
  onGeneratePrd,
  onResearchSummary,
}) {
  return (
   <div className="fixed bottom-0 left-[240px] right-0 z-40 border-t border-slate-200 bg-[linear-gradient(120deg,#f8fafc_0%,#ffffff_45%,#f0fdf4_100%)] shadow-[0_-10px_24px_rgba(15,23,42,0.10)] backdrop-blur">
  <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-2 md:flex-row md:items-center md:justify-between md:px-8">

    <div className="max-w-2xl">
      <p className="text-sm text-slate-600">
        {canGenerateDocuments
          ? "Open your latest BRD and PRD, or regenerate them from updated context."
          : "Complete the Information Architecture to enable BRD and PRD generation."}
      </p>
    </div>

    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">

      <button
        type="button"
        onClick={onResearchSummary}
        className="flex h-8 min-w-[120px] items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        Research Summary
      </button>

      <button
        onClick={onGenerateBrd}
        disabled={!canGenerateDocuments}
       className="flex h-8 min-w-[110px] items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {hasBrdDocument ? "View BRD" : "Generate BRD"}
      </button>

      <button
        onClick={onGeneratePrd}
        disabled={!canGenerateDocuments || isOpeningPrd}
        className="flex h-8 min-w-[110px] items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isOpeningPrd ? "Opening PRD..." : hasPrdDocument ? "View PRD" : "Generate PRD"}
      </button>

    </div>
  </div>
</div>
  );
}
