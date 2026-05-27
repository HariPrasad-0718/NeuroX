"use client";

import { useSearchParams } from "next/navigation";

export default function WireframeResultPage() {
  const searchParams = useSearchParams();

  const result =
    searchParams.get("result");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto rounded-2xl border bg-white shadow p-8">
        <h1 className="text-2xl font-bold">
          Wireframe Analysis
        </h1>

        <div className="mt-6 rounded-xl border bg-gray-50 p-5">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {result}
          </pre>
        </div>
      </div>
    </div>
  );
}