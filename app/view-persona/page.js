"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildPersonaOutput, parsePersonaOutput, parseSummaryAndInsights } from "@/utils/documentParsers";

function ViewPersonaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = searchParams.get("projectId") || "";
  const projectName = searchParams.get("projectName") || "";

  const [personaGroups, setPersonaGroups] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [activeIntervieweeId, setActiveIntervieweeId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [personaDescription, setPersonaDescription] = useState("");
  const [summary, setSummary] = useState("");
const [loadingSummary, setLoadingSummary] = useState(false);
const [insights, setInsights] = useState([]);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
const [editableData, setEditableData] = useState(null);
const [isSaving, setIsSaving] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
const [editableSummary, setEditableSummary] = useState("");
const [editableInsights, setEditableInsights] = useState([]);
const [editingSections, setEditingSections] = useState({
  says: false,
  thinks: false,
  does: false,
  feels: false,
  painPoints: false,
  needs: false,
  keyInsights: false,
});
const [isNavigatingToDefine, setIsNavigatingToDefine] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(
        `/api/personas?projectId=${projectId}&includeGenerated=true&groupByInterviewee=true`
      );
      const data = await res.json();

      const map = new Map();

      for (const row of data.data || []) {
        if (!map.has(row.persona_id)) {
          map.set(row.persona_id, {
            personaId: row.persona_id,
            personaName: row.persona_name,
            interviewees: [],
          });
        }

        map.get(row.persona_id).interviewees.push({
          interviewId: row.interview_id,
          intervieweeId: row.interviewee_id,
          intervieweeName: row.interviewee_name,
          savedSummary: row.summary,
          parsed: parsePersonaOutput(
            row.generated_output,
            row.interviewee_name
          ),
        });
      }

      const groups = Array.from(map.values());
      setPersonaGroups(groups);

      setActivePersonaId(groups[0]?.personaId);
      setActiveIntervieweeId(groups[0]?.interviewees?.[0]?.intervieweeId);

      setIsLoading(false);
    };

    fetchData();
  }, [projectId]);

  const activePersonaGroup = useMemo(
    
    () => personaGroups.find((g) => g.personaId === activePersonaId),
    [personaGroups, activePersonaId]
  );
  

  const activeInterviewee = useMemo(
    () =>
      activePersonaGroup?.interviewees?.find(
        (i) => i.intervieweeId === activeIntervieweeId
      ),
    [activePersonaGroup, activeIntervieweeId]
  );
  useEffect(() => {
    const hydrateSummary = (value) => {
      const parsed = parseSummaryAndInsights(value);
      setSummary(parsed.summaryPart);
      setInsights(parsed.insightsPart);
      setEditableSummary(parsed.summaryPart);
      setEditableInsights(
        parsed.insightsPart.length ? [...parsed.insightsPart] : [""]
      );
    };

    const fetchSummary = async () => {
      if (!activeInterviewee) return;

      const savedSummary = String(activeInterviewee.savedSummary || "").trim();
      if (savedSummary) {
        hydrateSummary(savedSummary);
        setLoadingSummary(false);
        return;
      }

      setLoadingSummary(true);

      try {
        const res = await fetch("/api/description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_description: projectName,
            persona_title: activeInterviewee.intervieweeName,
            user_answers: [
              ...activeInterviewee.parsed.says,
              ...activeInterviewee.parsed.thinks,
              ...activeInterviewee.parsed.does,
              ...activeInterviewee.parsed.feels,
            ].join("\n"),
          }),
        });

        const data = await res.json();
        let cleanText = data.summary || "";

        if (cleanText.includes("summary_output")) {
          try {
            const parsed = JSON.parse(cleanText);
            cleanText = parsed.summary_output || cleanText;
          } catch {}
        }

        hydrateSummary(cleanText);
      } catch {
        setSummary("Failed to load summary");
        setInsights([]);
        setEditableSummary("Failed to load summary");
        setEditableInsights([""]);
      }

      setLoadingSummary(false);
    };

    fetchSummary();
  }, [activeInterviewee, projectName]);

  const safeList = (arr) => (Array.isArray(arr) && arr.length ? arr : ["No data"]);

  useEffect(() => {
    if (!activeInterviewee?.parsed) return;

    const normalizeEditable = (arr) => (Array.isArray(arr) && arr.length ? [...arr] : [""]);

    setEditableData({
      says: normalizeEditable(activeInterviewee.parsed.says),
      thinks: normalizeEditable(activeInterviewee.parsed.thinks),
      does: normalizeEditable(activeInterviewee.parsed.does),
      feels: normalizeEditable(activeInterviewee.parsed.feels),
      painPoints: normalizeEditable(activeInterviewee.parsed.painPoints),
      needs: normalizeEditable(activeInterviewee.parsed.needs),
      keyInsights: normalizeEditable(insights),
    });
    setIsEditingSummary(false);
    setEditingSections({
      says: false,
      thinks: false,
      does: false,
      feels: false,
      painPoints: false,
      needs: false,
      keyInsights: false,
    });
  }, [activeInterviewee, insights]);

  const isSectionEditing = (key) => Boolean(editingSections?.[key]);

  const toggleSectionEditing = (key) => {
    setEditingSections((prev) => ({
      ...(prev || {}),
      [key]: !prev?.[key],
    }));
  };

  const updateSectionItem = (key, index, value) => {
    if (key === "keyInsights") {
      setEditableInsights((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        next[index] = value;
        return next;
      });
      setEditableData((prev) => ({
        ...(prev || {}),
        keyInsights: (() => {
          const next = [...(prev?.keyInsights || [])];
          next[index] = value;
          return next;
        })(),
      }));
      return;
    }

    setEditableData((prev) => {
      const next = { ...(prev || {}) };
      next[key] = [...(prev?.[key] || [])];
      next[key][index] = value;
      return next;
    });
  };

  const addSectionRow = (key) => {
    if (key === "keyInsights") {
      setEditableInsights((prev) => [...(prev || []), ""]);
      setEditableData((prev) => ({
        ...(prev || {}),
        keyInsights: [...(prev?.keyInsights || []), ""],
      }));
      return;
    }

    setEditableData((prev) => ({
      ...(prev || {}),
      [key]: [...(prev?.[key] || []), ""],
    }));
  };

  const getSectionItems = (key, isEditing) => {
    const source = key === "keyInsights" ? editableInsights : editableData?.[key];

    if (isEditing) {
      return Array.isArray(source) && source.length ? source : [""];
    }

    return safeList(source);
  };

  const handleSave = async (editedSectionKey = null) => {
    if (!activeInterviewee?.interviewId) {
      alert("No interview found for this persona entry.");
      return;
    }

    try {
      setIsSaving(true);
      const personaOutput = buildPersonaOutput(editableData || {});
      const cleanedInsights = (editableInsights || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      const summaryPayload = `User Summary:\n${String(
        editableSummary || "No summary available"
      ).trim()}\n\nKey Insights:\n${
        cleanedInsights.length
          ? cleanedInsights.map((item) => `- ${item}`).join("\n")
          : "- No key insights available"
      }`;

      const res = await fetch("/api/update-persona-output", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewId: activeInterviewee.interviewId,
          personaOutput,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        alert(payload?.error?.message || "Save failed");
        return;
      }

      const summaryRes = await fetch("/api/update-interview-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewId: activeInterviewee.interviewId,
          summary: summaryPayload,
        }),
      });

      const summaryResponse = await summaryRes.json();
      if (!summaryRes.ok || !summaryResponse?.success) {
        alert(summaryResponse?.error?.message || "Summary save failed");
        return;
      }

      setSummary(String(editableSummary || "").trim());
      setInsights(cleanedInsights);
      setEditableInsights(cleanedInsights.length ? cleanedInsights : [""]);

      alert("Saved successfully");
      if (editedSectionKey) {
        setEditingSections((prev) => ({
          ...(prev || {}),
          [editedSectionKey]: false,
        }));
      }
    } catch {
      alert("Something went wrong while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!activeInterviewee?.interviewId) {
      alert("No interview found for this persona entry.");
      return;
    }

    try {
      setIsSavingSummary(true);
      const cleanedInsights = (editableInsights || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      const summaryPayload = `User Summary:\n${String(
        editableSummary || "No summary available"
      ).trim()}\n\nKey Insights:\n${
        cleanedInsights.length
          ? cleanedInsights.map((item) => `- ${item}`).join("\n")
          : "- No key insights available"
      }`;

      const summaryRes = await fetch("/api/update-interview-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewId: activeInterviewee.interviewId,
          summary: summaryPayload,
        }),
      });

      const summaryResponse = await summaryRes.json();
      if (!summaryRes.ok || !summaryResponse?.success) {
        alert(summaryResponse?.error?.message || "Summary save failed");
        return;
      }

      setSummary(String(editableSummary || "").trim());
      setInsights(cleanedInsights);
      setEditableInsights(cleanedInsights.length ? cleanedInsights : [""]);
      setIsEditingSummary(false);
      alert("Summary saved successfully");
    } catch {
      alert("Something went wrong while saving summary");
    } finally {
      setIsSavingSummary(false);
    }
  };

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="page-title">{projectName || "User Persona"}</h1>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="content">
            <div className="tabs">
             
  {personaGroups.map((p) => (
    <button
      key={p.personaId}
      className={activePersonaId === p.personaId ? "tab active" : "tab"}
      onClick={() => {
        setActivePersonaId(p.personaId);
        setActiveIntervieweeId(p.interviewees[0]?.intervieweeId);
      }}
    >
      {p.personaName}
    </button>
  ))}
</div>

          {/* Interviewee Tabs */}
         <div className="tabs">
          
  {activePersonaGroup?.interviewees?.map((i) => (
    <button
      key={i.intervieweeId}
      className={activeIntervieweeId === i.intervieweeId ? "tab active" : "tab"}
      onClick={() => setActiveIntervieweeId(i.intervieweeId)}
    >
      {i.intervieweeName}
      
    </button>
    
    
  ))}
</div>


        <div className="summary-box summary-editor-box">
          <div className="summary-editor-head">
            <h3 className="summary-title">Interview Summary</h3>
            {!loadingSummary && (
              <div className="summary-actions">
                <span className="summary-meta">
                  {isEditingSummary ? "Editing enabled" : "Read-only"}
                </span>
                <button
                  className="action-btn secondary summary-btn"
                  onClick={() => setIsEditingSummary((prev) => !prev)}
                >
                  {isEditingSummary ? "Cancel" : "Edit"}
                </button>
                {isEditingSummary && (
                  <button
                    className="action-btn success summary-btn"
                    disabled={isSavingSummary || !activeInterviewee?.interviewId}
                    onClick={handleSaveSummary}
                  >
                    {isSavingSummary ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            )}
          </div>

          {loadingSummary ? (
            <p>Loading summary...</p>
          ) : isEditingSummary ? (
            <textarea
              className="summary-input"
              value={editableSummary}
              onChange={(e) => setEditableSummary(e.target.value)}
              placeholder="Add interview summary"
            />
          ) : (
            <p>{editableSummary || "No summary available"}</p>
          )}
        </div>
  

          {/* EMPATHY MAP TABLE */}
          {activeInterviewee && (
            <>
                <div className="summary-box empathy-shell strategic-shell">
                  <div className="strategic-heading-wrap">
                    <h3 className="strategic-heading">Empathy Map</h3>
                    <p className="strategic-subtitle">
                      Human-centered cues from expression, cognition, behavior, and emotion.
                    </p>
                  </div>

                  <div className="strategic-grid empathy-grid">
                    <section className="signal-panel signal-col signal-col-4 says-tone">
                      <div className="signal-head">
                        <div className="signal-head-main">
                          <span className="signal-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                              <path d="M4 12.5C4 8.4 7.1 5.5 11.5 5.5h1.2C17 5.5 20 8.3 20 12.2c0 3.7-2.6 6.3-6.2 6.3H9l-4 2V12.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <h4 className="signal-title">Says</h4>
                        </div>
                        <div className="section-actions">
                          <button className="icon-btn" title={isSectionEditing("says") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("says")}>
                            <svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </button>
                          {isSectionEditing("says") && (
                            <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("says")}>
                              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <ul className="signal-list">
                        {getSectionItems("says", isSectionEditing("says")).map((item, index) => (
                          <li className="signal-item" key={`says-${index}`}>
                            <span className="signal-dot" aria-hidden="true" />
                            {isSectionEditing("says") ? (
                              <textarea className="signal-input" value={editableData?.says?.[index] || ""} onChange={(e) => updateSectionItem("says", index, e.target.value)} />
                            ) : (
                              <p className="signal-text">{item || "No data"}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isSectionEditing("says") && (
                        <button className="add-row-btn" onClick={() => addSectionRow("says")}>+ Add Row</button>
                      )}
                    </section>

                    <section className="signal-panel signal-col signal-col-4 thinks-tone">
                      <div className="signal-head">
                        <div className="signal-head-main">
                          <span className="signal-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.8"/><path d="M15 13l3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </span>
                          <h4 className="signal-title">Thinks</h4>
                        </div>
                        <div className="section-actions">
                          <button className="icon-btn" title={isSectionEditing("thinks") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("thinks")}><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
                          {isSectionEditing("thinks") && (
                            <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("thinks")}><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          )}
                        </div>
                      </div>
                      <ul className="signal-list">
                        {getSectionItems("thinks", isSectionEditing("thinks")).map((item, index) => (
                          <li className="signal-item" key={`thinks-${index}`}>
                            <span className="signal-dot" aria-hidden="true" />
                            {isSectionEditing("thinks") ? (
                              <textarea className="signal-input" value={editableData?.thinks?.[index] || ""} onChange={(e) => updateSectionItem("thinks", index, e.target.value)} />
                            ) : (
                              <p className="signal-text">{item || "No data"}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isSectionEditing("thinks") && (
                        <button className="add-row-btn" onClick={() => addSectionRow("thinks")}>+ Add Row</button>
                      )}
                    </section>

                    <section className="signal-panel signal-col signal-col-4 does-tone">
                      <div className="signal-head">
                        <div className="signal-head-main">
                          <span className="signal-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M6 12.2l3.5 3.3L18 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                          <h4 className="signal-title">Does</h4>
                        </div>
                        <div className="section-actions">
                          <button className="icon-btn" title={isSectionEditing("does") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("does")}><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
                          {isSectionEditing("does") && (
                            <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("does")}><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          )}
                        </div>
                      </div>
                      <ul className="signal-list">
                        {getSectionItems("does", isSectionEditing("does")).map((item, index) => (
                          <li className="signal-item" key={`does-${index}`}>
                            <span className="signal-dot" aria-hidden="true" />
                            {isSectionEditing("does") ? (
                              <textarea className="signal-input" value={editableData?.does?.[index] || ""} onChange={(e) => updateSectionItem("does", index, e.target.value)} />
                            ) : (
                              <p className="signal-text">{item || "No data"}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isSectionEditing("does") && (
                        <button className="add-row-btn" onClick={() => addSectionRow("does")}>+ Add Row</button>
                      )}
                    </section>

                    <section className="signal-panel signal-col signal-col-4 feels-tone">
                      <div className="signal-head">
                        <div className="signal-head-main">
                          <span className="signal-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.3-7-9.6C5 7.8 6.9 6 9.3 6c1.3 0 2.4.6 2.7 1.7C12.3 6.6 13.4 6 14.7 6 17.1 6 19 7.8 19 10.4 19 15.7 12 20 12 20z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                          </span>
                          <h4 className="signal-title">Feels</h4>
                        </div>
                        <div className="section-actions">
                          <button className="icon-btn" title={isSectionEditing("feels") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("feels")}><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
                          {isSectionEditing("feels") && (
                            <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("feels")}><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          )}
                        </div>
                      </div>
                      <ul className="signal-list">
                        {getSectionItems("feels", isSectionEditing("feels")).map((item, index) => (
                          <li className="signal-item" key={`feels-${index}`}>
                            <span className="signal-dot" aria-hidden="true" />
                            {isSectionEditing("feels") ? (
                              <textarea className="signal-input" value={editableData?.feels?.[index] || ""} onChange={(e) => updateSectionItem("feels", index, e.target.value)} />
                            ) : (
                              <p className="signal-text">{item || "No data"}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isSectionEditing("feels") && (
                        <button className="add-row-btn" onClick={() => addSectionRow("feels")}>+ Add Row</button>
                      )}
                    </section>
                  </div>
                </div>

            </>
          )}
        </div>
      )}{/* PAIN POINTS */}
      {activeInterviewee && (
        <div className="summary-box empathy-shell strategic-shell">
    <div className="strategic-heading-wrap">
      <h3 className="strategic-heading">Strategic Signals</h3>
      <p className="strategic-subtitle">
        Prioritized patterns across friction, expectations, and actionable opportunities.
      </p>
    </div>

    <div className="strategic-grid">
      <section className="signal-panel signal-col pain">
        <div className="signal-head">
                      <div className="signal-head-main">
            <span className="signal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3L2.5 20h19L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 9.2v4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="16.9" r="1" fill="currentColor" />
              </svg>
            </span>
            <h4 className="signal-title">Pain Points</h4>
          </div>
                      <div className="section-actions">
                        <span className="signal-chip">{safeList(editableData?.painPoints).length} items</span>
                        <button className="icon-btn" title={isSectionEditing("painPoints") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("painPoints")}><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
                        {isSectionEditing("painPoints") && (
                          <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("painPoints")}><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        )}
                      </div>
        </div>
        <ul className="signal-list">
          {getSectionItems("painPoints", isSectionEditing("painPoints")).map((item, index) => (
            <li className="signal-item" key={`pain-point-${index}`}>
              <span className="signal-dot" aria-hidden="true" />
              {isSectionEditing("painPoints") ? (
                <textarea
                  className="signal-input"
                  value={editableData?.painPoints?.[index] || ""}
                  onChange={(e) => updateSectionItem("painPoints", index, e.target.value)}
                />
              ) : (
                <p className="signal-text">{item || "No data"}</p>
              )}
            </li>
          ))}
        </ul>
        {isSectionEditing("painPoints") && (
          <button className="add-row-btn" onClick={() => addSectionRow("painPoints")}>+ Add Row</button>
        )}
      </section>

      <section className="signal-panel signal-col needs">
        <div className="signal-head">
          <div className="signal-head-main">
            <span className="signal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
              </svg>
            </span>
            <h4 className="signal-title">Needs</h4>
          </div>
          <div className="section-actions">
            <span className="signal-chip">{safeList(editableData?.needs).length} items</span>
            <button className="icon-btn" title={isSectionEditing("needs") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("needs")}><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            {isSectionEditing("needs") && (
              <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("needs")}><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            )}
          </div>
        </div>
        <ul className="signal-list">
          {getSectionItems("needs", isSectionEditing("needs")).map((item, index) => (
            <li className="signal-item" key={`need-${index}`}>
              <span className="signal-dot" aria-hidden="true" />
              {isSectionEditing("needs") ? (
                <textarea
                  className="signal-input"
                  value={editableData?.needs?.[index] || ""}
                  onChange={(e) => updateSectionItem("needs", index, e.target.value)}
                />
              ) : (
                <p className="signal-text">{item || "No data"}</p>
              )}
            </li>
          ))}
        </ul>
        {isSectionEditing("needs") && (
          <button className="add-row-btn" onClick={() => addSectionRow("needs")}>+ Add Row</button>
        )}
      </section>

      <section className="signal-panel signal-col insights">
        <div className="signal-head">
          <div className="signal-head-main">
            <span className="signal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 4.5a6.7 6.7 0 00-3.8 12.2c.7.5 1.2 1.3 1.4 2.2h4.8c.2-.9.7-1.7 1.4-2.2A6.7 6.7 0 0012 4.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9.8 21h4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <h4 className="signal-title">Key Insights</h4>
          </div>
          <div className="section-actions">
            <span className="signal-chip">{safeList(editableInsights).length} items</span>
            <button className="icon-btn" title={isSectionEditing("keyInsights") ? "Cancel" : "Edit"} onClick={() => toggleSectionEditing("keyInsights")}><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.2-10.2-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12.8 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            {isSectionEditing("keyInsights") && (
              <button className="icon-btn primary" title="Save" disabled={isSaving || !activeInterviewee?.interviewId} onClick={() => handleSave("keyInsights")}><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            )}
          </div>
        </div>
        <ul className="signal-list">
          {getSectionItems("keyInsights", isSectionEditing("keyInsights")).map((item, index) => (
            <li className="signal-item" key={`insight-${index}`}>
              <span className="signal-dot" aria-hidden="true" />
              {isSectionEditing("keyInsights") ? (
                <textarea
                  className="signal-input"
                  value={editableInsights?.[index] || ""}
                  onChange={(e) => updateSectionItem("keyInsights", index, e.target.value)}
                />
              ) : (
                <p className="signal-text">{item || "No data"}</p>
              )}
            </li>
          ))}
        </ul>
        {isSectionEditing("keyInsights") && (
          <button className="add-row-btn" onClick={() => addSectionRow("keyInsights")}>+ Add Row</button>
        )}
      </section>
    </div>
  </div>
)}
      <div className="bottom-nav-wrap">
        <button
            className="go-define-btn disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!projectId || isNavigatingToDefine}
            onClick={async () => {
              if (!projectId) return;

              try {
                setIsNavigatingToDefine(true);

                await fetch(`/api/projects/${projectId}/progress`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    stage: "empathize",
                    progress: 100,
                  }),
                });

                router.push(
                  `/projects/${encodeURIComponent(
                    projectId
                  )}/define#problem-definition-card`
                );
              } catch (e) {
                console.error("Failed to update empathize progress", e);
                setIsNavigatingToDefine(false);
              }
            }}
          >
            {isNavigatingToDefine ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>

                Opening Define Stage...
              </>
            ) : (
              "Go to Define Stage Problem Definition"
            )}
          </button>
      </div>
    </div>
      <style jsx>{`

      .page-title {
  font-size: 28px;      /* 🔥 bigger heading */
  font-weight: 700;
  margin-bottom: 24px;
}

.page {
  padding: 10px;
  min-height: 100vh;
  background: #f3f4f6;
}

.page-inner {
  width: min(100%, 1280px);
  margin: 0 auto;
  background: #ffffff;
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
}
  
      .tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 5px;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: #f3f4f6;
  color: #374151;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.summary-box {
  margin-top: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d8e0ea;
  border-radius: 12px;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.06);
}

.summary-editor-box {
  border: 1px solid #cfdcee;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 35%),
    #ffffff;
}

.summary-editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-btn {
  padding: 8px 12px;
  font-size: 12px;
}

.summary-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.summary-meta {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #c7d8f7;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.summary-input {
  width: 100%;
  min-height: 150px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
}

.summary-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

/* Hover */
.tab:hover {
  background: #e5e7eb;
}

/* Active tab (VIOLET THEME) */
.tab.active {
  background: #702dff;
  color: white;
  font-weight: 600;
  box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
}

.tab.active:hover {
  background: #5a24cc;
}

.empathy-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.action-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn.secondary {
  background: linear-gradient(135deg, #702dff, #702dff);
  
}

.action-btn.slate {
  background: linear-gradient(135deg, #111827, #374151);
  box-shadow: 0 10px 22px rgba(17, 24, 39, 0.28);
}

.action-btn.success {
  background: linear-gradient(135deg, #166534, #16a34a);
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.28);
}

.empathy-shell {
  margin-top: 12px;
}

.strategic-shell {
  margin-top: 20px;
  padding: 20px;
  background:
    radial-gradient(circle at 100% 0%, rgba(30, 64, 175, 0.08), transparent 30%),
    #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.empathy-heading {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: #111827;
}

.table-wrap {
  overflow-x: auto;
}

.empathy-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 12px;
  font-size: 14px;
  border: 1px solid #dbe3ee;
}

.empathy-table th {
  padding: 14px;
  color: #ffffff;
  text-align: left;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.dark-col {
  background: #0f172a;
}

.grey-col {
  background: #334155;
}

.empathy-table td {
  padding: 14px;
  border: 1px solid #e5e7eb;
  vertical-align: top;
  color: #1f2937;
  min-width: 220px;
}

.light-row {
  background: #f8fbff;
}

.white-row {
  background: #ffffff;
}

.empathy-table tr:hover td {
  background: #eff6ff;
  transition: background 0.2s ease;
}

.cell-input {
  width: 100%;
  min-height: 90px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
}

.cell-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.strategic-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.signal-panel {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  overflow: hidden;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
  animation: strategic-fade-in 0.5s ease both;
}

.signal-panel:hover {
  transform: translateY(-2px);
  border-color: #bfdbfe;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
}

.signal-col {
  grid-column: span 4;
}

.signal-col-4 {
  grid-column: span 3;
}

.signal-panel.pain {
  background: linear-gradient(180deg, #fff7f4 0%, #ffffff 38%);
}

.signal-panel.says-tone {
  background: linear-gradient(180deg, #f7f5ff 0%, #ffffff 38%);
}

.signal-panel.thinks-tone {
  background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 38%);
}

.signal-panel.does-tone {
  background: linear-gradient(180deg, #f8fdf8 0%, #ffffff 38%);
}

.signal-panel.feels-tone {
  background: linear-gradient(180deg, #fff7f9 0%, #ffffff 38%);
}

.signal-panel.needs {
  background: linear-gradient(180deg, #f4f8ff 0%, #ffffff 38%);
}

.signal-panel.insights {
  background: linear-gradient(180deg, #f4fbf6 0%, #ffffff 38%);
}

.strategic-heading-wrap {
  margin-bottom: 14px;
}

.strategic-heading {
  margin: 0;
  font-size: 27px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #0f172a;
}

.strategic-subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
}

.signal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.signal-head-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.signal-icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.signal-icon svg {
  width: 15px;
  height: 15px;
}

.signal-panel.pain .signal-icon {
  background: #ffe4e6;
  color: #b91c1c;
}

.signal-panel.needs .signal-icon {
  background: #dbeafe;
  color: #1d4ed8;
}

.signal-panel.insights .signal-icon {
  background: #dcfce7;
  color: #15803d;
}

.signal-panel.says-tone .signal-icon {
  background: #ede9fe;
  color: #6d28d9;
}

.signal-panel.thinks-tone .signal-icon {
  background: #dbeafe;
  color: #1d4ed8;
}

.signal-panel.does-tone .signal-icon {
  background: #dcfce7;
  color: #15803d;
}

.signal-panel.feels-tone .signal-icon {
  background: #ffe4e6;
  color: #be123c;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid #dbe3ee;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn svg {
  width: 14px;
  height: 14px;
}

.icon-btn:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(30, 64, 175, 0.12);
}

.icon-btn.primary {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #ffffff;
}

.icon-btn.primary:hover {
  border-color: #1e40af;
  background: #1e40af;
  color: #ffffff;
}

.icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.add-row-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px dashed #93c5fd;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.add-row-btn:hover {
  background: #dbeafe;
  border-color: #3b82f6;
}

.signal-chip {
  font-size: 12px;
  line-height: 1;
  border-radius: 999px;
  padding: 6px 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.signal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #0f172a;
}

.signal-list {
  list-style: none;
  margin: 0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.signal-item {
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.signal-item:hover {
  border-color: #cbd5e1;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.signal-dot {
  margin-top: 7px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.signal-panel.pain .signal-dot {
  background: #ef4444;
}

.signal-panel.needs .signal-dot {
  background: #3b82f6;
}

.signal-panel.insights .signal-dot {
  background: #22c55e;
}

.signal-panel.says-tone .signal-dot {
  background: #8b5cf6;
}

.signal-panel.thinks-tone .signal-dot {
  background: #3b82f6;
}

.signal-panel.does-tone .signal-dot {
  background: #22c55e;
}

.signal-panel.feels-tone .signal-dot {
  background: #f43f5e;
}

.signal-text {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.signal-input {
  width: 100%;
  min-height: 84px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.55;
  color: #0f172a;
  background: #ffffff;
  resize: vertical;
}

.signal-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.bottom-nav-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.go-define-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  background: linear-gradient(135deg, #702dff, #702dff);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.go-define-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.go-define-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

@keyframes strategic-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1200px) {
  .signal-col {
    grid-column: span 6;
  }

  .signal-col-4 {
    grid-column: span 6;
  }
}

@media (max-width: 900px) {
  .empathy-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .summary-editor-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .summary-actions {
    flex-wrap: wrap;
  }

  .strategic-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .signal-col {
    grid-column: span 12;
  }

  .signal-col-4 {
    grid-column: span 12;
  }

  .bottom-nav-wrap {
    justify-content: stretch;
  }

  .go-define-btn {
    width: 100%;
  }
}
      `}</style>
    </div>
  );
}

export default function ViewPersonaPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <ViewPersonaContent />
    </Suspense>
  );
}
