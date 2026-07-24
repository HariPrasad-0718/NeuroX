"use client";

import { ArrowLeft, Upload } from "lucide-react";

export default function FilesHeader({
  fileCount = 0,
  onBack,
  onUpload,
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Project Files
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {fileCount} {fileCount === 1 ? "file" : "files"} uploaded
          </p>
        </div>
      </div>

      {/* Right Section */}
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-lg bg-[#702dff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#5d25db]"
      >
        <Upload className="h-4 w-4" />
        Upload File
      </button>
    </div>
  );
}