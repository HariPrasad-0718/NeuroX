"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useTemplatesSummary } from "@/hooks/useTemplatesSummary";
import { api } from "@/services/api";
import ManagerHome from "@/components/ManagerHome";

const STAGE_IMAGES = [
  "https://images.unsplash.com/photo-1695668543969-ea7dec95047c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1636633762833-5d1658f1e29b?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1646066490000-f03bc62d2a02?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1715528233539-5fe70a4e0d71?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1690192203795-ca12d9bb3227?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1527342959657-ddbaa82495d5?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1690192203795-ca12d9bb3227?w=400&h=300&fit=crop",
];

const COLORS = [
  "from-[#8B5CF6] to-[#A78BFA]",
  "from-[#6366F1] to-[#818CF8]",
];

export default function HomePage() {
  const router = useRouter();
  const [userPersona, setUserPersona] = useState("designer");
  const [userId, setUserId] = useState("");
  const [designStages, setDesignStages] = useState([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState(null);

  const {
    projects,
    isLoading: isLoadingProjects,
    error: projectsError,
    deleteProject,
    deleteLoading,
  } = useProjects(userId);
  const { summary: templatesSummary, isLoading: isSummaryLoading } = useTemplatesSummary();

  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await api.getSessionUser();
        if (response?.success && response?.data?.userId) {
          setUserPersona(String(response.data.role || "designer").toLowerCase());
          setUserId(String(response.data.userId));
        }
      } catch {
        router.push("/login");
      }
      fetchStages();
    };

    hydrate();
  }, []);

  const fetchStages = async () => {
    setIsLoadingStages(true);
    try {
      const response = await api.getStages();
      if (response.success && response.data) {
        setDesignStages(response.data.map((stage, i) => ({
          ...stage,
          image: STAGE_IMAGES[i] || STAGE_IMAGES[0],
          description: "Visualize user experience touchpoints and emotions.",
        })));
      }
    } catch (err) {
      console.error("Failed to fetch stages:", err);
    } finally {
      setIsLoadingStages(false);
    }
  };

  const mappedProjects = projects.map((p, i) => ({
    projectId: p.projectId,
    title: p.projectName,
    company: p.client || "Unknown Client",
    description: p.projectDescription || "No description",
    status: p.status || "In Progress",
    startDate: p.startDate,
    color: COLORS[i % COLORS.length],
    isRealData: true,
  }));

  const recentProjects = mappedProjects.slice(0, 6);

  const truncateDescription = (text, maxLength = 140) => {
    const normalized = String(text || "").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}...`;
  };

  const handleDeleteProject = async (projectId) => {
    const ok = window.confirm("Delete this project?");
    if (!ok) return;

    const result = await deleteProject(projectId);
    if (!result.success) {
      alert(`Failed to delete project: ${result.error}`);
    }

    setOpenMenuIndex(null);
  };

  if (userPersona === "manager") {
    return <ManagerHome projects={mappedProjects} onProjectClick={(p) => router.push(`/projects/${p.projectId}`)} onExpertsClick={() => router.push("/sessions")} />;
  }

  return (
    <div className="ml-6 mt-6">

      {/* Recent Projects */}
      <div className="mb-12 mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#1f2937]">Recent Projects</h2>
          {isLoadingProjects && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#702dff]" />}
        </div>

        {projectsError && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-700 text-sm">Error: {projectsError}</p>
          </div>
        )}

        {isLoadingProjects && recentProjects.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map((project, index) => (
              <div key={project.projectId || index} onClick={() => router.push(`/projects/${project.projectId}`)} className={`h-[320px] bg-gradient-to-br ${project.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group cursor-pointer`}>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-300" />
                <div className="p-6 relative h-full flex flex-col">
                  <div className="flex items-start justify-between mb-5 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-2 truncate text-lg">{project.title}</h3>
                      <p className="text-sm text-white/90 truncate">{project.company}</p>
                    </div>

                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                        onClick={() => setOpenMenuIndex((prev) => (prev === project.projectId ? null : project.projectId))}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuIndex === project.projectId && (
                        <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60"
                            onClick={() => handleDeleteProject(project.projectId)}
                            disabled={deleteLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex text-xs px-3 py-1.5 rounded-full font-medium mb-4 ${project.status === "Completed" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>{project.status}</span>
                  <p className="text-sm text-white/95">{truncateDescription(project.description)}</p>
                  {String(project.description || "").trim().length > 140 && (
                    <button
                      className="mt-3 self-start text-xs font-medium text-white underline underline-offset-4 decoration-white/60 hover:decoration-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDescriptionModal({
                          title: project.title,
                          company: project.company,
                          description: String(project.description || "No description"),
                        });
                      }}
                    >
                      Read more
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {descriptionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDescriptionModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{descriptionModal.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{descriptionModal.company}</p>
              </div>
              <button
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => setDescriptionModal(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{descriptionModal.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Design Thinking Stages */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-[#1f2937] mb-6">Design Thinking Stages</h2>
        {isLoadingStages ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" />
          </div>
        ) : (
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {designStages.map((stage, index) => {
              const count = templatesSummary[stage.stageId?.toLowerCase()] || 3;
              return (
                <div key={stage.stageId || index} onClick={() => router.push(`/templates?stage=${stage.stageName}`)} className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="h-48 overflow-hidden">
                    <img src={stage.image} alt={stage.stageName} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#1f2937] mb-2">{stage.stageName}</h3>
                    <p className="text-sm text-[#6b7280] mb-4">{stage.description}</p>
                    <button className="flex items-center gap-2 text-sm text-[#6366F1] font-medium">
                      <span>Templates Available {count}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 p-6">
            <div className="w-full sm:w-48 h-40 bg-gray-200">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Design Thinking Experts</h3>
              <p className="text-sm mb-4">Get personalized guidance from experienced UX professionals</p>
              <button onClick={() => router.push("/experts")} className="bg-[#6366F1] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#4f46e5] transition-colors self-start">
                <span>Book a Session</span><ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2 (ADDED BACK — NO OTHER CHANGES) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 p-6">
            <div className="w-full sm:w-48 h-40 bg-gray-200">
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Expert-Curated Knowledge Repository</h3>
              <p className="text-sm mb-4">Access documents, case studies, and resources organized by Design Thinking stages.</p>
              <button className="bg-[#6366F1] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#4f46e5] transition-colors self-start">
                <span>Explore</span><ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}