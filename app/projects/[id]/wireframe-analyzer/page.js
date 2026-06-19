"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Plus,
  Search,
  FileImage,
  Clock,
  X,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useEffect } from "react";

export default function WireframeAnalyzerPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.id;

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pageName, setPageName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Mock history for now
 const [history, setHistory] = useState([]);
const [loadingHistory, setLoadingHistory] = useState(true);

// Prompt generation state
const [generatingPrompt, setGeneratingPrompt] = useState(false);
const [promptGenerationError, setPromptGenerationError] = useState("");
const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
const [agentPrompt, setAgentPrompt] = useState("");
const [promptProgress, setPromptProgress] = useState([]);
  // Search + view + upload loaders
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingPageId, setViewingPageId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    try {
      if (!pageName.trim()) {
        alert("Please enter page name");
        return;
      }

      if (!selectedFile) {
        alert("Please select an image");
        return;
      }

      setUploading(true);

      const formData = new FormData();

      formData.append("projectId", projectId);
      formData.append("pageName", pageName.trim());
      formData.append("image", selectedFile);

      const response = await fetch("/api/wireframe-pages", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      // set a flag so the result page can show its loader until analysis ready
      try {
        sessionStorage.setItem("wireframeResultLoading", "1");
      } catch (_) {}

      router.push(`/projects/${projectId}/wireframe-result?pageId=${data.pageId}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
  fetchHistory();
}, []);

const fetchHistory = async () => {
  try {
    const res = await fetch(
      `/api/wireframe-pages?projectId=${projectId}`
    );

    const data = await res.json();

    if (data?.success) {
      setHistory(data.pages || []);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingHistory(false);
  }
};

// Filtered list based on search
const filteredHistory = (history || []).filter((h) =>
  String(h.page_name || "").toLowerCase().includes(String(searchTerm || "").toLowerCase())
);

const handleViewAnalysis = (pageId) => {
  try {
    sessionStorage.setItem("wireframeResultLoading", "1");
  } catch (_) {}
  setViewingPageId(pageId);
  router.push(`/projects/${projectId}/wireframe-result?pageId=${pageId}`);
};

const handleGeneratePrompt = async () => {
  try {
    if (history.length === 0) {
      alert("Please upload at least one wireframe before generating a prompt");
      return;
    }

    setIsPromptModalOpen(true);
    setPromptProgress([]);
    setGeneratingPrompt(true);
    setPromptGenerationError("");
    setAgentPrompt("");

    // Run progress steps
    const PROMPT_STEPS = [
      "Finalizing the output",
      "Analyzing wireframe context",
      "Generating prompt structure",
      "Analyzing overall context"
    ];

    const progressInterval = setInterval(() => {
      setPromptProgress((prev) => {
        if (prev.length < PROMPT_STEPS.length) {
          return [
            ...prev,
            { label: PROMPT_STEPS[prev.length], done: prev.length > 0 }
          ];
        }
        clearInterval(progressInterval);
        return prev;
      });
    }, 1000);

    const response = await fetch("/api/generate-app-build-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: projectId,
        wireframePageId: history[0]?.page_id,
      }),
    });

    clearInterval(progressInterval);

    const data = await response.json();

    if (!data.success) {
      setPromptGenerationError(
        data.error?.message || "Failed to generate prompt"
      );
      setAgentPrompt("");
      setGeneratingPrompt(false);
      return;
    }

    const promptText = String(data.prompt || data.rawMessage || "").trim();
    setAgentPrompt(promptText);
    setGeneratingPrompt(false);
    setPromptProgress(prev => prev.map((step, idx) => ({ ...step, done: true })));
    
  } catch (error) {
    console.error(error);
    setPromptGenerationError(error.message || "Failed to generate prompt");
    setAgentPrompt("");
    setGeneratingPrompt(false);
  }
};

  return (
  <div className="min-h-screen bg-[#f5f7fa] px-3 py-3">
    <div className="min-h-[calc(100vh-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center gap-4">
            <button
  onClick={() =>
    router.push(`/projects/${projectId}`)
  }
>
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Wireframe Analyzer
              </h1>

              <p className="text-sm text-slate-500">
                Upload wireframes and manage previous analyses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Top Actions */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pages..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Upload Image
          </button>
        </div>

        {/* Empty State / Loading / List */}

        {loadingHistory ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-14 w-14">
              <div className="mx-auto h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
            <p className="text-sm text-slate-500">Loading previous analyses…</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <FileImage className="mx-auto mb-4 h-14 w-14 text-slate-400" />

            <h3 className="text-lg font-semibold text-slate-900">
              No Wireframes Uploaded Yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Upload your first wireframe image to begin analysis.
            </p>

            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700"
            >
              Upload First Wireframe
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Previous Analyses
              </h2>

              <p className="text-sm text-slate-500">
                View and manage all uploaded wireframes.
              </p>
            </div>

            <div className="grid gap-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.page_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <FileImage className="h-5 w-5 text-indigo-600" />

                        <h3 className="font-semibold text-slate-900">
                          {item.page_name}
                        </h3>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />

                        {item.created_at}
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewAnalysis(item.page_id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      {viewingPageId === item.page_id ? (
                        <div className="h-4 w-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                      ) : (
                        "View Analysis"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Prompt Generation Section */}
        {history.length > 0 && (
          <div className="mt-12 border-t border-slate-200 pt-8">
            {promptGenerationError && !isPromptModalOpen && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {promptGenerationError}
              </div>
            )}

            <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <Sparkles className="h-8 w-8 text-indigo-600" />

              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  Generate App Build Prompt
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Use your wireframe analysis to generate an app build prompt
                </p>
              </div>

              <button
                onClick={handleGeneratePrompt}
                disabled={generatingPrompt}
                className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPrompt ? (
                  <>
                    <RotateCcw className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Prompt
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Upload Wireframe
              </h2>

              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Page Name
                </label>

                <input
                  type="text"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="Example: Home Page"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Upload Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0])}
                  className="w-full rounded-xl border border-slate-300 p-3"
                />
              </div>

              {selectedFile && (
                <div className="rounded-xl bg-slate-100 p-3 text-sm">
                  {selectedFile.name}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!pageName || !selectedFile || uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Analyze Wireframe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {isPromptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h3 className="text-base font-semibold text-black">Generated App Build Prompt</h3>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-black transition hover:bg-white/20"
                aria-label="Close prompt modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-slate-50 p-5">
              {generatingPrompt ? (
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700">
                    Generating Prompt
                  </p>

                  <div className="space-y-3">
                    {promptProgress.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        {step.done ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
                        )}

                        <span className={step.done ? "text-green-700" : "text-slate-600"}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {promptProgress.length < 4 && (
                    <p className="text-xs text-slate-400">
                      AI is preparing prompt...
                    </p>
                  )}
                </div>
              ) : promptGenerationError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {promptGenerationError}
                </div>
              ) : agentPrompt ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {agentPrompt}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Prompt not available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}