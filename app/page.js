"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useTemplatesSummary } from "@/hooks/useTemplatesSummary";
import { api } from "@/services/api";
import ManagerHome from "@/components/ManagerHome";
import { DescriptionModal } from "@/components/modals/DescriptionModal";

const STAGE_IMAGES = [
  "https://images.unsplash.com/photo-1695668543969-ea7dec95047c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1636633762833-5d1658f1e29b?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1646066490000-f03bc62d2a02?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1715528233539-5fe70a4e0d71?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1690192203795-ca12d9bb3227?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1527342959657-ddbaa82495d5?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1690192203795-ca12d9bb3227?w=400&h=300&fit=crop",
];

const INDIGO_COLORS = [
  "from-[#6366F1] to-[#4F46E5]",
  "from-[#7C3AED] to-[#6D28D9]",
  "from-[#4F46E5] to-[#4338CA]",
  "from-[#6366F1] to-[#7C3AED]",
];

function dispatchEditProject(projectId) {
  window.dispatchEvent(new CustomEvent("neurox:edit-project", { detail: { projectId } }));
}

function HomeProjectCard({ project, onView, onEdit, onDelete, deleteLoading, openMenuId, setOpenMenuId, onReadMore }) {
  const desc = String(project.description || "").replace(/\s+/g, " ").trim();
  const isLong = desc.length > 80;

  return (
    <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.02] transition-all duration-300 bg-white border border-gray-100 flex flex-col">
      {/* Top indigo section */}
      <div className={`bg-gradient-to-br ${project.color} px-6 py-4 flex flex-col items-center justify-center text-center relative min-h-[100px]`}>
        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <button
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition"
            onClick={() => setOpenMenuId((prev) => (prev === project.projectId ? null : project.projectId))}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {openMenuId === project.projectId && (
            <div className="absolute top-9 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 min-w-[140px]">
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => { onEdit(project.projectId); setOpenMenuId(null); }}
              >
                <Pencil className="w-4 h-4 text-gray-400" />Edit
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-60"
                onClick={() => onDelete(project.projectId)}
                disabled={deleteLoading}
              >
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          )}
        </div>

        <h3 className="font-bold text-white text-lg leading-tight mb-1.5 px-6">{project.title}</h3>
        <p className="text-white/80 text-sm">{project.company}</p>
        {project.domain && (
          <span className="mt-2 inline-flex text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium">
            {project.domain}
          </span>
        )}
      </div>

      {/* Bottom white section */}
      <div className="bg-white px-5 py-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${project.status === "Completed" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
            {project.status}
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
          {desc || "No description"}
        </p>
        {isLong && (
          <button
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium self-start mt-1 mb-2 transition"
            onClick={() => onReadMore(project)}
          >
            Read More
          </button>
        )}

        <div className="mt-auto pt-3">
          <button
            onClick={() => onView(project.projectId)}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all duration-200 hover:shadow-md"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [userPersona, setUserPersona] = useState("designer");
  const [userId, setUserId] = useState("");
  const [designStages, setDesignStages] = useState([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [descModal, setDescModal] = useState(null);

  const menuRef = useRef(null);

  const {
    projects,
    isLoading: isLoadingProjects,
    error: projectsError,
    deleteProject,
    deleteLoading,
  } = useProjects(userId, { requireUserId: false, recentOnly: true, limit: 3 });

  const { summary: templatesSummary } = useTemplatesSummary();

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

  useEffect(() => {
    if (openMenuIndex === null) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuIndex]);

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
    domain: p.domain || "",
    color: INDIGO_COLORS[i % INDIGO_COLORS.length],
  }));

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Delete this project?")) return;
    const result = await deleteProject(projectId);
    if (!result.success) alert(`Failed to delete: ${result.error}`);
    setOpenMenuIndex(null);
  };

  if (userPersona === "manager") {
    return (
      <ManagerHome
        projects={mappedProjects}
        onProjectClick={(p) => router.push(`/projects/${p.projectId}`)}
        onExpertsClick={() => router.push("/sessions")}
      />
    );
  }

  return (
    <div className="ml-6 mt-6">

      {/* Recent Projects */}
      <div className="mb-12 mt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-[#1f2937]">Recent Projects</h2>
            {isLoadingProjects && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#702dff]" />}
          </div>
          <button onClick={() => router.push("/projects")} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
            View All Projects <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {projectsError && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-700 text-sm">Error: {projectsError}</p>
          </div>
        )}

        {isLoadingProjects && mappedProjects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <div className="h-[130px] skeleton-shimmer" />
                <div className="bg-white p-5 space-y-3">
                  <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                  <div className="h-3 w-full rounded skeleton-shimmer" />
                  <div className="h-3 w-4/5 rounded skeleton-shimmer" />
                  <div className="h-9 w-full rounded-xl skeleton-shimmer mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : mappedProjects.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
            <p className="text-sm text-[#6b7280]">No projects yet. Create one from the header.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={menuRef}>
            {mappedProjects.map((project) => (
              <HomeProjectCard
                key={project.projectId}
                project={project}
                onView={(id) => router.push(`/projects/${id}`)}
                onEdit={dispatchEditProject}
                onDelete={handleDeleteProject}
                deleteLoading={deleteLoading}
                openMenuId={openMenuIndex}
                setOpenMenuId={setOpenMenuIndex}
                onReadMore={setDescModal}
              />
            ))}
          </div>
        )}
      </div>

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

      <DescriptionModal project={descModal} onClose={() => setDescModal(null)} />
    </div>
  );
}
