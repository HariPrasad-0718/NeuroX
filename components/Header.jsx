"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  User,
} from "lucide-react";

export default function Header({
  userName,
  userPersona,
  onCreateProject,
  onOpenProfile,
  projectProgressData,
}) {
  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const router = useRouter();
  const pathname = usePathname();

  /*
    SHOW PROGRESS BAR
    -----------------
    Any route inside a project should show workflow progress.

    Example:
    /dashboard/projects/12
    /dashboard/projects/12/empathy-map
    /dashboard/projects/12/define
    /dashboard/projects/12/ideation

    Dashboard page alone should show:
    - Search bar
    - Create project button
  */

  const isDashboardPage =
    pathname === "/dashboard";

  const isProjectPage =
    pathname.includes("/projects/") ||
    pathname.includes("/view-persona") ||
    pathname.includes("/process-flow") ||
    pathname.includes("/information-architecture");

  // WORKFLOW STAGES
  const stages = [
    "Empathize",
    "Define",
    "Ideate",
  ];

  // BACKEND VALUES
  const completedStages =
    projectProgressData?.completedStages || [];

  const rawProgress = projectProgressData?.progress || 0;
  const pct = Math.min(100, Math.round((rawProgress / 300) * 100));

  const currentStage =
    projectProgressData?.currentStage || "Empathize";

  const activeStageIndex =
    stages.findIndex((stage) => stage === currentStage);
  const resolvedActiveStageIndex =
    activeStageIndex >= 0
      ? activeStageIndex
      : completedStages.length >= stages.length
      ? stages.length - 1
      : completedStages.length;

  return (
    <header className="bg-white border-b border-[#e5e7eb] px-8 py-4 fixed top-0 left-[240px] right-0 z-20">
      <div className="flex items-center justify-between gap-6">
        
        {/* LEFT SECTION */}
        <div className="flex-1">
          
          {/* PROJECT WORKFLOW */}
          {isProjectPage ? (
            <div className="w-full max-w-4xl flex items-center gap-3">
              {/* STAGES */}
              <div className="relative flex-1">
                <div className="absolute top-3 left-0 w-full h-[2px] bg-gray-200 rounded-full" />
                <div
                  className="absolute top-3 left-0 h-[2px] bg-[#702dff] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex justify-between">
                  {stages.map((stage, index) => {
                    const isCompleted = completedStages.includes(stage);
                    const isActive = resolvedActiveStageIndex === index;
                    return (
                      <div key={stage} className="flex flex-col items-center min-w-[60px]">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold transition-all ${
                          isCompleted ? "bg-[#702dff] border-[#702dff] text-white"
                          : isActive ? "bg-indigo-100 border-[#702dff] text-[#702dff]"
                          : "bg-white border-gray-300 text-gray-400"
                        }`}>{index + 1}</div>
                        <p className={`mt-1 text-[10px] text-center font-medium ${
                          isCompleted ? "text-[#702dff]" : isActive ? "text-indigo-600" : "text-gray-400"
                        }`}>{stage}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* PCT */}
              <span className="text-xs font-semibold text-[#702dff] whitespace-nowrap">{pct}%</span>
            </div>
          ) : (
            /* DASHBOARD SEARCH BAR */
            isDashboardPage && (
              <div className="max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />

                  <input
                    type="text"
                    placeholder="Search projects, templates..."
                    className="w-full pl-10 pr-4 py-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:border-[#702dff] focus:bg-white transition-colors"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-4 ml-8">
          
          {/* CREATE PROJECT BUTTON */}
          {isDashboardPage && (
            <button
              className="bg-[#702dff] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#5a24cc] transition-colors"
              onClick={onCreateProject}
            >
              <Plus className="w-4 h-4" />

              Create New Project
            </button>
          )}

          {/* NOTIFICATION */}
          <div className="relative">
            <button className="w-9 h-9 bg-[#f9fafb] hover:bg-[#f3f4f6] rounded-lg flex items-center justify-center transition-colors relative">
              <Bell className="w-4 h-4 text-[#6b7280]" />

              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full" />
            </button>
          </div>

          {/* PROFILE */}
          <div className="relative">
            <button
              className="w-9 h-9 rounded-lg overflow-hidden border border-[#e5e7eb] hover:border-[#702dff] transition-colors bg-gradient-to-br from-[#702dff] to-[#9b59ff] flex items-center justify-center"
              onClick={() =>
                setIsProfileOpen(
                  !isProfileOpen
                )
              }
            >
              <span className="text-white font-semibold text-xs">
                {userName?.charAt(0) || "U"}
              </span>
            </button>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setIsProfileOpen(false)
                  }
                />

                <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[60] min-w-[200px]">
                  
                  {/* USER INFO */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {userName}
                    </p>

                    <p className="text-xs text-gray-500">
                      {userPersona}
                    </p>
                  </div>

                  {/* PROFILE BUTTON */}
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);

                      if (onOpenProfile)
                        onOpenProfile();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />

                    <span>View Profile</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}