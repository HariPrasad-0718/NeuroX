"use client";

import { useEffect, useMemo, useState } from "react";
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
  onSaveBrdDocumentEdit,
  isSavingBrdEdits,
  renderBrdContent,
  formatKeyLabel,
}) {
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [editableBrdText, setEditableBrdText] = useState("");
  const [editError, setEditError] = useState("");

  const brdDoc = useMemo(() => {
    if (!brdData) return null;
    if (typeof brdData === "object") return brdData;
    try {
      return JSON.parse(brdData);
    } catch {
      return null;
    }
  }, [brdData]);

  useEffect(() => {
    if (!brdDoc || isEditingDocument) return;
    setEditableBrdText(JSON.stringify(brdDoc, null, 2));
  }, [brdDoc, isEditingDocument]);

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

  const generationInputItems = [
    { label: "Business Owner", value: businessOwner },
    { label: "Product Owner", value: productOwner },
    { label: "Engineering Lead", value: engineeringLead },
    { label: "Compliance Owner", value: complianceOwner },
    { label: "End Users", value: endUsers },
    { label: "Budget Range", value: budgetRange },
    { label: "Expected Timeline", value: expectedTimeline },
    { label: "Regulatory Requirements", value: regulatoryRequirements },
  ].map((item) => ({
    ...item,
    value: String(item.value || "").trim() || "Not specified",
  }));

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
            className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-[linear-gradient(115deg,#ffffff_0%,#f8fafc_55%,#ecfeff_100%)] px-6 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600">Generated Document</p>
                <h3 className="text-sm font-semibold text-slate-900">Business Requirements Document</h3>
              </div>
              <div className="flex items-center gap-2">
                {brdDoc && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditError("");
                        if (!isEditingDocument) {
                          setEditableBrdText(JSON.stringify(brdDoc, null, 2));
                        }
                        setIsEditingDocument((prev) => !prev);
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isEditingDocument ? "Cancel Edit" : "Edit JSON"}
                    </button>
                    {isEditingDocument && (
                      <button
                        type="button"
                        onClick={async () => {
                          setEditError("");
                          let parsed;
                          try {
                            parsed = JSON.parse(editableBrdText);
                          } catch {
                            setEditError("Invalid JSON format. Please fix the JSON before saving.");
                            return;
                          }

                          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                            setEditError("BRD must be a JSON object.");
                            return;
                          }

                          const result = await onSaveBrdDocumentEdit(parsed);
                          if (result?.success === false) {
                            setEditError(result.message || "Failed to save BRD edits.");
                            return;
                          }
                          setIsEditingDocument(false);
                        }}
                        disabled={isSavingBrdEdits}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSavingBrdEdits ? "Saving..." : "Save Changes"}
                      </button>
                    )}
                  </>
                )}
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

            <div className="max-h-[84vh] overflow-y-auto bg-[radial-gradient(circle_at_top,#eef2ff_0%,#edf2f7_38%,#e2e8f0_100%)] px-6 py-6">
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
                <article className="formal-doc mx-auto w-full max-w-[1000px] overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-[0_24px_65px_rgba(15,23,42,0.22)]">
                  <header className="doc-cover border-b border-slate-200 bg-[linear-gradient(120deg,#f8fafc_0%,#ffffff_42%,#ecfeff_100%)] px-6 py-8 sm:px-10 sm:py-10">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Business Requirements Document</p>
                    <h2 className="text-[32px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[36px]">{brdMeta?.project_name || "Untitled Project"}</h2>
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
                    <section className="border-b border-slate-200 bg-slate-50/80 px-6 py-6 sm:px-10">
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
                          <div key={field.key} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">{field.label}</p>
                            <p className="mt-1 text-sm font-medium text-slate-700">{String(brdMeta[field.key] || "Not specified")}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="divide-y divide-slate-100">
                    {isEditingDocument && (
                      <div className="px-6 pb-4 pt-6 sm:px-10">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Editable BRD JSON
                        </label>
                        <textarea
                          value={editableBrdText}
                          onChange={(e) => setEditableBrdText(e.target.value)}
                          className="h-[360px] w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-100"
                        />
                        {editError && (
                          <p className="mt-2 text-xs font-medium text-rose-600">{editError}</p>
                        )}
                      </div>
                    )}

                    {!isEditingDocument && (
                      <>
                    <div>
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-6 py-5 text-left sm:px-10"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-[11px] font-bold text-cyan-700">
                          01
                        </span>
                        <span className="flex-1 text-[16px] font-semibold tracking-tight text-slate-800 sm:text-[17px]">
                          Generation Inputs
                        </span>
                      </button>

                      <div className="border-t border-slate-100 bg-white px-6 pb-8 pt-5 sm:px-10">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {generationInputItems.map((item) => (
                            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {brdActiveSections.length === 0 ? (
                      <p className="px-6 py-10 text-center text-sm text-slate-400 sm:px-10">No BRD sections found in the agent response.</p>
                    ) : (
                      brdActiveSections.map((section) => {
                        const collapsed = Boolean(brdCollapsed[section.key]);
                        const shiftedSectionNumber = String((Number(section.num) || 0) + 1).padStart(2, "0");
                        return (
                          <div key={section.key}>
                            <button
                              type="button"
                              onClick={() => onToggleBrdSection(section.key)}
                              className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-cyan-50/40 sm:px-10"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                                {shiftedSectionNumber}
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
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 text-xs text-slate-500 sm:px-10">
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
    </>
  );
}
