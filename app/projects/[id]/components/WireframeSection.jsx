"use client";

import { useRef, useState } from "react";
import { Loader2, FileText } from "lucide-react";

export default function WireframeSection({
  projectId,
  router,
  media,
}) {
  const [image, setImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [wireframeError, setWireframeError] = useState("");
  const inputRef = useRef(null);

  const normalizeWireframeError = (value) => {
    const text = String(value || "").trim();
    if (!text) return "Analysis failed. Please try again.";
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return "Wireframe service returned an unexpected error page. Please try again.";
    }
    return text;
  };

  const handleFile = async (file) => {
    if (!file || isGenerating) return;

    setWireframeError("");
    setIsGenerating(true);
    setImage({ name: file.name, url: URL.createObjectURL(file) });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze-wireframe", { method: "POST", body: formData });
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(normalizeWireframeError(text));
      }

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(normalizeWireframeError(data?.error));
      }

      sessionStorage.setItem("wireframeResult", data.result);
      if (data._fallback) {
        sessionStorage.setItem("wireframeResultFallback", "1");
      } else {
        sessionStorage.removeItem("wireframeResultFallback");
      }
      router.push(`/projects/${projectId}/wireframe-result`);
    } catch (error) {
      console.warn("[WireframeReviewer]", error?.message || error);
      setWireframeError(normalizeWireframeError(error?.message));
      setIsGenerating(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleRemove = () => {
    setImage(null);
    setWireframeError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100">
      {isGenerating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/85 px-4 py-4 backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing wireframe...
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Design Review</p>
          <h3 className="text-base font-semibold text-gray-900">Wireframe Reviewer</h3>
        </div>
      </div>

      <p className="px-5 text-sm text-gray-600">Upload a wireframe image for AI-powered review and analysis.</p>

      <div className="mt-3 px-5">
        {wireframeError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-700">{wireframeError}</p>
          </div>
        )}

        {!wireframeError && image && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="truncate text-xs text-green-700">{image.name}</span>

            {!isGenerating && (
              <button onClick={handleRemove} className="text-xs text-red-500 hover:text-red-700">
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto p-5">
        <button
          onClick={() => router.push(`/projects/${projectId}/wireframe-analyzer`)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
