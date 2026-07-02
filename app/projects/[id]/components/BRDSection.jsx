"use client";

import { Download, Loader2, X } from "lucide-react";

export default function BRDSection({
  isBrdInputModalOpen,
  onCloseBrdInputModal,
  onGenerateBrd,
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
  renderBrdContent,
  formatKeyLabel,
}) {
  const brdDoc = (() => {
    if (!brdData) return null;
    if (typeof brdData === "object") return brdData;
    try {
      return JSON.parse(brdData);
    } catch {
      return null;
    }
  })();

  return (
    <>
      {isBrdInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">BRD Additional Details</h2>
              <p className="mt-1 text-sm text-gray-500">
                Provide additional business and project information to improve the generated Business Requirements Document.
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Business Owner</label>
                  <input
                    value={businessOwner}
                    onChange={(e) => setBusinessOwner(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="Enter business owner"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Product Owner</label>
                  <input
                    value={productOwner}
                    onChange={(e) => setProductOwner(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="Enter product owner"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Engineering Lead</label>
                  <input
                    value={engineeringLead}
                    onChange={(e) => setEngineeringLead(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="Enter engineering lead"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Compliance Owner</label>
                  <input
                    value={complianceOwner}
                    onChange={(e) => setComplianceOwner(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="Enter compliance owner"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Users</label>
                  <textarea
                    value={endUsers}
                    onChange={(e) => setEndUsers(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="Describe target users"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Budget Range</label>
                  <input
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="₹10,00,000 - ₹20,00,000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Expected Timeline</label>
                  <input
                    value={expectedTimeline}
                    onChange={(e) => setExpectedTimeline(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="6 Months"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Regulatory Requirements</label>
                  <textarea
                    value={regulatoryRequirements}
                    onChange={(e) => setRegulatoryRequirements(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 p-2.5"
                    placeholder="Enter compliance, legal, security or regulatory requirements"
                  />
                </div>
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
                onClick={() => {
                  onCloseBrdInputModal();
                  onGenerateBrd();
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Generate BRD
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
            className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
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
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700">Generating BRD Document</p>

                  <div className="space-y-3">
                    {brdProgress.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        {step.done ? (
                          <span className="font-bold text-green-600">✓</span>
                        ) : (
                          <div className="relative flex h-5 w-5 items-center justify-center">
                            <div className="absolute h-5 w-5 animate-ping rounded-full bg-indigo-200 opacity-50" />
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                          </div>
                        )}

                        <span className={step.done ? "text-green-700" : "text-slate-600"}>{step.label}</span>
                      </div>
                    ))}
                  </div>

                  {brdProgress.length < brdSteps.length && <p className="text-xs text-slate-400">AI is structuring your document...</p>}
                </div>
              ) : brdError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{brdError}</div>
              ) : brdDoc ? (
                <article className="formal-doc mx-auto max-w-[920px] overflow-hidden border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                  <header className="doc-cover border-b border-slate-200 px-12 py-12">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Business Document</p>
                    <h2 className="text-[34px] font-bold leading-tight text-slate-900">Business Requirements Document</h2>
                    <p className="mt-3 text-[18px] text-slate-700">{brdMeta?.project_name || "Untitled Project"}</p>
                    {brdMeta && (
                      <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-slate-500">
                        {brdMeta.date_submitted && <span>Submitted: {brdMeta.date_submitted}</span>}
                        {brdMeta.version && <span>Version: {brdMeta.version}</span>}
                        {brdMeta.status && <span>Status: {brdMeta.status}</span>}
                      </div>
                    )}
                  </header>

                  {brdMeta && (
                    <section className="border-b border-slate-200 bg-slate-50 px-12 py-7">
                      <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">Document Metadata</h4>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          { key: "project_name", label: "Project" },
                          { key: "project_manager", label: "Project Manager" },
                          { key: "date_submitted", label: "Submitted" },
                          { key: "version", label: "Version" },
                          { key: "status", label: "Status" },
                          { key: "department", label: "Department" },
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
                      <p className="px-12 py-10 text-center text-sm text-slate-400">No BRD sections found in the agent response.</p>
                    ) : (
                      brdActiveSections.map((section) => {
                        const collapsed = Boolean(brdCollapsed[section.key]);
                        return (
                          <div key={section.key}>
                            <button
                              type="button"
                              onClick={() => onToggleBrdSection(section.key)}
                              className="flex w-full items-center gap-4 px-12 py-5 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                                {section.num}
                              </span>
                              <span className="flex-1 text-[17px] font-semibold tracking-tight text-slate-800">{section.title}</span>
                              <span className="shrink-0 text-xs text-slate-400">{collapsed ? "▶" : "▼"}</span>
                            </button>
                            {!collapsed && (
                              <div className="border-t border-slate-100 bg-white px-12 pb-8 pt-5">
                                {renderBrdContent(brdDoc[section.key], section.type)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 px-12 py-4 text-xs text-slate-500">
                    Document rendered in stakeholder review format.
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
    </>
  );
}
