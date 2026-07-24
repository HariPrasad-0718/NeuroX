"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/zip",
  "text/plain",
];

const FileUpload = forwardRef(({ onFilesSelected }, ref) => {
  const fileInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    openFilePicker() {
      fileInputRef.current?.click();
    },
  }));

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (!selectedFiles.length) return;

    const validFiles = [];

    for (const file of selectedFiles) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(`${file.name} is not a supported file type.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds the 50 MB size limit.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    event.target.value = "";
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      hidden
      onChange={handleFileChange}
    />
  );
});

FileUpload.displayName = "FileUpload";

export default FileUpload;