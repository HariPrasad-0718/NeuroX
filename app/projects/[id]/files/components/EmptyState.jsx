"use client";

import { FolderOpen } from "lucide-react";

export default function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-8 py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#702dff]/10">
        <FolderOpen className="h-10 w-10 text-[#702dff]" />
      </div>

      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        No files uploaded yet
      </h2>

      <p className="mb-6 max-w-md text-sm leading-6 text-gray-500">
        Upload documents related to this project such as BRDs, PRDs,
        wireframes, presentations, spreadsheets, images, or any other
        supporting files.
      </p>

      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-lg bg-[#702dff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#5d25db]"
      >
        Upload Your First File
      </button>
    </div>
  );
}