"use client";

import {  useEffect, useRef, useState  } from "react";
import { useParams, useRouter } from "next/navigation";

import FilesHeader from "./components/FilesHeader";
import FileSearch from "./components/FileSearch";
import FileUpload from "./components/FileUpload";
import FileCard from "./components/FileCard";
import EmptyState from "./components/EmptyState";
import DeleteDialog from "./components/DeleteDialog";

export default function ProjectFilesPage() {
  const router = useRouter();
  const params = useParams();

  const projectId = params.id;

  const uploadRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
  try {
    const response = await fetch(
      `/api/project-files?projectId=${projectId}`
    );

    const data = await response.json();

    if (data.success) {
      setFiles(data.files);
    } else {
      console.error(data.error?.message || "Failed to load files");
    }
  } catch (error) {
    console.error("Error loading files:", error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId]);

  // Upload Button Click
  const handleUploadClick = () => {
    uploadRef.current?.openFilePicker();
  };

  // Files selected from FileUpload component
 const handleFilesSelected = async (selectedFiles) => {
  try {
    for (const file of selectedFiles) {
      const formData = new FormData();

      formData.append("projectId", projectId);
      formData.append("file", file);

      const response = await fetch("/api/project-files", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || "Upload failed");
        return;
      }
    }

    await loadFiles();

    alert("File uploaded successfully.");
  } catch (error) {
    console.error(error);
    alert("Upload failed.");
  }
};

  // View
  const handleView = (file) => {
  window.open(
    `/api/project-files/view?fileId=${file.id}`,
    "_blank"
  );
};

  // Download
  const handleDownload = (file) => {
  window.open(
    `/api/project-files/download?fileId=${file.id}`,
    "_blank"
  );
};

  // Delete Button
  const handleDeleteClick = (file) => {
    setSelectedFile(file);
    setShowDeleteDialog(true);
  };

  // Confirm Delete
 const handleConfirmDelete = async () => {
  try {
    const response = await fetch(
      `/api/project-files?fileId=${selectedFile.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Failed to delete file");
      return;
    }

    // Remove from UI
    setFiles((prev) =>
      prev.filter((file) => file.id !== selectedFile.id)
    );

    setSelectedFile(null);
    setShowDeleteDialog(false);

  } catch (error) {
    console.error(error);
    alert("Something went wrong");
  }
};

  // Cancel Delete
  const handleCancelDelete = () => {
    setSelectedFile(null);
    setShowDeleteDialog(false);
  };

  // Search
  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  

  return (
   <div className="min-h-screen bg-gray-50 p-3 md:p-3">
    <div className="mx-auto max-w-7xl rounded-xl border border-gray-200 bg-white shadow-sm p-4 ">

        <FilesHeader
    fileCount={files.length}
    onBack={() => router.push(`/projects/${projectId}`)}
    onUpload={handleUploadClick}
/>

        <div className="p-2 ">

            <FileSearch
    searchTerm={searchTerm}
    setSearchTerm={setSearchTerm}
/>

            <FileUpload
                ref={uploadRef}
                onFilesSelected={handleFilesSelected}
            />

            {loading ? (
  <div className="flex justify-center items-center py-20">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
  </div>
) : filteredFiles.length === 0 ? (
                <EmptyState
                    onUpload={handleUploadClick}
                />
            ) : (
                filteredFiles.map((file) => (
                    <FileCard
                        key={file.id}
                        file={file}
                        onView={handleView}
                        onDownload={handleDownload}
                        onDelete={handleDeleteClick}
                    />
                ))
            )}

        </div>

        <DeleteDialog
            isOpen={showDeleteDialog}
            file={selectedFile}
            onCancel={handleCancelDelete}
            onConfirm={handleConfirmDelete}
        />

    </div>
</div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
    " " +
    sizes[i]
  );
}