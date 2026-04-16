"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MoreVertical, Edit2, Trash2 } from "lucide-react";
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
  const [userPersona, setUserPersona] = useState("Designer");
  const [userId, setUserId] = useState("");
  const [designStages, setDesignStages] = useState([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  const { projects, isLoading: isLoadingProjects, error: projectsError, deleteProject, refetch: refetchProjects } = useProjects(userId);
  const { summary: templatesSummary, isLoading: isSummaryLoading } = useTemplatesSummary();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const id = localStorage.getItem("userId");
    if (role) setUserPersona(role);
    if (id) setUserId(id);
    fetchStages();
  }, []);

  const fetchStages = async () => {
    setIsLoadingStages(true);
    try {
      const response = await api.getStages();
      if (response.success && response.data) {
        setDesignStages(response.data.map((stage, i) => ({
          ...stage, image: STAGE_IMAGES[i] || STAGE_IMAGES[0],
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

  if (userPersona === "Manager") {
    return <ManagerHome projects={mappedProjects} onProjectClick={(p) => router.push(`/projects/${p.projectId}`)} onExpertsClick={() => router.push("/sessions")} />;
  }

  return (
    <>
      {/* Recent Projects */}
      <div className="mb-12">
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
              <div key={project.projectId || index} onClick={() => router.push(`/projects/${project.projectId}`)} className={`bg-gradient-to-br ${project.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group cursor-pointer`} style={{ backgroundSize: "200% 200%", animation: "gradient 8s ease infinite" }}>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-300" />
                <div className="p-6 relative">
                  <div className="flex items-start justify-between mb-5 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-2 truncate text-lg">{project.title}</h3>
                      <p className="text-sm text-white/90 truncate">{project.company}</p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium shadow-sm ${project.status === "Completed" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>{project.status}</span>
                  </div>
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

      {/* Design Thinking Stages */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-[#1f2937] mb-6">Design Thinking Stages</h2>
        {isLoadingStages ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6">
            {designStages.map((stage, index) => {
              const count = templatesSummary[stage.stageId?.toLowerCase()] || 3;
              return (
                <div key={stage.stageId || index} onClick={() => router.push(`/templates?stage=${stage.stageName}`)} className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="h-32 overflow-hidden">
                    <img src={stage.image} alt={stage.stageName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#1f2937] mb-2">{stage.stageName}</h3>
                    <p className="text-sm text-[#6b7280] mb-4">{stage.description}</p>
                    {isSummaryLoading ? (
                      <div className="animate-pulse h-6 w-32 bg-gray-200 rounded" />
                    ) : (
                      <button className="flex items-center gap-2 text-sm text-[#6366F1] hover:text-[#4f46e5] font-medium transition-colors group">
                        <span>Templates Available {count}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex flex-col sm:flex-row gap-4 p-6">
            <div className="w-full sm:w-48 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop" alt="Experts" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#1f2937] mb-2">Design Thinking Experts</h3>
                <p className="text-sm text-[#6b7280] mb-4">Get personalized guidance from experienced UX professionals</p>
              </div>
              <button onClick={() => router.push("/experts")} className="bg-[#6366F1] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#4f46e5] transition-colors self-start">
                <span>Book a Session</span><ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex flex-col sm:flex-row gap-4 p-6">
            <div className="w-full sm:w-48 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop" alt="Knowledge" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[#1f2937] mb-2">Expert-Curated Knowledge Repository</h3>
                <p className="text-sm text-[#6b7280] mb-4">Access documents, case studies, and resources organized by Design Thinking stages.</p>
              </div>
              <button className="bg-[#6366F1] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#4f46e5] transition-colors self-start">
                <span>Explore</span><ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
