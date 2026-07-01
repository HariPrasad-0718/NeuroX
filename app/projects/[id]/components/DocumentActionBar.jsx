"use client";

export default function DocumentActionBar({
  canGenerateDocuments,
  isOpeningPrd,
  onGenerateBrd,
  onGeneratePrd,
}) {
  return (
    <div className="fixed bottom-0 left-[240px] right-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-12px_35px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="max-w-2xl">
          <p className="mt-1 text-sm text-gray-600">
            Complete the Information Architecture to enable BRD and PRD generation.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={onGenerateBrd}
            disabled={!canGenerateDocuments}
            className="flex min-w-[140px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 disabled:hover:shadow-none"
          >
            Generate BRD
          </button>

          <button
            onClick={onGeneratePrd}
            disabled={!canGenerateDocuments || isOpeningPrd}
            className="flex min-w-[140px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 disabled:hover:shadow-none"
          >
            {isOpeningPrd ? "Opening PRD..." : "Generate PRD"}
          </button>
        </div>
      </div>
    </div>
  );
}
