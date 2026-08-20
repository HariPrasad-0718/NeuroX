"use client";

import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Presentation,
  Eye,
  Download,
  Trash2,
} from "lucide-react";

export default function FileCard({
  file,
  onView,
  onDownload,
  onDelete,
}) {
  const getFileIcon = (type) => {
    const fileType = type?.toLowerCase() || "";

    if (fileType.includes("pdf") || fileType.includes("word")) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }

    if (
      fileType.includes("excel") ||
      fileType.includes("sheet") ||
      fileType.includes("csv")
    ) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }

    if (
      fileType.includes("powerpoint") ||
      fileType.includes("presentation")
    ) {
      return <Presentation className="h-8 w-8 text-orange-500" />;
    }

    if (
      fileType.includes("png") ||
      fileType.includes("jpg") ||
      fileType.includes("jpeg") ||
      fileType.includes("image")
    ) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    }

    if (
      fileType.includes("zip") ||
      fileType.includes("rar")
    ) {
      return <FileArchive className="h-8 w-8 text-yellow-600" />;
    }

    return <FileText className="h-8 w-8 text-gray-500" />;
  };


  function formatFileSize(bytes) {
  if (!bytes) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
    " " +
    sizes[i]
  );
}


function getFileType(fileName) {
  return fileName.split(".").pop().toUpperCase();
}

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-[#702dff]/40 hover:shadow-md">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        {/* Left Side */}
        <div className="flex items-center gap-4">

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
            {getFileIcon(file.fileType)}
          </div>

          <div>

            <h3 className="text-base font-semibold text-gray-900">
              {file.fileName}
            </h3>

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">

              <span>
                <strong>Type:</strong> {getFileType(file.fileName)}
              </span>

              <span>
                <strong>Size:</strong> {formatFileSize(file.fileSize)}
              </span>

              <span>
                <strong>Uploaded By:</strong> {file.uploadedBy}
              </span>

              <span>
                <strong>Date:</strong> {new Date(file.uploadedAt).toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})}
              </span>

            </div>

          </div>

        </div>

        {/* Right Side */}

        <div className="flex flex-wrap gap-2">

          <button
            onClick={() => onView(file)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <Eye className="h-4 w-4" />
            View
          </button>

          <button
            onClick={() => onDownload(file)}
            className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
          >
            <Download className="h-4 w-4" />
            Download
          </button>

          <button
            onClick={() => onDelete(file)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

        </div>

      </div>

    </div>
  );
}