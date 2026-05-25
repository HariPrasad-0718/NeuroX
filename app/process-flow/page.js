"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UXJourneyFlow from "@/components/UXJourneyFlow";

export default function ProcessFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // PDF DOWNLOAD
  // -----------------------------
  const handleDownload = async () => {
    try {
      const element = document.getElementById(
        "process-flow-download"
      );

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
        const pdfHeight = 297;

        const imgWidth = pdfWidth;
        const imgHeight =
          (img.height * imgWidth) / img.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(
          dataUrl,
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;

          pdf.addPage();

          pdf.addImage(
            dataUrl,
            "PNG",
            0,
            position,
            imgWidth,
            imgHeight
          );

          heightLeft -= pdfHeight;
        }

        pdf.save("process-flow.pdf");
      };
    } catch (error) {
      console.error("PDF DOWNLOAD ERROR:", error);
    }
  };

  // -----------------------------
  // CONVERT PARAGRAPH TO FLOW
  // -----------------------------
  const convertTextToFlow = (text) => {
    if (!text || typeof text !== "string") {
      return null;
    }

    const sentences = text
  .replace(/\n/g, " ")
  .split(/[.!?]+\s+/)
  .filter(Boolean);

    const steps = [];

    sentences.forEach((sentence, index) => {
      const lower = sentence.toLowerCase();

      let type = "action";

      // ENTRY
      if (
        index === 0 ||
        lower.includes("begins") ||
        lower.includes("starts")
      ) {
        type = "entry";
      }

      // DECISION
      if (
        lower.includes("if ") ||
        lower.includes("whether") ||
        lower.includes("decision point") ||
        lower.includes("issues are detected")
      ) {
        type = "decision";
      }

      // LOOP
      if (
        lower.includes("loop") ||
        lower.includes("retry") ||
        lower.includes("reconciliation") ||
        lower.includes("validate consistency")
      ) {
        type = "loop";
      }

      // SUCCESS
      if (
        lower.includes("successful") ||
        lower.includes("concludes") ||
        lower.includes("complete") ||
        lower.includes("final report")
      ) {
        type = "exit_success";
      }

      // FAILURE
      if (
        lower.includes("fails") ||
        lower.includes("failure") ||
        lower.includes("unsuccessfully") ||
        lower.includes("error")
      ) {
        type = "exit_fail";
      }

      let label = sentence;

      // Short label
      if (label.length > 90) {
        label = label.substring(0, 90) + "...";
      }

      const step = {
        id: String(index + 1),
        type,
        label,
        description: sentence,
      };

      // Decision paths
      if (type === "decision") {
        step.paths = {
          yes: "Investigate / Continue",
          no: "Proceed Normally",
        };
      }

      steps.push(step);
    });

    return {
      title: "UX Journey Flow",
      persona: "Generated Persona",
      summary: text.substring(0, 220) + "...",
      steps,
    };
  };

  // -----------------------------
  // STEPS -> GRAPH (nodes + edges)
  // -----------------------------
  const stepsToGraph = (data) => {
    const steps = data?.steps || data?.process_flow?.steps;
    if (!steps?.length) return data;

    const nodes = steps.map((step) => ({
      id: step.id,
      label: step.label || step.description || `Step ${step.id}`,
      type:
        step.type === "entry" ? "start" :
        step.type === "exit_success" || step.type === "exit_fail" ? "end" :
        step.type === "decision" ? "decision" :
        "process",
    }));

    const edges = [];
    steps.forEach((step, i) => {
      if (i < steps.length - 1) {
        edges.push({ from: step.id, to: steps[i + 1].id, label: "" });
      }
      if (step.type === "loop" && i > 0) {
        edges.push({ from: step.id, to: steps[i - 1].id, label: "retry" });
      }
    });

    return { ...data, nodes, edges };
  };
  // -----------------------------
  // LOAD FLOW DATA
  // -----------------------------
  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem("processFlowData");

      if (!stored) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(stored);

      console.log("PROCESS FLOW DATA:", parsed);

      // CASE 1 → already structured
      if (
        parsed?.steps ||
        parsed?.nodes ||
        parsed?.process_flow?.steps ||
        parsed?.process_flow?.nodes
      ) {
        setFlowData(parsed.process_flow || parsed);
      }

      // CASE 2 → paragraph response
      else if (
        parsed?.process_flow &&
        typeof parsed.process_flow === "string"
      ) {
        const converted = convertTextToFlow(
          parsed.process_flow
        );

        setFlowData(converted);
      }

      // CASE 3 → nested string response
      else if (
        parsed?.final_response?.process_flow &&
        typeof parsed.final_response.process_flow ===
          "string"
      ) {
        const converted = convertTextToFlow(
          parsed.final_response.process_flow
        );

        setFlowData(converted);
      }

      // UPDATE PROJECT PROGRESS
      if (projectId) {
        fetch(
          `/api/projects/${projectId}/progress`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stage: "define",
              progress: 100,
            }),
          }
        )
          .then(() =>
            window.dispatchEvent(
              new Event("neurox:progress-updated")
            )
          )
          .catch(() => {});
      }
    } catch (error) {
      console.error(
        "PROCESS FLOW PARSE ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="mb-6 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition"
      >
        Back
      </button>

      {/* MAIN CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI Generated Process Flow
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          Generated from persona insights
        </p>

        {/* LOADING */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#702dff] rounded-full animate-spin"></div>

            <p className="mt-4 text-gray-500">
              Loading process flow...
            </p>
          </div>
        ) : !flowData ? (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">
              📄
            </div>

            <p className="text-gray-500 text-lg">
              No process flow available
            </p>
          </div>
        ) : (
          // FLOW CONTENT
          <div>
            <div
              id="process-flow-download"
              style={{
                background: "#ffffff",
                color: "#000000",
                padding: "20px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  color: "#000000",
                }}
              >
                <UXJourneyFlow flow={flowData} />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-8 flex justify-end gap-3 flex-wrap">
              <button
                onClick={() =>
                  router.push(
                    `/information-architecture?projectId=${projectId}`
                  )
                }
                className="px-5 py-2.5 rounded-xl font-semibold transition border border-[#702dff] text-[#702dff] hover:bg-[#702dff] hover:text-white"
              >
                Generate IA
              </button>

              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl text-white font-semibold transition"
                style={{
                  background:
                    "linear-gradient(135deg, #4a00e0, #702dff)",
                  boxShadow:
                    "0 4px 14px rgba(74,0,224,0.25)",
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