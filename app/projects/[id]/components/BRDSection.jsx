"use client";

import { useMemo } from "react";
import { Download, Loader2, X } from "lucide-react";

export default function BRDSection({
  isBrdInputModalOpen,
  onCloseBrdInputModal,
  onSubmitBrdMissingInputs,
  isBrdModalOpen,
  onCloseBrdModal,
  brdLoading,
  brdError,
  brdProgress,
  brdSteps,
  brdData,
  brdMeta,
  brdActiveSections,
  brdCollapsed,
  onToggleBrdSection,
  onRegenerateBrd,
  isDownloadingBrd,
  onDownloadBrdDoc,
  businessOwner,
  setBusinessOwner,
  productOwner,
  setProductOwner,
  engineeringLead,
  setEngineeringLead,
  complianceOwner,
  setComplianceOwner,
  endUsers,
  setEndUsers,
  budgetRange,
  setBudgetRange,
  expectedTimeline,
  setExpectedTimeline,
  regulatoryRequirements,
  setRegulatoryRequirements,
  brdMissingFields,
  brdInputFields,
  isApplyingBrdInputs,
  renderBrdContent,
  formatKeyLabel,
}) {
  const brdDoc = useMemo(() => {
    if (!brdData) return null;
    if (typeof brdData === "object") return brdData;
    try {
      return JSON.parse(brdData);
    } catch {
      return null;
    }
  }, [brdData]);

  const editableFieldMap = {
    businessOwner: { label: "Business Owner", value: businessOwner, setter: setBusinessOwner, type: "input", placeholder: "Enter business owner" },
    productOwner: { label: "Product Owner", value: productOwner, setter: setProductOwner, type: "input", placeholder: "Enter product owner" },
    engineeringLead: { label: "Engineering Lead", value: engineeringLead, setter: setEngineeringLead, type: "input", placeholder: "Enter engineering lead" },
    complianceOwner: { label: "Compliance Owner", value: complianceOwner, setter: setComplianceOwner, type: "input", placeholder: "Enter compliance owner" },
    endUsers: { label: "End Users", value: endUsers, setter: setEndUsers, type: "textarea", placeholder: "Describe target users", rows: 3 },
    budgetRange: { label: "Budget Range", value: budgetRange, setter: setBudgetRange, type: "input", placeholder: "₹10,00,000 - ₹20,00,000" },
    expectedTimeline: { label: "Expected Timeline", value: expectedTimeline, setter: setExpectedTimeline, type: "input", placeholder: "6 Months" },
    regulatoryRequirements: {
      label: "Regulatory Requirements",
      value: regulatoryRequirements,
      setter: setRegulatoryRequirements,
      type: "textarea",
      placeholder: "Enter compliance, legal, security or regulatory requirements",
      rows: 4,
    },
  };

  const displayedInputFields = useMemo(() => {
    const candidates = Array.isArray(brdMissingFields) && brdMissingFields.length > 0
      ? brdMissingFields
      : (Array.isArray(brdInputFields) ? brdInputFields.map((item) => item.key) : Object.keys(editableFieldMap));
    return candidates
      .map((key) => ({ key, ...editableFieldMap[key] }))
      .filter((item) => item && typeof item.setter === "function");
  }, [brdMissingFields, brdInputFields, editableFieldMap]);

  return (
    <>
      {isBrdInputModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Complete Missing BRD Details</h2>
              <p className="mt-1 text-sm text-gray-500">
                Fill only the details that were not available in the generated report. We will merge these and finalize the BRD.
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {displayedInputFields.map((field) => {
                  const isWide = field.type === "textarea";
                  return (
                    <div key={field.key} className={isWide ? "md:col-span-2" : ""}>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
                      {field.type === "textarea" ? (
                        <textarea
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          rows={field.rows || 3}
                          className="w-full rounded-lg border border-gray-300 p-2.5"
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 p-2.5"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={onCloseBrdInputModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSubmitBrdMissingInputs}
                disabled={isApplyingBrdInputs}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingBrdInputs ? "Applying..." : "Apply & Finalize BRD"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBrdModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 pb-10 pt-8"
          onClick={onCloseBrdModal}
        >
          <div
            className="w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Generated Document</p>
                <h3 className="text-sm font-semibold text-gray-900">Business Requirements Document</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRegenerateBrd}
                  disabled={brdLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {brdLoading ? "Regenerating..." : "Regenerate"}
                </button>
                <button
                  type="button"
                  onClick={onDownloadBrdDoc}
                  disabled={!brdDoc || isDownloadingBrd}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingBrd ? "Preparing..." : "Download Word"}
                </button>
                <button
                  type="button"
                  onClick={onCloseBrdModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
                  aria-label="Close BRD modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[84vh] overflow-y-auto bg-[#e8ebf0] px-6 py-6">
              {brdLoading ? (
                <div className="premium-loader relative overflow-hidden rounded-2xl border border-[#3730a3] bg-[#172554] px-6 py-8 text-white shadow-[0_24px_70px_rgba(49,46,129,0.3)] sm:px-10">
                  <div className="premium-loader-glow premium-loader-glow-one" />
                  <div className="premium-loader-glow premium-loader-glow-two" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-300">NeuroX document engine</p>
                        <h4 className="mt-2 text-2xl font-semibold tracking-tight">Generating your BRD</h4>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Synthesizing project context into a polished, stakeholder-ready document.</p>
                      </div>
                      <div className="premium-loader-orbit" aria-hidden="true">
                        <div className="premium-loader-core" />
                      </div>
                    </div>

                    <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="premium-loader-progress h-full rounded-full" />
                    </div>
                  </div>

                  {brdProgress.length < brdSteps.length && <p className="relative mt-4 text-xs text-slate-400">AI is structuring your document<span className="premium-loader-dots">...</span></p>}
                </div>
              ) : brdError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{brdError}</div>
              ) : brdDoc ? (
                <article className="formal-doc mx-auto w-full max-w-[980px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                  <header className="doc-cover border-b border-slate-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Business Requirements Document</p>
                    <h2 className="text-[30px] font-bold leading-tight text-slate-900 sm:text-[34px]">{brdMeta?.project_name || "Untitled Project"}</h2>
                    <p className="mt-2 text-sm text-slate-600">{brdMeta?.client_name || "Client not specified"}</p>
                    {brdMeta && (
                      <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-slate-500">
                        {brdMeta.version && <span>Version: {brdMeta.version}</span>}
                        {brdMeta.status && <span>Status: {brdMeta.status}</span>}
                        {brdMeta.last_updated && <span>Last Updated: {brdMeta.last_updated}</span>}
                      </div>
                    )}
                  </header>

                  {brdMeta && (
                    <section className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-10">
                      <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">Document Metadata</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          { key: "project_name", label: "Project" },
                          { key: "client_name", label: "Client" },
                          { key: "department", label: "Department" },
                          { key: "prepared_by", label: "Prepared By" },
                          { key: "business_owner", label: "Business Owner" },
                          { key: "product_owner", label: "Product Owner" },
                          { key: "created_date", label: "Created Date" },
                          { key: "last_updated", label: "Last Updated" },
                        ].map((field) => (
                          <div key={field.key} className="rounded-md border border-slate-200 bg-white px-3.5 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">{field.label}</p>
                            <p className="mt-1 text-sm font-medium text-slate-700">{String(brdMeta[field.key] || "Not specified")}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="divide-y divide-slate-100">
                    {brdActiveSections.length === 0 ? (
                      <p className="px-6 py-10 text-center text-sm text-slate-400 sm:px-10">No BRD sections found in the agent response.</p>
                    ) : (
                      brdActiveSections.map((section) => {
                        const collapsed = Boolean(brdCollapsed[section.key]);
                        return (
                          <div key={section.key}>
                            <button
                              type="button"
                              onClick={() => onToggleBrdSection(section.key)}
                              className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50 sm:px-10"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                                {section.num}
                              </span>
                              <span className="flex-1 text-[16px] font-semibold tracking-tight text-slate-800 sm:text-[17px]">{section.title}</span>
                              <span className="shrink-0 text-xs text-slate-400">{collapsed ? "▶" : "▼"}</span>
                            </button>
                            {!collapsed && (
                              <div className="border-t border-slate-100 bg-white px-6 pb-8 pt-5 sm:px-10">
                                {renderBrdContent(brdDoc[section.key], section.type)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-10">
                    Structured BRD view for stakeholder review and sign-off.
                  </div>
                </article>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
                  No BRD data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .premium-loader-glow {
          position: absolute;
          width: 16rem;
          height: 16rem;
          border-radius: 999px;
          filter: blur(54px);
          opacity: 0.3;
          pointer-events: none;
        }

        .premium-loader-glow-one {
          top: -9rem;
          right: -4rem;
          background: #818cf8;
        }

        .premium-loader-glow-two {
          bottom: -10rem;
          left: -5rem;
          background: #6366f1;
        }

        .premium-loader-orbit {
          display: flex;
          width: 3.5rem;
          height: 3.5rem;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(165, 180, 252, 0.45);
          border-radius: 999px;
          animation: premium-orbit 3s linear infinite;
        }

        .premium-loader-core {
          width: 1.1rem;
          height: 1.1rem;
          border-radius: 999px;
          background: #a5b4fc;
          box-shadow: 0 0 24px #6366f1;
          animation: premium-breathe 1.8s ease-in-out infinite;
        }

        .premium-loader-progress {
          width: 42%;
          background: linear-gradient(90deg, #6366f1, #a5b4fc, #6366f1);
          background-size: 200% 100%;
          animation: premium-progress 2.2s ease-in-out infinite;
        }

        .premium-loader-dots {
          display: inline-block;
          width: 1.2rem;
          overflow: hidden;
          vertical-align: bottom;
          animation: premium-dots 1.4s steps(4, end) infinite;
        }

        @keyframes premium-orbit {
          to { transform: rotate(360deg); }
        }

        @keyframes premium-breathe {
          0%, 100% { transform: scale(0.72); opacity: 0.55; }
          50% { transform: scale(1); opacity: 1; }
        }

        @keyframes premium-progress {
          0% { transform: translateX(-65%); background-position: 0% 50%; }
          50% { transform: translateX(95%); background-position: 100% 50%; }
          100% { transform: translateX(-65%); background-position: 0% 50%; }
        }

        @keyframes premium-dots {
          0% { width: 0; }
          25% { width: 0.4rem; }
          50% { width: 0.8rem; }
          75%, 100% { width: 1.2rem; }
        }
      `}</style>

    </>
  );
}
