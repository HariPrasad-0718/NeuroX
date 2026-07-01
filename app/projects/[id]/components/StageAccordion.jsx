"use client";

import { ChevronDown } from "lucide-react";

export default function StageAccordion({
  stage,
  isExpanded,
  isCompleted,
  onToggle,
  onMarkComplete,
  renderContent,
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white transition-all duration-200 hover:shadow-sm ${
        isCompleted
          ? "border-emerald-300 shadow-emerald-50 ring-1 ring-emerald-100"
          : "border-gray-200"
      }`}
    >
      <div className="cursor-pointer p-6" onClick={onToggle}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </div>

            <div className="flex-1">
              <div className="mb-1 flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>

                <span
                  className={`rounded px-2 py-1 text-xs ${
                    isCompleted
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isCompleted ? "Completed" : "Not Started"}
                </span>
              </div>

              <p className="text-sm text-gray-600">{stage.description}</p>
            </div>
          </div>

          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
            ) : (
              <button
                onClick={() => onMarkComplete(stage.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 px-6 pb-6 pt-6">
          {renderContent(stage, isCompleted)}
        </div>
      )}
    </div>
  );
}
