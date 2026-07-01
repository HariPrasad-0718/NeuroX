"use client";

import { useEffect, useState } from "react";

const STAGES = ["Empathize", "Define", "Ideate"];

export default function ProjectProgressBar({ projectId }) {
  const [completedStages, setCompletedStages] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/progress`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCompletedStages(res.data.completedStages || []);
      })
      .catch(() => {});
  }, [projectId]);

  const pct = Math.round((completedStages.length / STAGES.length) * 100);
  // current stage = first not-yet-completed
  const currentIndex = STAGES.findIndex((s) => !completedStages.includes(s));

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      {/* Label */}
      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap mr-6">
        Project Workflow
      </span>

      {/* Stepper */}
      <div className="flex-1 flex items-center">
        {STAGES.map((stage, i) => {
          const done = completedStages.includes(stage);
          const active = i === currentIndex;

          return (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                    done
                      ? "bg-[#702dff] border-[#702dff] text-white"
                      : active
                      ? "bg-white border-[#702dff] text-[#702dff]"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                    done || active ? "text-[#702dff]" : "text-gray-400"
                  }`}
                >
                  {stage}
                </span>
              </div>

              {/* Connector line (not after last) */}
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-px mx-1 mb-5 bg-gray-200">
                  <div
                    className="h-px bg-[#702dff] transition-all duration-500"
                    style={{ width: done ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Percentage */}
      <span className="ml-6 text-sm font-semibold text-[#702dff] whitespace-nowrap">
        {pct}% Complete
      </span>
    </div>
  );
}
