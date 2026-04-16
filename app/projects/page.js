"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

const COLORS = ["from-[#8B5CF6] to-[#A78BFA]", "from-[#6366F1] to-[#818CF8]"];

export default function ProjectsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  const { projects, isLoading, error, deleteProject } = useProjects(userId);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
  }, []);

  const allProjects = projects.map((p, i) => ({
    projectId: p.projectId,
    title: p.projectName,
    company: p.client || "Unknown Client",
    description: p.projectDescription || "No description",
    status: p.status || "In Progress",
    startDate: p.startDate,
    color: COLORS[i % COLORS.length],
    isRealData: true,
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#1f2937] mb-2">All Projects</h2>
        <p className="text-sm text-[#6b7280]">Browse and manage all your design thinking projects</p>
      </div>

      {error && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-700 text-sm">Error: {error}</p>
        </div>
      )}

      {isLoading && allProjects.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProjects.map((project, index) => (
            <div key={project.projectId || index} onClick={() => router.push(`/projects/${project.projectId}`)} className={`bg-gradient-to-br ${project.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group cursor-pointer`} style={{ backgroundSize: "200% 200%", animation: "gradient 8s ease infinite" }}>
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-300" />
              <div className="p-6 relative">
                <div className="flex items-start justify-between mb-5 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-2 truncate text-lg">{project.title}</h3>
                    <p className="text-sm text-white/90 truncate">{project.company}</p>
                  </div>
                  <div className="flex items-start gap-2 flex-shrink-0">
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium shadow-sm ${project.status === "Completed" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>{project.status}</span>
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuIndex(openMenuIndex === index ? null : index); }} className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center transition-all relative z-20">
                      <MoreVertical className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {openMenuIndex === index && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuIndex(null)} />
                    <div className="absolute top-16 right-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-30 min-w-[160px]">
                      <button onClick={async (e) => { e.stopPropagation(); if (window.confirm("Delete this project?")) { await deleteProject(project.projectId); } setOpenMenuIndex(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" /><span>Delete</span>
                      </button>
                    </div>
                  </>
                )}

                <p className="text-sm text-white/95 mb-6 line-clamp-2 leading-relaxed">{project.description}</p>
                <span className="text-xs text-white/90 font-medium">
                  {project.startDate ? `Started ${new Date(project.startDate).toLocaleDateString()}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
