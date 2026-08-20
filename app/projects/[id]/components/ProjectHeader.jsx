"use client";

import { ArrowLeft } from "lucide-react";

export default function ProjectHeader({
  project,
  showFullDesc,
  setShowFullDesc,
  onBack,
  onOpenFiles,
}) {
  return (
    <div className="border-b border-gray-200 px-6 py-6 md:px-8 md:py-8">
      <div className="flex items-start gap-6">
        <button
          onClick={onBack}
          className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">{project.projectName}</h1>
          <p
            className={`max-w-3xl cursor-pointer text-sm leading-relaxed text-gray-600 ${
              showFullDesc ? "" : "line-clamp-2"
            }`}
            onClick={() => setShowFullDesc(!showFullDesc)}
          >
            {project.projectDescription || "No description"}
            {!showFullDesc && "..."}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Client:</span>
              <span className="text-sm font-medium text-gray-900">{project.client || "N/A"}</span>
            </div>
            <div className="hidden h-4 w-px bg-gray-300 sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Target Date:</span>
              <span className="text-sm font-medium text-gray-900">
                {project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
    onClick={onOpenFiles}
    className="rounded-lg bg-[#702dff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#5f24dc]"
>
    Files
</button>
        </div>
      </div>
    </div>
  );
}
