"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UXJourneyFlow from "@/components/UXJourneyFlow";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function ProcessFlowPage() {
  const router = useRouter();

  const [flowData, setFlowData] = useState(null);

 const handleDownload = async () => {
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
    const pdfHeight = 297;

    const imgWidth = pdfWidth;
    const imgHeight = (img.height * imgWidth) / img.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight);

    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;

      pdf.addPage();

      pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight);

      heightLeft -= pdfHeight;
    }

    pdf.save("process-flow.pdf");
  };
};


  useEffect(() => {
    const stored = sessionStorage.getItem("processFlowData");

    if (stored) {
      setFlowData(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <button
        onClick={() => router.back()}
        className="mb-6 px-4 py-2 rounded-lg border border-gray-300 bg-white"
      >
        Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI Generated Process Flow
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          Generated from persona insights
        </p>

        {!flowData ? (
  <p className="text-gray-500">No process flow available</p>
) : (
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

    <div className="mt-6 flex justify-end">
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