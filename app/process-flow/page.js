"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UXJourneyFlow from "@/components/UXJourneyFlow";

export default function ProcessFlowPage() {
  const router = useRouter();

  const [flowData, setFlowData] = useState(null);

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
          <UXJourneyFlow flow={flowData} />
        )}
      </div>
    </div>
  );
}