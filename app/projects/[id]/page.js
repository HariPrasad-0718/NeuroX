"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Upload, Download, Share2, Trash2, FileText, Link as LinkIcon, Loader2 } from "lucide-react";
import { api } from "@/services/api";

const STAGES = [
  { id: "empathize", name: "Empathize", description: "Understand your users through observation and engagement." },
  { id: "define", name: "Define", description: "Define the problem statement and user needs." },
  { id: "ideate", name: "Ideate", description: "Generate creative ideas and solutions." },
  { id: "prototype", name: "Prototype", description: "Create tangible representations of your ideas." },
  { id: "test", name: "Test", description: "Validate your prototypes with real users." },
  { id: "implement", name: "Implement", description: "Bring your solution to life." },
];

const STAGE_TEMPLATES = {
  empathize: [
    { id: "empathy-map", name: "Empathy Map", icon: FileText, type: "file" },
    { id: "user-persona", name: "User Persona", icon: FileText, type: "file" },
    { id: "other-files", name: "Other Files", icon: FileText, type: "file" },
  ],
  define: [{ id: "problem-statement", name: "Problem Statement", icon: FileText, type: "file" }],
  ideate: [
    { id: "brainstorm", name: "Brainstorm", icon: FileText, type: "file" },
    { id: "idea-prioritization", name: "Idea Prioritization", icon: FileText, type: "file" },
  ],
  prototype: [
    { id: "low-fidelity", name: "Low Fidelity Prototype", icon: LinkIcon, type: "link" },
    { id: "high-fidelity", name: "High Fidelity Prototype", icon: LinkIcon, type: "link" },
  ],
  test: [
    { id: "test-results", name: "Test Results", icon: FileText, type: "file" },
    { id: "user-feedback", name: "User Feedback", icon: FileText, type: "file" },
  ],
  implement: [
    { id: "implementation-plan", name: "Implementation Plan", icon: FileText, type: "file" },
    { id: "final-deliverables", name: "Final Deliverables", icon: FileText, type: "file" },
  ],
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [prototypeLinks, setPrototypeLinks] = useState({});

  useEffect(() => {
    fetchProject();
    fetchDocuments();
  }, [projectId]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const response = await api.getProjectById(projectId);
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError("Project not found");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const userId = "u";
      const response = await api.getDocuments(userId);
      if (response.success && response.data) {
        setDocuments(response.data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const getDocsForStage = (stageId) => documents.filter((d) => d.stageId === stageId && d.projectId === projectId);
  const getDocsForTemplate = (stageId, templateId) => documents.filter((d) => d.stageId === stageId && d.templateId === templateId && d.projectId === projectId);

  const getStageStatus = (stageId) => {
    if (projectCompleted) return "Completed";
    const templates = STAGE_TEMPLATES[stageId] || [];
    if (templates.length === 0) return "Not Started";
    const stageDocs = getDocsForStage(stageId);
    if (stageDocs.length === 0) return "Not Started";
    if (stageDocs.length < templates.length) return "In Progress";
    return "Completed";
  };

  const getFileName = (path) => {
    if (!path) return "Document";
    const parts = path.split("/");
    return parts[parts.length - 1] || "Document";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center gap-6">
          <button onClick={() => router.push("/projects")} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
          <div><div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-2" /><div className="h-4 w-96 bg-gray-200 animate-pulse rounded" /></div>
        </div>
        <div className="px-8 py-8 flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" /></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center gap-6">
          <button onClick={() => router.push("/projects")} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
          <div><h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Project</h1><p className="text-sm text-gray-600">{error}</p></div>
        </div>
        <div className="px-8 py-8"><button onClick={() => router.push("/projects")} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg">Go Back</button></div>
      </div>
    );
  }

  const isProjectCompleted = project.status === "Completed";

  return (
    <div className="min-h-screen bg-[#fafafa] -m-8">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start gap-6">
          <button onClick={() => router.push("/projects")} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 flex-shrink-0 mt-1"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{project.projectName}</h1>
            <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">{project.projectDescription || "No description"}</p>
            <div className="flex items-center gap-8 mt-4">
              <div className="flex items-center gap-2"><span className="text-xs uppercase tracking-wide text-gray-500 font-medium">Client</span><span className="text-sm text-gray-900 font-medium">{project.client || "N/A"}</span></div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2"><span className="text-xs uppercase tracking-wide text-gray-500 font-medium">Target Date</span><span className="text-sm text-gray-900 font-medium">{project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString() : "N/A"}</span></div>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            <input type="checkbox" checked={projectCompleted} onChange={(e) => setProjectCompleted(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#702dff] focus:ring-[#702dff]" />
            <span className="text-sm text-gray-700 font-medium whitespace-nowrap">Mark as Complete</span>
          </label>
        </div>
      </div>

      <div className="px-8 py-8">
        {isLoadingDocs ? (
          <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-12 h-12 text-[#702dff] animate-spin mb-4" /><p className="text-gray-600">Loading documents...</p></div>
        ) : (
          <div className="space-y-4">
            {STAGES.map((stage) => {
              const isExpanded = expandedStage === stage.id;
              return (
                <div key={stage.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="p-6 cursor-pointer" onClick={() => setExpandedStage(isExpanded ? null : stage.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}><ChevronDown className="w-5 h-5 text-gray-600" /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${getStageStatus(stage.id) === "Completed" ? "bg-green-100 text-green-700" : getStageStatus(stage.id) === "In Progress" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{getStageStatus(stage.id)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{stage.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-200 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(STAGE_TEMPLATES[stage.id] || []).map((template) => {
                          const TemplateIcon = template.icon;
                          const link = prototypeLinks[`${stage.id}-${template.id}`] || "";
                          const apiDocs = getDocsForTemplate(stage.id, template.id);
                          return (
                            <div key={template.id} className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3"><TemplateIcon className="w-4 h-4 text-gray-600" /><span className="text-sm font-medium text-gray-900">{template.name}</span></div>
                              {template.type === "file" && (
                                <div className="mb-3">
                                  <label className="block">
                                    <input type="file" className="hidden" onChange={() => alert("Upload will connect to document API")} />
                                    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded text-sm text-gray-700 cursor-pointer bg-gray-100 hover:bg-gray-200"><Upload className="w-4 h-4" /><span>Choose File</span></div>
                                  </label>
                                </div>
                              )}
                              {template.type === "link" && (
                                <div className="mb-3"><input type="text" value={link} onChange={(e) => setPrototypeLinks({ ...prototypeLinks, [`${stage.id}-${template.id}`]: e.target.value })} className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700" placeholder="Enter prototype link" /></div>
                              )}
                              <button
  onClick={(e) => {
    e.stopPropagation();

    const url = `/projects/${projectId}/workspace?template=${encodeURIComponent(template.name)}&projectName=${encodeURIComponent(project.projectName)}&description=${encodeURIComponent(project.projectDescription)}`;

    console.log("Navigating to:", url); // 👈 DEBUG

    router.push(url);
  }}
  className="w-full px-3 py-2 bg-[#702dff] text-white rounded text-sm"
>
  Use Template
</button>
                              {apiDocs.length > 0 && (
                                <div className="space-y-2 pt-3 border-t border-gray-200">
                                  {apiDocs.map((doc) => (
                                    <div key={doc.documentId} className="bg-blue-50 rounded p-2 border border-blue-100">
                                      <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-900 truncate">{getFileName(doc.blobPath)}</span></div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">{doc.status} • {new Date(doc.createdAt).toLocaleDateString()}</span>
                                        <div className="flex items-center gap-2">
                                          <button className="text-blue-600 hover:text-blue-800"><Download className="w-3 h-3" /></button>
                                          <button onClick={async () => { if (window.confirm("Delete this document?")) { try { await api.deleteDocument(doc.documentId); await fetchDocuments(); alert("Document deleted"); } catch (err) { alert("Delete failed: " + err.message); } } }} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
