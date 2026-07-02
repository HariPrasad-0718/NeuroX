"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";

const renderUploadButton = (label) => (
  <label className="block w-full cursor-pointer">
    <input type="file" className="hidden" onChange={() => alert("Upload will connect to document API")} />
    <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
      <Upload className="h-4 w-4" />
      {label}
    </span>
  </label>
);

export default function StageTemplateCard({
  stageId,
  template,
  isCompleted,
  downloadableTemplateId,
  documents = [],
  getFileName,
  workspaceUrl,
  projectId,
  projectName,
  router,
  onDeleteDocument,
  onRefreshDocuments,
  onGenerateProcessFlow,
  isGeneratingProcessFlow,
  processFlowError,
  onGenerateInformationArchitecture,
  isGeneratingIA,
  informationArchitectureError,
  empathizeCardMedia,
  defineCardMedia,
  ideateCardMedia,
}) {
  if (stageId === "empathize") {
    const media = empathizeCardMedia?.[template.id] || empathizeCardMedia?.["other-files"];
    const topActionLabel = template.id === "empathy-map"
      ? "Get Started"
      : template.id === "other-files"
      ? "Upload"
      : "Generate Empathy Map";
    const primaryFooterLabel = template.id === "user-persona" ? "Use Basic Template" : "Use Standard Template";
    const uploadLabel = template.id === "empathy-map" ? "Upload Standard Template" : "Upload Templates";

    return (
      <div className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100 ${isCompleted ? "border border-indigo-300 shadow-md shadow-indigo-100 ring-1 ring-indigo-200" : "border border-gray-100 shadow-sm"}`}>
        {isCompleted && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg shadow-indigo-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Completed
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ${media.iconColor} group-hover:bg-indigo-100 transition-colors`} dangerouslySetInnerHTML={{ __html: media.icon.replace('width="48" height="48"', 'width="24" height="24"') }} />
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">{media.eyebrow}</p>
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{media.title}</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{media.description}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (template.id === "user-persona") {
                  router.push(`/view-persona?projectId=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(projectName)}`);
                  return;
                }
                router.push(workspaceUrl);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
            >
              {topActionLabel}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!downloadableTemplateId) return;
                window.location.assign(`/api/templates/download/${downloadableTemplateId}`);
              }}
              disabled={!downloadableTemplateId}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />{primaryFooterLabel}
            </button>
            {renderUploadButton(uploadLabel)}
          </div>
        </div>
        {documents.length > 0 && (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 mx-5 mb-5">
            {documents.map((doc) => (
              <div key={doc.documentId} className="rounded-lg border border-gray-200 bg-white p-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="truncate text-xs text-gray-900">{getFileName(doc.blobPath)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {doc.status} • {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm("Delete this document?")) {
                          try {
                            await onDeleteDocument(doc.documentId);
                            await onRefreshDocuments();
                            alert("Document deleted");
                          } catch (err) {
                            alert("Delete failed: " + err.message);
                          }
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (stageId === "define") {
    const media = defineCardMedia?.[template.id] || defineCardMedia?.["problem-statement"];

    return (
      <div className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100 ${isCompleted ? "border border-indigo-300 shadow-md shadow-indigo-100 ring-1 ring-indigo-200" : "border border-gray-100 shadow-sm"}`}>
        {isCompleted && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg shadow-indigo-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Completed
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ${media.iconColor} group-hover:bg-indigo-100 transition-colors`} dangerouslySetInnerHTML={{ __html: media.icon.replace('width="48" height="48"', 'width="24" height="24"') }} />
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">{media.eyebrow}</p>
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{media.title}</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{media.description}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {template.id === "process-flow" ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateProcessFlow();
                  }}
                  disabled={isGeneratingProcessFlow}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGeneratingProcessFlow ? "Generating..." : "Generate"}
                </button>
                {processFlowError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{processFlowError}</p>}
              </>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/projects/${projectId}/define#problem-definition-card`);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
              >
                Define
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!downloadableTemplateId) return;
                window.location.assign(`/api/templates/download/${downloadableTemplateId}`);
              }}
              disabled={!downloadableTemplateId}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />Use Standard Template
            </button>
            {renderUploadButton("Upload Template")}
          </div>
        </div>
      </div>
    );
  }

  if (stageId === "ideate") {
    const media = ideateCardMedia?.[template.id] || ideateCardMedia?.["information-architecture"];

    return (
      <div className={`group relative flex flex-col rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100 ${isCompleted ? "border border-indigo-300 ring-1 ring-indigo-200" : "border border-gray-100"}`}>
        {isCompleted && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </div>
        )}

        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase">{media.eyebrow}</p>
            <h3 className="text-base font-semibold text-gray-900">{media.title}</h3>
          </div>
        </div>

        <p className="px-5 text-sm text-gray-600">{media.description}</p>

        <div className="mt-auto p-5 space-y-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateInformationArchitecture();
            }}
            disabled={isGeneratingIA}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGeneratingIA ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating...
              </>
            ) : (
              "Generate IA"
            )}
          </button>

          {informationArchitectureError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{informationArchitectureError}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
