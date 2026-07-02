"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { parsePersonaOutput, buildPersonaOutput } from "@/utils/documentParsers";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";

export default function EmpathyMapPage() {
  const { id: projectId } = useParams();
  const router = useRouter();

  // ─── Project / Persona state ──────────────────────────────────────────────────
  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [enhancedPersonaDescription, setEnhancedPersonaDescription] = useState("");
  const [isEditingPersonaContext, setIsEditingPersonaContext] = useState(false);
  const [personaContextDraft, setPersonaContextDraft] = useState("");
  const [personaContextSaveStatus, setPersonaContextSaveStatus] = useState("");

  // ─── PERSONA-LEVEL question state (shared across all interviewees) ────────────
  // These belong to the persona, not to any individual interviewee.
  const [personaQuestions, setPersonaQuestions] = useState({
    hasQuestions: false,
    questionAgentOutput: [],
    processDiscoveryOutput: [],
    questions: [],
    generatedAt: null,
  });
  const [isLoadingPersonaQuestions, setIsLoadingPersonaQuestions] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // ─── Interviewee state ────────────────────────────────────────────────────────
  const [interviewees, setInterviewees] = useState([]);
  const [selectedInterviewee, setSelectedInterviewee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSavingInterviewee, setIsSavingInterviewee] = useState(false);
  const [intervieweeSaveError, setIntervieweeSaveError] = useState("");
  const [form, setForm] = useState({
    name: "", gender: "", age: "", location: "",
    relationship_status: "", title: "", education: "",
  });

  // ─── INTERVIEWEE-LEVEL state (unique per interviewee) ────────────────────────
  // questionSets holds the interview row for the selected interviewee only.
  const [questionSets, setQuestionSets] = useState([]);
  const [isLoadingInterviewData, setIsLoadingInterviewData] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // ─── Persona output state (interviewee-level) ─────────────────────────────────
  // "idle" | "generating" | "ready" | "error"
  const [personaStatus, setPersonaStatus] = useState("idle");
  const [personaOutput, setPersonaOutput] = useState("");
  const [personaError, setPersonaError] = useState("");
  const [prevPersonaOutput, setPrevPersonaOutput] = useState("");

  // ─── Loader steps ─────────────────────────────────────────────────────────────
  const personaSteps = [
    "Transcript Received",
    "Analyzing Responses",
    "Extracting Pain Points",
    "Generating Persona",
    "Finalizing Report",
  ];
  const [activeStep, setActiveStep] = useState(-1);

  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const progressIntervalRef = useRef(null);
  // Guards against stale async results when switching interviewees rapidly
  const activeIntervieweeIdRef = useRef(null);
  // Guards against stale async results when switching personas rapidly
  const activePersonaIdRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const clearProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressTicker = () => {
    clearProgressInterval();
    setActiveStep(0);
    progressIntervalRef.current = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= personaSteps.length - 2) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          return personaSteps.length - 1;
        }
        return prev + 1;
      });
    }, 1800);
  };

  /** Reset ONLY interviewee-specific state. Persona-level questions are untouched. */
  const resetIntervieweeState = () => {
    clearProgressInterval();
    setQuestionSets([]);
    setTranscript("");
    setTranscriptDraft("");
    setIsEditingTranscript(false);
    setSaveStatus("");
    setPersonaOutput("");
    setPrevPersonaOutput("");
    setPersonaStatus("idle");
    setPersonaError("");
    setActiveStep(-1);
  };

  /** Reset persona-level question state (used when switching personas). */
  const resetPersonaQuestions = () => {
    setPersonaQuestions({
      hasQuestions: false,
      questionAgentOutput: [],
      processDiscoveryOutput: [],
      questions: [],
      generatedAt: null,
    });
    setQuestionError("");
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchPersonas = async () => {
    try {
      const res = await fetch(`/api/personas?projectId=${projectId}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setPersonas(data.data);
        if (data.data.length > 0) setActivePersona(data.data[0]);
      }
    } catch (err) {
      console.error("PERSONA FETCH ERROR:", err);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects?projectId=${projectId}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success && data.data) {
        setProjectName(data.data.projectName || "");
        setProjectDescription(data.data.projectDescription || "");
      }
    } catch (err) {
      console.error("PROJECT FETCH ERROR:", err);
    }
  };

  const fetchInterviewees = async (personaId) => {
    try {
      const res = await fetch(`/api/interviewees?personaId=${personaId}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) setInterviewees(data.data);
    } catch (err) {
      console.error("INTERVIEWEE FETCH ERROR:", err);
    }
  };

  /**
   * PERSONA-LEVEL fetch — loads shared questions for the whole persona.
   * Called when activePersona changes. Has stale-fetch guard via activePersonaIdRef.
   */
  const fetchPersonaQuestions = async (personaId) => {
    setIsLoadingPersonaQuestions(true);
    setQuestionError("");

    try {
      const res = await fetch(`/api/persona-questions?personaId=${personaId}`);
      const data = await res.json();

      // Stale guard — user may have switched persona while fetch was in flight
      if (activePersonaIdRef.current !== personaId) return;

      if (!data?.success) throw new Error(data?.error?.message || "Failed to load questions");

      setPersonaQuestions({
        hasQuestions: data.data.hasQuestions ?? false,
        questionAgentOutput:    data.data.questionAgentOutput    ?? [],
        processDiscoveryOutput: data.data.processDiscoveryOutput ?? [],
        questions:              data.data.questions              ?? [],
        generatedAt:            data.data.generatedAt            ?? null,
      });
    } catch (err) {
      if (activePersonaIdRef.current !== personaId) return;
      console.error("Persona questions fetch error:", err);
      // Non-fatal — questions just won't show; don't block interviewee interaction
    } finally {
      if (activePersonaIdRef.current === personaId) {
        setIsLoadingPersonaQuestions(false);
      }
    }
  };

  /**
   * INTERVIEWEE-LEVEL fetch — loads transcript + persona output for the selected
   * interviewee only. Does NOT touch personaQuestions state.
   * Has stale-fetch guard via activeIntervieweeIdRef.
   */
  const fetchIntervieweeData = async (intervieweeId) => {
    setIsLoadingInterviewData(true);

    try {
      const res = await fetch(`/api/generate-questions?intervieweeId=${intervieweeId}`);
      const data = await res.json();

      if (activeIntervieweeIdRef.current !== intervieweeId) return;

      if (!data?.success) throw new Error(data?.error?.message || "Failed to load interview data");

      const history = data?.data?.history || [];
      const latestSet = history[0] || null;
      const savedTranscript = latestSet?.transcript || "";
      const savedPersona    = latestSet?.personaOutput || "";

      setQuestionSets(history);
      setTranscript(savedTranscript);
      setTranscriptDraft(savedTranscript);
      setIsEditingTranscript(!savedTranscript.trim());
      setSaveStatus("");

      if (savedPersona.trim()) {
        setPersonaOutput(savedPersona);
        setPrevPersonaOutput(savedPersona);
        setPersonaStatus("ready");
        setActiveStep(personaSteps.length);
      } else {
        setPersonaOutput("");
        setPrevPersonaOutput("");
        setPersonaStatus("idle");
        setActiveStep(-1);
      }
      setPersonaError("");

    } catch (err) {
      if (activeIntervieweeIdRef.current !== intervieweeId) return;
      console.error("Interviewee data fetch error:", err);
      // Reset to safe defaults on error
      setQuestionSets([]);
      setTranscript("");
      setTranscriptDraft("");
      setIsEditingTranscript(true);
    } finally {
      if (activeIntervieweeIdRef.current === intervieweeId) {
        setIsLoadingInterviewData(false);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUESTION GENERATION (persona-level)
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleGenerateQuestions = async () => {
    if (!activePersona?.persona_id) {
      alert("Select a persona first");
      return;
    }

    setIsGeneratingQuestions(true);
    setQuestionError("");

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: activePersona.persona_id,
          projectName,
          description: projectDescription || "Project context not provided",
          user_group: activePersona.persona_name,
          persona_description: enhancedPersonaDescription || activePersona.persona_description || "",
        }),
      });

      const data = await res.json();

      if (!data?.success) throw new Error(data?.error?.message || "Failed to generate questions");

      // Update persona-level questions immediately from the response
      setPersonaQuestions({
        hasQuestions: true,
        questionAgentOutput:    data.data.questionAgentQuestions    ?? [],
        processDiscoveryOutput: data.data.processDiscoveryQuestions ?? [],
        // questions list will be refreshed by the re-fetch below
        questions:              [],
        generatedAt:            new Date().toISOString(),
      });

      // Re-fetch persona questions to get the full saved state (including question texts)
      await fetchPersonaQuestions(activePersona.persona_id);

      // If an interviewee is open, reload their interview row so the interviewee
      // picks up the newly copied questions (the POST handler copies questions to
      // all existing interviewees in the transaction).
      if (selectedInterviewee?.interviewee_id) {
        await fetchIntervieweeData(selectedInterviewee.interviewee_id);
      }

      // Progress tracking — only increment on first-ever generation for this persona
      if (!personaQuestions.hasQuestions) {
        try {
          await fetch(`/api/projects/${projectId}/progress`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ progressIncrement: 5, currentStage: "Empathize" }),
          });
        } catch (err) {
          console.error("Progress update failed", err);
        }
      }
    } catch (err) {
      setQuestionError(err.message || "Failed to generate questions");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA GENERATION (interviewee-level)
  // ═══════════════════════════════════════════════════════════════════════════════

  const generatePersonaForInterview = async (interviewId, transcriptText) => {
    setPersonaError("");
    setPersonaStatus("generating");
    startProgressTicker();

    try {
      const res = await fetch("/api/generate-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, transcript: transcriptText }),
      });

      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || "Failed to generate persona");

      const nextPersonaOutput = data?.data?.persona_output || "";

      clearProgressInterval();
      setActiveStep(personaSteps.length);
      setPersonaOutput(nextPersonaOutput);
      setPrevPersonaOutput(nextPersonaOutput);
      setPersonaStatus("ready");

      setQuestionSets((prev) =>
        prev.map((set) =>
          set.interviewId === interviewId
            ? { ...set, transcript: transcriptText, personaOutput: nextPersonaOutput }
            : set
        )
      );
    } catch (err) {
      clearProgressInterval();
      setPersonaStatus("error");
      setPersonaError(err.message || "Failed to generate persona");
      if (prevPersonaOutput) {
        setPersonaOutput(prevPersonaOutput);
        setPersonaStatus("ready");
      }
    }
  };

  const handleSubmitTranscript = async () => {
    const interviewId = questionSets[0]?.interviewId;
    if (!interviewId) return;

    const trimmedDraft  = transcriptDraft.trim();
    const trimmedSaved  = (transcript || "").trim();
    const savedPersona  = (questionSets[0]?.personaOutput || "").trim();

    if (trimmedDraft === trimmedSaved && savedPersona) {
      setIsEditingTranscript(false);
      return;
    }

    setSaveStatus("saving");

    try {
      const res = await fetch("/api/generate-questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, transcript: transcriptDraft }),
      });

      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || "Failed to save transcript");

      setTranscript(transcriptDraft);
      setQuestionSets((prev) =>
        prev.map((s) => s.interviewId === interviewId ? { ...s, transcript: transcriptDraft } : s)
      );
      setSaveStatus("saved");
      setIsEditingTranscript(false);

      if (trimmedDraft) {
        await generatePersonaForInterview(interviewId, transcriptDraft);
      } else {
        setPersonaOutput("");
        setPrevPersonaOutput("");
        setPersonaStatus("idle");
        setPersonaError("");
      }
    } catch (err) {
      clearProgressInterval();
      setSaveStatus("error");
      setPersonaStatus("error");
      setPersonaError(err.message || "Failed to save or generate persona");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════════

  const savePersonaContext = async () => {
    if (!activePersona?.persona_id) return;
    const nextValue = String(personaContextDraft || "").trim();
    if (!nextValue) { alert("Persona context cannot be empty"); return; }

    setPersonaContextSaveStatus("saving");
    try {
      const res = await fetch("/api/personas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: activePersona.persona_id, personaDescription: nextValue }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || "Failed to update persona context");

      setEnhancedPersonaDescription(nextValue);
      setPersonas((prev) =>
        prev.map((p) => p.persona_id === activePersona.persona_id ? { ...p, persona_description: nextValue } : p)
      );
      setActivePersona((prev) => prev ? { ...prev, persona_description: nextValue } : prev);
      setIsEditingPersonaContext(false);
      setPersonaContextSaveStatus("saved");
    } catch (error) {
      setPersonaContextSaveStatus("error");
      alert(error.message || "Failed to update persona context");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // INTERVIEWEE CRUD
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleAddInterviewee = async () => {
    if (!form.name.trim()) { setIntervieweeSaveError("Name is required."); return; }

    setIsSavingInterviewee(true);
    setIntervieweeSaveError("");

    try {
      const res = await fetch("/api/interviewees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: activePersona.persona_id, ...form }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || "Failed to create interviewee");

      setShowForm(false);
      setForm({ name: "", gender: "", age: "", location: "", relationship_status: "", title: "", education: "" });
      setIntervieweeSaveError("");

      const listRes  = await fetch(`/api/interviewees?personaId=${activePersona.persona_id}`);
      const listData = await listRes.json();
      if (listData?.success) {
        setInterviewees(listData.data);
        const newInterviewee = data?.data || listData.data[listData.data.length - 1];
        if (newInterviewee) setSelectedInterviewee(newInterviewee);
      }
    } catch (error) {
      setIntervieweeSaveError(error.message || "Failed to create interviewee. Please try again.");
    } finally {
      setIsSavingInterviewee(false);
    }
  };

  const handleDeleteInterviewee = async (interviewee) => {
    const confirmed = window.confirm(
      `Delete interviewee "${interviewee.name}"? This will remove their transcript and persona output.`
    );
    if (!confirmed) return;

    try {
      const res  = await fetch(`/api/interviewees?intervieweeId=${interviewee.interviewee_id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || "Failed to delete interviewee");

      setInterviewees((prev) => prev.filter((i) => i.interviewee_id !== interviewee.interviewee_id));

      if (selectedInterviewee?.interviewee_id === interviewee.interviewee_id) {
        resetIntervieweeState();
        setSelectedInterviewee(null);
      }
    } catch (error) {
      alert(error.message || "Failed to delete interviewee");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchPersonas();
    fetchProject();
    return () => clearProgressInterval();
  }, []);

  // When active persona changes: load its interviewees AND its shared questions
  useEffect(() => {
    if (!activePersona) return;

    activePersonaIdRef.current = activePersona.persona_id;

    // Reset everything so no stale data shows from the old persona
    resetIntervieweeState();
    resetPersonaQuestions();
    setSelectedInterviewee(null);
    setInterviewees([]);

    setEnhancedPersonaDescription(activePersona.persona_description || "");
    setPersonaContextDraft(activePersona.persona_description || "");
    setIsEditingPersonaContext(false);
    setPersonaContextSaveStatus("");

    // Load persona-level data in parallel
    fetchInterviewees(activePersona.persona_id);
    fetchPersonaQuestions(activePersona.persona_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePersona?.persona_id]);

  // When selected interviewee changes: load only its transcript + persona output
  useEffect(() => {
    activeIntervieweeIdRef.current = selectedInterviewee?.interviewee_id ?? null;

    // Immediately wipe interviewee-specific state (synchronous — no flash)
    resetIntervieweeState();

    if (selectedInterviewee?.interviewee_id) {
      fetchIntervieweeData(selectedInterviewee.interviewee_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterviewee?.interviewee_id]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════════

  const downloadPersonaReport = async () => {
    if (!personaOutput?.trim()) return;

    const latestSet    = questionSets[0] || null;
    const generatedOn  = latestSet?.createdAt
      ? new Date(latestSet.createdAt).toLocaleString()
      : new Date().toLocaleString();

    const extractSectionBullets = (fullText, headingPattern) => {
      const regex = new RegExp(
        `(?:^|\\n)\\s*(?:\\*\\*)?${headingPattern}(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?[A-Za-z][^\\n]{0,80}(?:\\*\\*)?\\s*:?\\s*(?:\\n|$)|$)`,
        "i"
      );
      const match = fullText.match(regex);
      if (!match?.[1]) return [];
      return match[1].split("\n")
        .map((l) => l.replace(/^\s*[-*\u2022\d]+[.)-]?\s*/, "").trim())
        .filter(Boolean);
    };

    const saysBullets   = extractSectionBullets(personaOutput, "Says");
    const thinksBullets = extractSectionBullets(personaOutput, "Thinks");
    const doesBullets   = extractSectionBullets(personaOutput, "Does");
    const feelsBullets  = extractSectionBullets(personaOutput, "Feels");

    const bulletParagraphs = (items) =>
      items.length
        ? items.map((t) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 120 } }))
        : [new Paragraph({ text: "-", spacing: { after: 120 } })];

    const questionParagraphs = personaQuestions.questions.length
      ? personaQuestions.questions.map(
          (q, i) => new Paragraph({ text: `${i + 1}. ${q}`, spacing: { after: 120 } })
        )
      : [new Paragraph({ text: "-", spacing: { after: 120 } })];

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: "NEUROX Persona Report", bold: true, size: 34 })], heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: `Generated On: ${generatedOn}`, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Paragraph({ text: "Project Details", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          new Paragraph({ text: `Project Name: ${projectName || "-"}`, spacing: { after: 120 } }),
          new Paragraph({ text: `Project Description: ${projectDescription || "-"}`, spacing: { after: 240 } }),
          new Paragraph({ text: "Persona Group", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          new Paragraph({ text: `Persona Name: ${activePersona?.persona_name || "-"}`, spacing: { after: 120 } }),
          new Paragraph({ text: `Persona Description: ${enhancedPersonaDescription || activePersona?.persona_description || "-"}`, spacing: { after: 240 } }),
          new Paragraph({ text: "Interviewee Details", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          new Paragraph({ text: `Name: ${selectedInterviewee?.name || "-"}`, spacing: { after: 100 } }),
          new Paragraph({ text: `Gender: ${selectedInterviewee?.gender || "-"}`, spacing: { after: 100 } }),
          new Paragraph({ text: `Age: ${selectedInterviewee?.age ?? "-"}`, spacing: { after: 100 } }),
          new Paragraph({ text: `Location: ${selectedInterviewee?.location || "-"}`, spacing: { after: 100 } }),
          new Paragraph({ text: `Relationship Status: ${selectedInterviewee?.relationship_status || "-"}`, spacing: { after: 100 } }),
          new Paragraph({ text: `Title: ${selectedInterviewee?.title || "-"}`, spacing: { after: 100 } }),
          new Paragraph({ text: `Education: ${selectedInterviewee?.education || "-"}`, spacing: { after: 240 } }),
          new Paragraph({ text: "Generated Questions", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          ...questionParagraphs,
          new Paragraph({ text: "", spacing: { after: 120 } }),
          new Paragraph({ text: "Transcript", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          new Paragraph({ text: transcript?.trim() || "-", spacing: { after: 300 } }),
          new Paragraph({ text: "Persona Output Summary", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          new Paragraph({ text: "Says", heading: HeadingLevel.HEADING_2 }),
          ...bulletParagraphs(saysBullets),
          new Paragraph({ text: "Thinks", heading: HeadingLevel.HEADING_2 }),
          ...bulletParagraphs(thinksBullets),
          new Paragraph({ text: "Does", heading: HeadingLevel.HEADING_2 }),
          ...bulletParagraphs(doesBullets),
          new Paragraph({ text: "Feels", heading: HeadingLevel.HEADING_2 }),
          ...bulletParagraphs(feelsBullets),
          new Paragraph({ text: "Raw Persona Output", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
          new Paragraph({ text: personaOutput.trim(), spacing: { after: 120 } }),
        ],
      }],
    });

    const blob     = await Packer.toBlob(doc);
    const safeName = (selectedInterviewee?.name || "interviewee").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    saveAs(blob, `persona-report-${safeName || "interviewee"}.docx`);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // DERIVED
  // ═══════════════════════════════════════════════════════════════════════════════

  const showPersonaSection =
    personaStatus === "generating" ||
    personaStatus === "ready"      ||
    personaStatus === "error"      ||
    !!personaOutput.trim();

  // ═══════════════════════════════════════════════════════════════════════════════
  // JSX
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-screen-2xl px-3 py-2">

        {/* ── Persona Tabs ────────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => (
              <button
                key={p.persona_id}
                onClick={() => setActivePersona(p)}
                className={`px-4 py-2 rounded-t-md text-sm font-medium transition ${
                  activePersona?.persona_id === p.persona_id
                    ? "bg-indigo-500 text-white shadow"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {p.persona_name}
              </button>
            ))}
          </div>

          {activePersona && (
            <div className="group relative mt-4 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white/85 px-5 py-5 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md sm:px-6 sm:py-6">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-indigo-50/40 via-transparent to-transparent" />
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-100/35 blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Persona Context</p>
                      <p className="mt-0.5 text-base font-semibold text-gray-900">{activePersona.persona_name}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-xs font-semibold text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {isEditingPersonaContext ? "Editing" : "Saved"}
                </div>
              </div>

              <div className="relative mt-4">
                <div className="mb-2 flex justify-end">
                  {!isEditingPersonaContext ? (
                    <button
                      onClick={() => { setIsEditingPersonaContext(true); setPersonaContextDraft(enhancedPersonaDescription || activePersona.persona_description || ""); setPersonaContextSaveStatus(""); }}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setIsEditingPersonaContext(false); setPersonaContextDraft(enhancedPersonaDescription || activePersona.persona_description || ""); setPersonaContextSaveStatus(""); }} className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50">Cancel</button>
                      <button onClick={savePersonaContext} className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700">Save</button>
                    </div>
                  )}
                </div>

                {isEditingPersonaContext ? (
                  <textarea value={personaContextDraft} onChange={(e) => { setPersonaContextDraft(e.target.value); setPersonaContextSaveStatus(""); }} rows={5} className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                ) : (
                  <p className="rounded-xl border border-gray-200 border-l-4 border-l-indigo-400 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-800 break-words">
                    {enhancedPersonaDescription || activePersona.persona_description}
                  </p>
                )}

                {personaContextSaveStatus && (
                  <p className={`mt-2 text-right text-xs ${personaContextSaveStatus === "saving" ? "text-gray-400" : personaContextSaveStatus === "saved" ? "text-emerald-600" : "text-red-500"}`}>
                    {personaContextSaveStatus === "saving" ? "Saving…" : personaContextSaveStatus === "saved" ? "Saved" : "Failed to save"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Interviewee Tabs ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto bg-transparent py-2 pl-4">
            {interviewees.map((i) => (
              <div key={i.interviewee_id} className="relative">
                <button
                  onClick={() => {
                    if (selectedInterviewee?.interviewee_id === i.interviewee_id) {
                      resetIntervieweeState();
                      setSelectedInterviewee(null);
                    } else {
                      setSelectedInterviewee(i);
                    }
                  }}
                  className={`px-4 pr-10 py-2 rounded-t-md whitespace-nowrap text-sm font-medium transition ${
                    selectedInterviewee?.interviewee_id === i.interviewee_id
                      ? "bg-white text-indigo-600 border border-gray-200 border-b-white -mb-px relative z-10"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {i.name}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteInterviewee(i); }}
                  title="Delete interviewee"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 transition hover:text-red-600 hover:bg-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              onClick={() => { setShowForm(!showForm); setSelectedInterviewee(null); }}
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-semibold shadow-sm transition hover:bg-gray-200"
            >
              +
            </button>
          </div>

          {/* Add Interviewee Form */}
          {showForm && (
            <div className="mb-0 bg-transparent py-4">
              <h3 className="mb-4 text-base font-semibold text-gray-800 px-5">Add Interviewee</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 px-5">
                {[
                  { key: "name", label: "Name" },
                  { key: "gender", label: "Gender" },
                  { key: "age", label: "Age" },
                  { key: "location", label: "Location" },
                  { key: "relationship_status", label: "Relationship Status" },
                  { key: "title", label: "Title" },
                  { key: "education", label: "Education" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">
                      {label}{key === "name" && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    <input
                      placeholder={`Enter ${label.toLowerCase()}`}
                      value={form[key]}
                      onChange={(e) => { setForm({ ...form, [key]: e.target.value }); if (key === "name") setIntervieweeSaveError(""); }}
                      disabled={isSavingInterviewee}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
              {intervieweeSaveError && <p className="mt-3 px-5 text-sm text-red-600">{intervieweeSaveError}</p>}
              <div className="mt-5 flex gap-3 px-5">
                <button
                  onClick={handleAddInterviewee}
                  disabled={isSavingInterviewee}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 disabled:opacity-60 transition"
                >
                  {isSavingInterviewee && (
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {isSavingInterviewee ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setIntervieweeSaveError(""); setForm({ name: "", gender: "", age: "", location: "", relationship_status: "", title: "", education: "" }); }}
                  disabled={isSavingInterviewee}
                  className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Interviewee Details */}
          {selectedInterviewee && (
            <div className="border-t border-gray-200 bg-white">
              <div className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 pr-8 text-sm leading-snug">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-900">{selectedInterviewee.name}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">Interviewee</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-700">{selectedInterviewee.age || "—"} yrs</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-700">{selectedInterviewee.location || "—"}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />Active
                  </span>
                </div>
              </div>
              <div className="mt-5 px-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  { label: "Gender",       value: selectedInterviewee.gender },
                  { label: "Education",    value: selectedInterviewee.education },
                  { label: "Title",        value: selectedInterviewee.title },
                  { label: "Relationship", value: selectedInterviewee.relationship_status },
                  { label: "Age",          value: selectedInterviewee.age ? `${selectedInterviewee.age}` : "" },
                  { label: "Location",     value: selectedInterviewee.location },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-1 text-sm leading-snug">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-800">{item.value || <span className="italic text-gray-400">Not set</span>}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Question Guide + Transcript + Persona ──────────────────────────── */}
        {selectedInterviewee && (
          <div className="mt-3">
            <div className="bg-transparent py-6">

              {/* Header row — always shows Generate/Regenerate for the persona */}
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] px-1 text-gray-500">Interview Flow</p>
                  <h3 className="mt-2 text-xl font-semibold px-1 text-gray-900">Question Guide</h3>
                  <p className="mt-1 text-sm leading-6 px-1 text-gray-600">
                    Review the prompts below, then respond in one structured transcript for {selectedInterviewee.name}.
                  </p>
                </div>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingQuestions}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isGeneratingQuestions
                    ? "Generating..."
                    : personaQuestions.hasQuestions
                      ? "Regenerate Questions"
                      : "Generate Questions"}
                </button>
              </div>

              {questionError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{questionError}</p>
              )}

              {/* ── Question Columns ────────────────────────────────────────── */}
              {isGeneratingQuestions ? (
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                    <h4 className="mt-4 text-lg font-semibold text-gray-800">Generating Questions...</h4>
                    <p className="mt-2 text-sm text-gray-500">Please wait while the agents generate interview questions.</p>
                  </div>
                </div>
              ) : isLoadingPersonaQuestions ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                  Loading questions…
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Mandatory Questions — persona-level */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-green-600 mb-4">Mandatory Questions</h3>
                    {personaQuestions.processDiscoveryOutput.length > 0 ? (
                      personaQuestions.processDiscoveryOutput.map((q, idx) => (
                        <div key={idx} className="mb-3 text-sm text-gray-700">{idx + 1}. {q}</div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">
                        {personaQuestions.hasQuestions ? "No mandatory questions." : "Click \"Generate Questions\" to create questions for this persona."}
                      </p>
                    )}
                  </div>

                  {/* Suggested Questions — persona-level */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-indigo-600 mb-4">Suggested Questions</h3>
                    {personaQuestions.questionAgentOutput.length > 0 ? (
                      personaQuestions.questionAgentOutput.map((q, idx) => (
                        <div key={idx} className="mb-3 text-sm text-gray-700">{idx + 1}. {q}</div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">
                        {personaQuestions.hasQuestions ? "No suggested questions." : "Click \"Generate Questions\" to create questions for this persona."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Transcript (interviewee-level) ──────────────────────────── */}
              {personaQuestions.hasQuestions && !isGeneratingQuestions && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Your Answers</p>
                        <h4 className="mt-2 text-lg font-semibold text-gray-900">Structured Transcript</h4>
                      </div>
                      {!isEditingTranscript && (
                        <button
                          onClick={() => { setTranscriptDraft(transcript || ""); setIsEditingTranscript(true); setSaveStatus(""); }}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          Edit
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Write one continuous transcript so your notes stay easy to review.
                    </p>
                  </div>

                  <div className="relative">
                    {isLoadingInterviewData ? (
                      <div className="flex h-[320px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                          Loading transcript…
                        </div>
                      </div>
                    ) : isEditingTranscript ? (
                      <>
                        <textarea
                          value={transcriptDraft}
                          onChange={(e) => { setTranscriptDraft(e.target.value); setSaveStatus(""); }}
                          placeholder={"Write your answers like:\nQ1: ...\nQ2: ...\nQ3: ..."}
                          className="h-[320px] w-full resize-none overflow-y-auto rounded-xl border border-gray-300 bg-white px-4 py-4 font-mono text-sm leading-7 text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => { setTranscriptDraft(transcript || ""); setIsEditingTranscript(false); setSaveStatus(""); }}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitTranscript}
                            disabled={saveStatus === "saving"}
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {saveStatus === "saving" ? "Submitting..." : "Submit Transcript"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="h-[320px] w-full overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-300 bg-white px-4 py-4 font-mono text-sm leading-7 text-gray-800 shadow-sm">
                        {transcript?.trim() ? transcript : "No transcript submitted yet."}
                      </div>
                    )}

                    {saveStatus && (
                      <p className={`mt-1.5 text-right text-xs ${saveStatus === "saving" ? "text-gray-400" : saveStatus === "saved" ? "text-emerald-600" : "text-red-500"}`}>
                        {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Submitted and saved" : "Failed to save"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Persona Output (interviewee-level) ─────────────────────── */}
              {showPersonaSection && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">User Persona Output</p>
                      <h4 className="mt-2 text-lg font-semibold text-gray-900">Interview-based Persona</h4>
                    </div>
                    <p className={`text-xs font-medium ${personaStatus === "generating" ? "text-indigo-500" : personaStatus === "ready" ? "text-emerald-600" : personaStatus === "error" ? "text-red-600" : "text-gray-400"}`}>
                      {personaStatus === "generating" ? "Generating persona…" : personaStatus === "ready" ? "Persona ready" : personaStatus === "error" ? "Generation failed" : "Submit transcript to generate"}
                    </p>
                  </div>

                  {personaError && (
                    <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{personaError}</p>
                  )}

                  {personaStatus === "generating" && !prevPersonaOutput ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="space-y-4">
                        {personaSteps.map((step, index) => (
                          <div key={step} className="flex items-center gap-4">
                            {activeStep >= personaSteps.length || index < activeStep ? (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white text-xs">✓</div>
                            ) : index === activeStep ? (
                              <div className="relative flex h-7 w-7 items-center justify-center">
                                <div className="absolute h-7 w-7 animate-ping rounded-full bg-indigo-200 opacity-50" />
                                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
                              </div>
                            ) : (
                              <div className="h-7 w-7 rounded-full border-2 border-gray-300" />
                            )}
                            <span className={`text-sm ${index <= activeStep ? "text-gray-900 font-medium" : "text-gray-400"}`}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {personaStatus === "generating" && prevPersonaOutput && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                          <span>Regenerating persona with updated transcript…</span>
                        </div>
                      )}
                      <div className={`h-[320px] overflow-y-auto rounded-xl border border-gray-300 bg-white px-4 py-4 text-sm leading-7 text-gray-800 shadow-sm whitespace-pre-wrap transition-opacity duration-300 ${personaStatus === "generating" ? "opacity-60" : "opacity-100"}`}>
                        {personaOutput || prevPersonaOutput || ""}
                      </div>
                    </div>
                  )}

                  {personaStatus === "ready" && personaOutput?.trim() && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={downloadPersonaReport} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
                        Download Report
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`/api/projects/${projectId}/progress`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ stage: "empathize", progress: 100 }),
                            });
                          } catch (_) {}
                          router.push(`/view-persona?projectId=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(projectName)}`);
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                      >
                        Generate Empathy Map
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}