import { Suspense } from "react";
import ProcessFlowPageClient from "./ProcessFlowPageClient";

function ProcessFlowFallback() {
  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#702dff] rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">Loading process flow...</p>
        </div>
      </div>
    </div>
  );
}

export default function ProcessFlowPage() {
  return (
    <Suspense fallback={<ProcessFlowFallback />}>
      <ProcessFlowPageClient />
    </Suspense>
  );
}
