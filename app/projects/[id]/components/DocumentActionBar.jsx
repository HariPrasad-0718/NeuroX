"use client";

export default function DocumentActionBar({
  canGenerateDocuments,
  isOpeningPrd,
  onGenerateBrd,
  onGeneratePrd,
  onResearchSummary,
}) {
  return (
   <div className="fixed bottom-0 left-[240px] right-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur">
  <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-2 md:flex-row md:items-center md:justify-between md:px-8">

    <div className="max-w-2xl">
      <p className="text-sm text-gray-600">
        Complete the Information Architecture to enable BRD and PRD generation.
      </p>
    </div>

    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">

      <button
        type="button"
        onClick={onResearchSummary}
        className="flex h-8 min-w-[100px] items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
      >
        Research Summary
      </button>

      <button
        onClick={onGenerateBrd}
        disabled={!canGenerateDocuments}
       className="flex h-8 min-w-[100px] items-center justify-center rounded-md bg-indigo-600 px-3 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Generate BRD
      </button>

      <button
        onClick={onGeneratePrd}
        disabled={!canGenerateDocuments || isOpeningPrd}
        className="flex h-8 min-w-[100px] items-center justify-center rounded-md bg-indigo-600 px-3 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isOpeningPrd ? "Opening PRD..." : "Generate PRD"}
      </button>

    </div>
  </div>
</div>
  );
}
