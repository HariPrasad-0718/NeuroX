"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Download, ArrowRight } from "lucide-react";
import { api } from "@/services/api";

const FILTERS = ["All", "Empathize", "Define", "Ideate", "Prototype", "Test", "Implement", "Adopt"];

const STAGE_IMAGES = {
  empathize: "https://images.unsplash.com/photo-1695668543969-ea7dec95047c?w=400&h=300&fit=crop",
  define: "https://images.unsplash.com/photo-1636633762833-5d1658f1e29b?w=400&h=300&fit=crop",
  ideate: "https://images.unsplash.com/photo-1646066490000-f03bc62d2a02?w=400&h=300&fit=crop",
  prototype: "https://images.unsplash.com/photo-1715528233539-5fe70a4e0d71?w=400&h=300&fit=crop",
  test: "https://images.unsplash.com/photo-1690192203795-ca12d9bb3227?w=400&h=300&fit=crop",
  implement: "https://images.unsplash.com/photo-1527342959657-ddbaa82495d5?w=400&h=300&fit=crop",
  adopt: "https://images.unsplash.com/photo-1690192203795-ca12d9bb3227?w=400&h=300&fit=crop",
};

const DESCRIPTIONS = {
  "Empathy Map": "Visualize user thoughts, feelings, and experiences.",
  "User Persona": "Create detailed profiles of target users.",
  "User Interview Guide": "Structured questions for user interviews.",
  "Problem Statement": "Clearly define the core problem to solve.",
  "User Journey Map": "Map user interactions and touchpoints.",
  "Brainstorming Session": "Generate creative ideas and solutions.",
  "Crazy 8s Template": "Rapid sketching exercise for ideation.",
  "Low Fidelity Wireframe": "Basic layout and structure mockups.",
  "High Fidelity Mockup": "Detailed, polished design prototypes.",
  "Usability Test Script": "Plan and conduct user testing sessions.",
  "User Feedback Form": "Collect and analyze user feedback.",
  "Implementation Plan": "Step-by-step deployment strategy.",
  "Technical Specification": "Detailed technical requirements.",
  "Training Guide": "User training and onboarding materials.",
  "Support Documentation": "Help guides and support resources.",
};

function TemplatesContent() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stage") || "All";
  const [activeFilter, setActiveFilter] = useState(initialStage);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchTemplates(); }, [activeFilter]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeFilter === "All") {
        const res = await api.getTemplates();
        if (res.success && res.data) {
          setTemplates(res.data.map((t) => ({
            id: t.templateId,
            name: t.templateName,
            stage: t.stageName,
            stageId: t.stageId,
            fileUrl: t.fileUrl,
            description: DESCRIPTIONS[t.templateName] || `Template for ${t.templateName}`,
            image: STAGE_IMAGES[t.stageId] || STAGE_IMAGES.empathize,
          })));
        }
      } else {
        const stageId = activeFilter.toLowerCase();
        const res = await api.getTemplatesByStage(stageId);
        if (res.success && res.data) {
          setTemplates(res.data.map((t) => ({
            id: t.templateId,
            name: t.templateName,
            stage: t.stageName,
            stageId: t.stageId,
            fileUrl: t.fileUrl,
            description: DESCRIPTIONS[t.templateName] || `Template for ${t.templateName}`,
            image: STAGE_IMAGES[t.stageId] || STAGE_IMAGES.empathize,
          })));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#fafafa]">
      <div className="px-8 py-6"><h1 className="text-2xl font-semibold text-gray-900">Templates</h1></div>
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((filter) => (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeFilter === filter ? "bg-[#702dff] text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}>{filter}</button>
          ))}
        </div>
      </div>
      <div className="px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" />
            <span className="text-gray-600 mt-4">Loading templates for {activeFilter}...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700 font-medium">Error Loading Templates</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchTemplates} className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm">Try Again</button>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No templates found for {activeFilter}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                <div className="h-40 overflow-hidden bg-gray-100">
                  <img src={template.image} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900 truncate">{template.name}</h3><p className="text-xs text-gray-500 mt-1">{template.stage}</p></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => template.fileUrl && window.open(template.fileUrl, "_blank", "noopener,noreferrer")}
                      disabled={!template.fileUrl}
                      className="flex items-center gap-1 text-[#702dff] hover:text-[#5a24cc] transition-colors group disabled:opacity-50"
                    >
                      <span className="text-sm">Use Template</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => window.location.assign(`/api/templates/download/${template.id}`)}
                      disabled={!template.id}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#fafafa] px-8 py-6"><p className="text-gray-500">Loading...</p></div>}>
      <TemplatesContent />
    </Suspense>
  );
}
