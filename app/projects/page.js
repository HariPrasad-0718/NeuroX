"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@/services/api";

const COLORS = [
  "from-[#8B5CF6] to-[#A78BFA]",
  "from-[#6366F1] to-[#818CF8]",
  "from-[#0EA5E9] to-[#38BDF8]",
  "from-[#10B981] to-[#34D399]",
];

export default function ProjectsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);

  const {
    projects,
    isLoading,
    error,
    deleteProject,
    deleteLoading,
  } = useProjects(userId);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await api.getSessionUser();
        if (response?.success && response?.data?.userId) {
          setUserId(String(response.data.userId));
          return;
        }
      } catch {
        // no-op; redirect below
      }

      router.push("/login");
    };

    hydrate();
  }, [router]);

  const handleDelete = async (projectId) => {
    const ok = window.confirm("Delete this project?");
    if (!ok) return;

    const result = await deleteProject(projectId);
    if (!result.success) {
      alert(`Failed to delete project: ${result.error}`);
    }
    setOpenMenuProjectId(null);
  };

  const mappedProjects = projects.map((p, i) => ({
    projectId: p.projectId,
    title: p.projectName,
    company: p.client || "Unknown Client",
    description: p.projectDescription || "No description",
    status: p.status || "In Progress",
    startDate: p.startDate,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="flex-1 bg-[#fafafa]">
      <div className="px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
      </div>

      <div className="px-8 pb-8">
        {error && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-700 text-sm">Error: {error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`projects-page-skeleton-${idx}`} className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-5 gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-4 w-1/2 rounded skeleton-shimmer" />
                  </div>
                  <div className="h-8 w-8 rounded-lg skeleton-shimmer" />
                </div>
                <div className="space-y-2 mb-6">
                  <div className="h-3 w-full rounded skeleton-shimmer" />
                  <div className="h-3 w-4/5 rounded skeleton-shimmer" />
                </div>
                <div className="h-3 w-2/5 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : mappedProjects.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
            <h2 className="text-lg font-semibold text-[#1f2937] mb-1">No projects yet</h2>
            <p className="text-sm text-[#6b7280]">Create a project from the header to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mappedProjects.map((project) => (
              <div
                key={project.projectId}
                className={`bg-gradient-to-br ${project.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group`}
                style={{ backgroundSize: "200% 200%", animation: "gradient 8s ease infinite" }}
              >
                <div
                  className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/projects/${project.projectId}`)}
                />

                <div className="p-6 relative">
                  <div className="flex items-start justify-between mb-5 gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/projects/${project.projectId}`)}>
                      <h3 className="font-semibold text-white mb-2 truncate text-lg">{project.title}</h3>
                      <p className="text-sm text-white/90 truncate">{project.company}</p>
                    </div>

                    <div className="relative">
                      <button
                        className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                        onClick={() => setOpenMenuProjectId((prev) => (prev === project.projectId ? null : project.projectId))}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuProjectId === project.projectId && (
                        <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60"
                            onClick={() => handleDelete(project.projectId)}
                            disabled={deleteLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-white/95 mb-6 line-clamp-2 leading-relaxed cursor-pointer" onClick={() => router.push(`/projects/${project.projectId}`)}>
                    {project.description}
                  </p>

                  <span className="text-xs text-white/90 font-medium">
                    {project.startDate ? `Started ${new Date(project.startDate).toLocaleDateString()}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
