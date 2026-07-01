"use client";

import { useEffect, useState } from "react";
import { generateProcessFlow } from "@/services/processFlowService";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, RotateCcw } from "lucide-react";
import UXJourneyFlow from "@/components/UXJourneyFlow";

export default function ProcessFlowPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await generateProcessFlow({ projectId });
        if (data.success) {
          setFlowData(data.process_flow);
          fetch(`/api/projects/${projectId}/progress`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: "define", progress: 100 }),
          })
            .then(() => window.dispatchEvent(new Event("neurox:progress-updated")))
            .catch(() => {});
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

  const handleRegenerate = async () => {
    if (!projectId) return;
    setRegenerating(true);
    setError("");
    try {
      const { data } = await generateProcessFlow({ projectId, regenerate: true });
      if (data.success) setFlowData(data.process_flow);
      else setError(data.error || "Regeneration failed");
    } catch (err) {
      setError(err.message || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const element = document.getElementById("process-flow-download");
      if (!element) return;
      const { toPng } = await import("html-to-image");
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
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

  return (
    <div className="min-h-screen bg-[#f8fafc] px-3 py-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
       <div className="flex items-center gap-4 mb-6">
  <button
    onClick={() => router.back()}
    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition"
    aria-label="Go back"
  >
    <ChevronLeft className="w-5 h-5" />
  </button>

  <div>
    <h1 className="text-2xl font-bold text-gray-900">
      AI Generated Process Flow
    </h1>

    <p className="text-sm text-gray-600">
      Generated from persona insights
    </p>
  </div>
</div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#702dff] rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">Loading process flow...</p>
          </div>
        ) : !flowData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-gray-500 text-lg">{error || "No process flow available"}</p>
          </div>
        ) : (
          <div>
            <div
              id="process-flow-download"
              style={{ background: "#ffffff", color: "#000000", padding: "20px" }}
            >
              <UXJourneyFlow flow={flowData} />
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
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
                style={{
                  background: "linear-gradient(135deg, #4a00e0, #702dff)",
                  boxShadow: "0 4px 14px rgba(74,0,224,0.25)",
                }}
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
