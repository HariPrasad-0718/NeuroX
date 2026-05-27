"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import UXJourneyFlow from "@/components/UXJourneyFlow";

export default function ProcessFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  // -----------------------------
  // LOAD FROM DB ON MOUNT
  // -----------------------------
  useEffect(() => {
    if (!projectId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/generate-process-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        if (data.success) {
          setFlowData(data.process_flow);
          fetch(`/api/projects/${projectId}/progress`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: "define", progress: 100 }),
          }).then(() => window.dispatchEvent(new Event("neurox:progress-updated"))).catch(() => {});
        } else {
          setError(data.error || "Failed to load process flow");
        }
      } catch (err) {
        setError(err.message || "Failed to load process flow");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId]);

  // -----------------------------
  // REGENERATE
  // -----------------------------
  const handleRegenerate = async () => {
    if (!projectId) return;
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-process-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, regenerate: true }),
      });
      const data = await res.json();
      if (data.success) setFlowData(data.process_flow);
      else setError(data.error || "Regeneration failed");
    } catch (err) {
      setError(err.message || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  // -----------------------------
  // PDF DOWNLOAD
  // -----------------------------
  const handleDownload = async () => {
    try {
      const element = document.getElementById("process-flow-download");
      if (!element) return;
      const { toPng } = await import("html-to-image");
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const dataUrl = await toPng(element, { cacheBust: true, backgroundColor: "#ffffff", pixelRatio: 2 });
      const pdf = new jsPDF("p", "mm", "a4");
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdfWidth = 210;
        const imgHeight = (img.height * pdfWidth) / img.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= 297;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= 297;
        }
        pdf.save("process-flow.pdf");
      };
    } catch (err) {
      console.error("PDF DOWNLOAD ERROR:", err);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <button
        onClick={() => router.back()}
        className="mb-6 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition"
      >
        Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Generated Process Flow</h1>
        <p className="text-sm text-gray-600 mb-6">Generated from persona insights</p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#702dff] rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">Loading process flow...</p>
          </div>
        ) : !flowData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-6xl">📄</div>
            <p className="text-gray-500 text-lg">{error || "No process flow available"}</p>
          </div>
        ) : (
          <div>
            <div id="process-flow-download" style={{ background: "#ffffff", color: "#000000", padding: "20px" }}>
              <UXJourneyFlow flow={flowData} />
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="mt-8 flex justify-end gap-3 flex-wrap">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <RotateCcw className="w-4 h-4" />
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>

              <button
                onClick={() => router.push(`/information-architecture?projectId=${projectId}`)}
                className="px-5 py-2.5 rounded-xl font-semibold transition border border-[#702dff] text-[#702dff] hover:bg-[#702dff] hover:text-white"
              >
                Generate IA
              </button>

              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl text-white font-semibold transition"
                style={{ background: "linear-gradient(135deg, #4a00e0, #702dff)", boxShadow: "0 4px 14px rgba(74,0,224,0.25)" }}
              >
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
