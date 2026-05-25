"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, LayoutGrid, List, Eye, Calendar, Search } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@/services/api";
import { DescriptionModal } from "@/components/modals/DescriptionModal";

const INDIGO_COLORS = [
  "from-[#6366F1] to-[#4F46E5]",
  "from-[#7C3AED] to-[#6D28D9]",
  "from-[#4F46E5] to-[#4338CA]",
  "from-[#6366F1] to-[#7C3AED]",
];

const statusBadge = (status) =>
  status === "Completed"
    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
    : "bg-amber-100 text-amber-700 border border-amber-200";

function ProjectCard({ project, onView, onDelete, deleteLoading, openMenuId, setOpenMenuId, onReadMore }) {
  const desc = project.description || "No description";
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
            <div className="absolute top-9 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[130px]">
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
          <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadge(project.status)}`}>
            {project.status}
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{desc}</p>
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

export default function ProjectsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("name");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [descModal, setDescModal] = useState(null);

  const { projects, isLoading, error, deleteProject, deleteLoading } = useProjects(userId, { requireUserId: false });

  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await api.getSessionUser();
        if (response?.success && response?.data?.userId) {
          setUserId(String(response.data.userId));
          return;
        }
      } catch { /* no-op */ }
      router.push("/login");
    };
    hydrate();
  }, [router]);

  const handleDelete = async (projectId) => {
    if (!window.confirm("Delete this project?")) return;
    const result = await deleteProject(projectId);
    if (!result.success) alert(`Failed to delete project: ${result.error}`);
    setOpenMenuProjectId(null);
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

  const filteredProjects = searchQuery.trim()
    ? mappedProjects.filter((p) => {
        const q = searchQuery.toLowerCase();
        if (searchMode === "domain") return p.domain.toLowerCase().includes(q);
        return p.title.toLowerCase().includes(q);
      })
    : mappedProjects;

  return (
    <div className="flex-1 bg-[#fafafa]">
      <div className="px-8 py-6 flex flex-wrap items-center gap-4 justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchMode === "domain" ? "Search by domain..." : "Search by name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-56"
              />
            </div>
            <div className="relative">
              <button
                title="Switch search mode"
                onClick={() => setSearchDropdownOpen((v) => !v)}
                className="w-9 h-9 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center text-lg hover:bg-gray-50 transition"
              >
                {searchMode === "domain" ? "🏷️" : "🔤"}
              </button>
              {searchDropdownOpen && (
                <div className="absolute top-11 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[170px] py-1">
                  <button
                    onClick={() => { setSearchMode("name"); setSearchQuery(""); setSearchDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 ${searchMode === "name" ? "text-indigo-600 font-semibold" : "text-gray-700"}`}
                  >
                    🔤 Search by Name
                  </button>
                  <button
                    onClick={() => { setSearchMode("domain"); setSearchQuery(""); setSearchDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 ${searchMode === "domain" ? "text-indigo-600 font-semibold" : "text-gray-700"}`}
                  >
                    🏷️ Search by Domain
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "card" ? "bg-white text-[#6366F1] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <LayoutGrid className="w-4 h-4" /><span>Card</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "list" ? "bg-white text-[#6366F1] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <List className="w-4 h-4" /><span>List</span>
            </button>
          </div>
        </div>
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
              <div key={idx} className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <div className="h-[100px] skeleton-shimmer" />
                <div className="bg-white p-5 space-y-3">
                  <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                  <div className="h-3 w-full rounded skeleton-shimmer" />
                  <div className="h-3 w-4/5 rounded skeleton-shimmer" />
                  <div className="h-9 w-full rounded-xl skeleton-shimmer mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
            <h2 className="text-lg font-semibold text-[#1f2937] mb-1">
              {searchQuery ? "No projects match your search" : "No projects yet"}
            </h2>
            <p className="text-sm text-[#6b7280]">
              {searchQuery ? `No results for "${searchQuery}"` : "Create a project from the header to see it here."}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.projectId}
                project={project}
                onView={(id) => router.push(`/projects/${id}`)}
                onDelete={handleDelete}
                deleteLoading={deleteLoading}
                openMenuId={openMenuProjectId}
                setOpenMenuId={setOpenMenuProjectId}
                onReadMore={setDescModal}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredProjects.map((project) => (
              <div
                key={project.projectId}
                className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/projects/${project.projectId}`)}
              >
                <div className={`w-1 h-12 rounded-full bg-gradient-to-b ${project.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">{project.title}</h3>
                    <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge(project.status)}`}>
                      {project.status}
                    </span>
                    {project.domain && (
                      <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {project.domain}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">{project.company}</p>
                  <p className="text-xs text-gray-400 truncate">{project.description}</p>
                </div>
                {project.startDate && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/projects/${project.projectId}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1]/10 text-[#6366F1] text-xs font-medium hover:bg-[#6366F1] hover:text-white transition-all duration-200"
                  >
                    <Eye className="w-3.5 h-3.5" />View
                  </button>
                  <div className="relative">
                    <button
                      className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all duration-200"
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
                          <Trash2 className="w-4 h-4" />Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DescriptionModal project={descModal} onClose={() => setDescModal(null)} />
    </div>
  );
}
