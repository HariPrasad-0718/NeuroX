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

const EMPATHIZE_CARD_MEDIA = {
  "empathy-map": {
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=800&fit=crop",
    eyebrow: "Collaborative input",
    title: "Empathy Map",
    description: "Capture user thoughts, feelings, and context before stepping into the workspace.",
  },
  "user-persona": {
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=800&fit=crop",
    eyebrow: "Profile framing",
    title: "User Persona",
    description: "Review the persona structure and prepare a standard or uploaded reference template.",
  },
  "other-files": {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=800&fit=crop",
    eyebrow: "Supporting inputs",
    title: "Other Files",
    description: "Keep supporting research artifacts and additional input materials accessible for the empathize phase.",
  },
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
  const [templateDownloadMap, setTemplateDownloadMap] = useState({});
  const [showPersonaSection, setShowPersonaSection] = useState(false);
  const [personaCards, setPersonaCards] = useState([]);
  const [activePersonaCardId, setActivePersonaCardId] = useState(null);
  const [isPersonaCardsLoading, setIsPersonaCardsLoading] = useState(false);
  const [personaCardsError, setPersonaCardsError] = useState("");

  useEffect(() => {
    fetchProject();
    fetchDocuments();
    fetchTemplateDownloadMap();
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

  const fetchTemplateDownloadMap = async () => {
    try {
      const response = await api.getTemplates();
      if (!response.success || !Array.isArray(response.data)) return;

      const map = {};
      response.data.forEach((template) => {
        const stageId = String(template.stageId || "").toLowerCase().trim();
        const templateName = String(template.templateName || "").toLowerCase().trim();
        if (!stageId || !templateName) return;

        map[`${stageId}::${templateName}`] = template.templateId;
      });

      setTemplateDownloadMap(map);
    } catch (err) {
      console.error("Failed to fetch templates for download mapping:", err);
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

  const getWorkspaceUrl = (templateName) => {
    return `/projects/${projectId}/workspace?template=${encodeURIComponent(templateName)}&projectName=${encodeURIComponent(project.projectName)}&description=${encodeURIComponent(project.projectDescription)}`;
  };

  const parsePersonaOutput = (rawOutput, fallbackName) => {
    const normalized = String(rawOutput || "").replace(/\r\n/g, "\n").trim();

    if (!normalized) {
      return {
        name: fallbackName || "Persona",
        quote: "",
        background: "No generated persona output is available yet.",
        goals: [],
        motivations: [],
        frustrations: [],
        previousExperience: [],
        expectations: [],
      };
    }

    const getHeadingBlock = (text, headingPattern) => {
      const regex = new RegExp(`(?:^|\\n)\\s*(?:\\*\\*)?${headingPattern}(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?[A-Za-z][^\\n]{0,80}(?:\\*\\*)?\\s*:?\\s*(?:\\n|$)|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const getBullets = (block) => {
      if (!block) return [];
      const lines = block
        .split("\n")
        .map((line) => line.replace(/^\s*[-*\u2022\d]+[.)-]?\s*/, "").trim())
        .filter(Boolean);
      return lines;
    };

    const nameMatch = normalized.match(/(?:^|\\n)\s*(?:Name|Persona Name)\s*:\s*(.+)$/im);
    const quoteMatch = normalized.match(/"([^"]+)"/);

    const background =
      getHeadingBlock(normalized, "Background(?:\\s+Description)?") ||
      getHeadingBlock(normalized, "Description") ||
      "";

    return {
      name: (nameMatch?.[1] || fallbackName || "Persona").trim(),
      quote: (quoteMatch?.[1] || "").trim(),
      background: background || "No background description found.",
      goals: getBullets(getHeadingBlock(normalized, "Goals")),
      motivations: getBullets(getHeadingBlock(normalized, "Motivations?")),
      frustrations: getBullets(getHeadingBlock(normalized, "Frustrations?")),
      previousExperience: getBullets(getHeadingBlock(normalized, "Previous\\s+Experience")),
      expectations: getBullets(getHeadingBlock(normalized, "Expectations?")),
    };
  };

  const fetchPersonaCards = async () => {
    setIsPersonaCardsLoading(true);
    setPersonaCardsError("");

    try {
      const res = await fetch(`/api/personas?projectId=${projectId}&includeGenerated=true`);
      const data = await res.json();

      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to load persona cards");
      }

      const cards = (data?.data || []).map((row) => {
        const parsed = parsePersonaOutput(row.generated_output || "", row.interviewee_name || row.persona_name);

        return {
          personaId: row.persona_id,
          personaName: row.persona_name,
          interviewId: row.interview_id,
          generatedAt: row.generated_at,
          hasGeneratedOutput: Boolean((row.generated_output || "").trim()),
          demographics: {
            gender: row.gender || "-",
            age: row.age ?? "-",
            location: row.location || "-",
            relationshipStatus: row.relationship_status || "-",
            title: row.title || "-",
            education: row.education || "-",
          },
          parsed,
        };
      });

      setPersonaCards(cards);
      setActivePersonaCardId(cards[0]?.personaId || null);
    } catch (err) {
      setPersonaCardsError(err.message || "Failed to load persona cards");
      setPersonaCards([]);
      setActivePersonaCardId(null);
    } finally {
      setIsPersonaCardsLoading(false);
    }
  };

  const togglePersonaSection = async () => {
    if (showPersonaSection) {
      setShowPersonaSection(false);
      return;
    }
    setShowPersonaSection(true);
    await fetchPersonaCards();
  };

  const renderUploadButton = (label) => (
    <label className="block w-full">
      <input type="file" className="hidden" onChange={() => alert("Upload will connect to document API")} />
      <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
        <Upload className="h-4 w-4" />
        {label}
      </span>
    </label>
  );

  const renderEmpathizeTemplateCard = (template, downloadableTemplateId) => {
    const media = EMPATHIZE_CARD_MEDIA[template.id] || EMPATHIZE_CARD_MEDIA["other-files"];
    const workspaceUrl = getWorkspaceUrl(template.name);
    const topActionLabel = template.id === "empathy-map"
      ? "Click here"
      : template.id === "user-persona"
        ? "View personas"
        : "View other files";
    const primaryFooterLabel = template.id === "user-persona" ? "Use Basic Template" : "Use Standard Template";
    const uploadLabel = template.id === "empathy-map" ? "Upload Standard Template" : "Upload Templates";

    return (
      <div key={template.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        <div className="relative h-52 overflow-hidden">
          <img src={media.image} alt={template.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">{media.eyebrow}</p>
            <h4 className="mt-2 text-xl font-semibold">{media.title}</h4>
            <p className="mt-1 max-w-sm text-sm leading-6 text-white/85">{media.description}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (template.id === "user-persona") {
                  router.push(`/view-persona?projectId=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(project?.projectName || "")}`);
                  return;
                }
                router.push(workspaceUrl);
              }}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
            >
              {topActionLabel}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!downloadableTemplateId) return;
              window.location.assign(`/api/templates/download/${downloadableTemplateId}`);
            }}
            disabled={!downloadableTemplateId}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            <Download className="h-4 w-4" />
            {primaryFooterLabel}
          </button>

          {renderUploadButton(uploadLabel)}
        </div>
      </div>
    );
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
  const activePersonaCard =
    personaCards.find((card) => card.personaId === activePersonaCardId) || null;

  return (
    <div className="min-h-screen bg-[#fafafa] -mt-8 -mr-8 -mb-8">
      <div className="bg-white border-b border-gray-200 px-8 py-6 mt-8">
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
                          const templateKey = `${stage.id}::${String(template.name || "").toLowerCase().trim()}`;
                          const downloadableTemplateId = templateDownloadMap[templateKey];

                          if (stage.id === "empathize") {
                            return (
                              <div key={template.id} className="space-y-3">
                                {renderEmpathizeTemplateCard(template, downloadableTemplateId)}
                                {apiDocs.length > 0 && (
                                  <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    {apiDocs.map((doc) => (
                                      <div key={doc.documentId} className="rounded-lg border border-gray-200 bg-white p-2.5">
                                        <div className="mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /><span className="truncate text-xs text-gray-900">{getFileName(doc.blobPath)}</span></div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500">{doc.status} • {new Date(doc.createdAt).toLocaleDateString()}</span>
                                          <div className="flex items-center gap-2">
                                            <button className="text-blue-600 hover:text-blue-800"><Download className="h-3 w-3" /></button>
                                            <button onClick={async () => { if (window.confirm("Delete this document?")) { try { await api.deleteDocument(doc.documentId); await fetchDocuments(); alert("Document deleted"); } catch (err) { alert("Delete failed: " + err.message); } } }} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }

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
                                  console.log("Navigating to:", url);
                                  router.push(url);
                                }}
                                className="w-full px-3 py-2 bg-[#702dff] text-white rounded text-sm"
                              >
                                Use Template
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!downloadableTemplateId) return;
                                  window.location.assign(`/api/templates/download/${downloadableTemplateId}`);
                                }}
                                disabled={!downloadableTemplateId}
                                className="w-full px-3 py-2 mt-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                              >
                                Download Template
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

      {showPersonaSection && (
        <div className="px-8 pb-10 bg-[#f5f7fa]">
          <div className="border-t border-gray-200 pt-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Empathize Stage</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">User Persona Output</h2>
              </div>
              <button
                onClick={() => setShowPersonaSection(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Close
              </button>
            </div>

            {isPersonaCardsLoading ? (
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading persona output...</p>
            ) : personaCardsError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{personaCardsError}</p>
            ) : personaCards.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">No personas found for this project.</p>
            ) : (
              <>
                {/* Persona group tabs — same style as workspace */}
                <div className="mb-4 border-b border-gray-200 pb-0 flex gap-2 flex-wrap">
                  {personaCards.map((card) => (
                    <button
                      key={card.personaId}
                      onClick={() => setActivePersonaCardId(card.personaId)}
                      className={`px-4 py-2 rounded-t-md text-sm font-medium transition ${
                        activePersonaCardId === card.personaId
                          ? "bg-indigo-500 text-white shadow"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {card.personaName}
                    </button>
                  ))}
                </div>

                {!activePersonaCard?.hasGeneratedOutput ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    No persona output available for <b>{activePersonaCard?.personaName}</b> yet. Complete the interview transcript in the workspace to generate it.
                  </p>
                ) : (
                  <div className="persona-container">
                    {/* LEFT SIDEBAR */}
                    <div className="persona-sidebar">
                      <div className="persona-avatar" />

                      <div className="persona-section-title">Demographics</div>
                      <p><b>Gender:</b> {activePersonaCard.demographics.gender}</p>
                      <p><b>Age:</b> {activePersonaCard.demographics.age}</p>
                      <p><b>Location:</b> {activePersonaCard.demographics.location}</p>
                      <p><b>Relationship Status:</b> {activePersonaCard.demographics.relationshipStatus}</p>
                      <p><b>Title:</b> {activePersonaCard.demographics.title}</p>
                      <p><b>Education:</b> {activePersonaCard.demographics.education}</p>

                      <div className="persona-section-title">Goals</div>
                      <ul>
                        {(activePersonaCard.parsed.goals.length
                          ? activePersonaCard.parsed.goals
                          : ["No goals extracted yet."]
                        ).map((item, idx) => (
                          <li key={`goal-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* RIGHT MAIN */}
                    <div className="persona-main">
                      <div className="persona-header">
                        <h1>Name: {activePersonaCard.parsed.name}</h1>
                        <div className="persona-quote">
                          {activePersonaCard.parsed.quote
                            ? `"${activePersonaCard.parsed.quote}"`
                            : "No quote available."}
                        </div>
                      </div>

                      <div className="persona-content">
                        <div className="persona-block">
                          <h3>Background Description</h3>
                          <p>{activePersonaCard.parsed.background}</p>
                        </div>

                        <div className="persona-grid-2">
                          <div className="persona-block">
                            <h3>Motivations</h3>
                            <ul>
                              {(activePersonaCard.parsed.motivations.length
                                ? activePersonaCard.parsed.motivations
                                : ["No motivations extracted yet."]
                              ).map((item, idx) => (
                                <li key={`mot-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="persona-block">
                            <h3>Frustrations</h3>
                            <ul>
                              {(activePersonaCard.parsed.frustrations.length
                                ? activePersonaCard.parsed.frustrations
                                : ["No frustrations extracted yet."]
                              ).map((item, idx) => (
                                <li key={`fr-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="persona-grid-2">
                          <div className="persona-block">
                            <h3>Previous Experience</h3>
                            <ul>
                              {(activePersonaCard.parsed.previousExperience.length
                                ? activePersonaCard.parsed.previousExperience
                                : ["No previous experience extracted yet."]
                              ).map((item, idx) => (
                                <li key={`px-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="persona-block">
                            <h3>Expectations</h3>
                            <ul>
                              {(activePersonaCard.parsed.expectations.length
                                ? activePersonaCard.parsed.expectations
                                : ["No expectations extracted yet."]
                              ).map((item, idx) => (
                                <li key={`ex-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .persona-container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          display: flex;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .persona-sidebar {
          width: 30%;
          background: #2f5b8c;
          color: white;
          padding: 20px;
        }

        .persona-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #d9d9d9;
          margin: 0 auto 20px;
          position: relative;
        }

        .persona-avatar::after {
          content: "";
          width: 35px;
          height: 35px;
          background: #555;
          border-radius: 50%;
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
        }

        .persona-avatar::before {
          content: "";
          width: 50px;
          height: 25px;
          background: #555;
          border-radius: 25px 25px 0 0;
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
        }

        .persona-section-title {
          margin-top: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          opacity: 0.9;
        }

        .persona-sidebar p {
          font-size: 13px;
          margin-bottom: 6px;
        }

        .persona-sidebar ul {
          margin-top: 10px;
          padding-left: 18px;
        }

        .persona-sidebar li {
          font-size: 13px;
          margin-bottom: 8px;
        }

        .persona-main {
          width: 70%;
        }

        .persona-header {
          background: #1d3f77;
          color: white;
          padding: 20px;
        }

        .persona-header h1 {
          font-size: 22px;
          margin-bottom: 5px;
        }

        .persona-quote {
          font-size: 13px;
          font-style: italic;
          opacity: 0.9;
        }

        .persona-content {
          padding: 20px;
        }

        .persona-block {
          margin-bottom: 20px;
        }

        .persona-block h3 {
          font-size: 15px;
          margin-bottom: 10px;
          color: #333;
        }

        .persona-block p {
          font-size: 13px;
          color: #555;
        }

        .persona-grid-2 {
          display: flex;
          gap: 20px;
        }

        .persona-grid-2 .persona-block {
          width: 50%;
        }

        .persona-block ul {
          padding-left: 18px;
        }

        .persona-block li {
          font-size: 13px;
          margin-bottom: 8px;
          color: #444;
        }

        @media (max-width: 900px) {
          .persona-container {
            flex-direction: column;
          }

          .persona-sidebar,
          .persona-main {
            width: 100%;
          }

          .persona-grid-2 {
            flex-direction: column;
          }

          .persona-grid-2 .persona-block {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}