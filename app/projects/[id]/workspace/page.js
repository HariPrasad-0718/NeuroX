"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [enhancedPersonaDescription, setEnhancedPersonaDescription] = useState("");
  const [isEnhancingPersona, setIsEnhancingPersona] = useState(false);
  const [interviewees, setInterviewees] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedInterviewee, setSelectedInterviewee] = useState(null);
  const [questionSets, setQuestionSets] = useState([]);
  const [questionError, setQuestionError] = useState("");
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "saving" | "saved" | "error" | ""
  const [personaOutput, setPersonaOutput] = useState("");
  const [personaStatus, setPersonaStatus] = useState(""); // "generating" | "ready" | "error" | ""
  const [personaError, setPersonaError] = useState("");
  const transcriptRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    gender: "",
    age: "",
    location: "",
    relationship_status: "",
    title: "",
    education: "",
  });

  const fetchPersonas = async () => {
    try {
      const res = await fetch(`/api/personas?projectId=${projectId}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setPersonas(data.data);
        if (data.data.length > 0) {
          setActivePersona(data.data[0]);
        }
      }
    } catch (err) {
      console.error("PERSONA FETCH ERROR:", err);
    }
  };

  const fetchInterviewees = async (personaId) => {
    try {
      const res = await fetch(`/api/interviewees?personaId=${personaId}`);
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setInterviewees(data.data);
      }
    } catch (err) {
      console.error("INTERVIEWEE FETCH ERROR:", err);
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

  const fetchEnhancedPersonaDescription = async (persona) => {
    if (!persona) return;

    setIsEnhancingPersona(true);
    setEnhancedPersonaDescription(persona.persona_description || "");

    try {
      const res = await fetch("/api/enhance-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_description: projectDescription || "Project context not provided",
          persona_title: persona.persona_name,
          persona_description: persona.persona_description || "",
        }),
      });

      const data = await res.json();
      if (data?.success && data?.data?.persona_description) {
        setEnhancedPersonaDescription(data.data.persona_description);
      }
    } catch (err) {
      console.error("ENHANCE PERSONA ERROR:", err);
    } finally {
      setIsEnhancingPersona(false);
    }
  };

  const fetchQuestionSets = async (intervieweeId) => {
    if (!intervieweeId) {
      setQuestionSets([]);
      return;
    }

    setIsLoadingQuestions(true);
    setQuestionError("");

    try {
      const res = await fetch(`/api/generate-questions?intervieweeId=${intervieweeId}`);
      const data = await res.json();

      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to load questions");
      }

      setQuestionSets(data?.data?.history || []);
    } catch (err) {
      setQuestionError(err.message || "Failed to load questions");
      setQuestionSets([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

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
          description: projectDescription || "Project context not provided",
          user_group: activePersona.persona_name,
          persona_description: enhancedPersonaDescription || activePersona.persona_description || "",
        }),
      });

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to generate questions");
      }

      if (selectedInterviewee?.interviewee_id) {
        await fetchQuestionSets(selectedInterviewee.interviewee_id);
      }
    } catch (err) {
      setQuestionError(err.message || "Failed to generate questions");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const generatePersonaForInterview = async (interviewId, transcriptText) => {
    setPersonaStatus("generating");
    setPersonaError("");

    try {
      const res = await fetch("/api/generate-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, transcript: transcriptText }),
      });

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to generate persona");
      }

      setPersonaOutput(data?.data?.persona_output || "");
      setPersonaStatus("ready");
    } catch (err) {
      setPersonaStatus("error");
      setPersonaError(err.message || "Failed to generate persona");
    }
  };

  useEffect(() => {
    fetchPersonas();
    fetchProject();
  }, []);

  useEffect(() => {
    if (activePersona) {
      fetchInterviewees(activePersona.persona_id);
      setSelectedInterviewee(null);
      setQuestionSets([]);
      setQuestionError("");
    }
  }, [activePersona]);

  useEffect(() => {
    if (activePersona) {
      fetchEnhancedPersonaDescription(activePersona);
    }
  }, [activePersona, projectDescription]);

  useEffect(() => {
    if (selectedInterviewee?.interviewee_id) {
      fetchQuestionSets(selectedInterviewee.interviewee_id);
      return;
    }

    setQuestionSets([]);
    setQuestionError("");
  }, [selectedInterviewee]);

  useEffect(() => {
    setTranscript(questionSets[0]?.transcript || "");
    setPersonaOutput(questionSets[0]?.personaOutput || "");
    setPersonaError("");
    setPersonaStatus("");
    setSaveStatus("");
  }, [selectedInterviewee?.interviewee_id, questionSets[0]?.interviewId]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.style.height = "auto";
    transcriptRef.current.style.height = `${Math.max(transcriptRef.current.scrollHeight, 240)}px`;
  }, [transcript]);

  const handleAddInterviewee = async () => {
    const res = await fetch("/api/interviewees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: activePersona.persona_id,
        ...form,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setShowForm(false);
      setForm({
        name: "",
        gender: "",
        age: "",
        location: "",
        relationship_status: "",
        title: "",
        education: "",
      });
      fetchInterviewees(activePersona.persona_id);
    }
  };

  const handleDeleteInterviewee = async (interviewee) => {
    const confirmed = window.confirm(`Delete interviewee \"${interviewee.name}\"? This will remove their question sets and transcript.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/interviewees?intervieweeId=${interviewee.interviewee_id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to delete interviewee");
      }

      setInterviewees((prev) => prev.filter((item) => item.interviewee_id !== interviewee.interviewee_id));

      if (selectedInterviewee?.interviewee_id === interviewee.interviewee_id) {
        setSelectedInterviewee(null);
        setQuestionSets([]);
        setTranscript("");
        setSaveStatus("");
      }
    } catch (error) {
      alert(error.message || "Failed to delete interviewee");
    }
  };

  const downloadPersonaReport = async () => {
    if (!personaOutput?.trim()) return;

    const latestSet = questionSets[0] || null;
    const generatedOn = latestSet?.createdAt
      ? new Date(latestSet.createdAt).toLocaleString()
      : new Date().toLocaleString();

    const extractSectionBullets = (fullText, headingPattern) => {
      const regex = new RegExp(
        `(?:^|\\n)\\s*(?:\\*\\*)?${headingPattern}(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?[A-Za-z][^\\n]{0,80}(?:\\*\\*)?\\s*:?\\s*(?:\\n|$)|$)`,
        "i"
      );
      const match = fullText.match(regex);
      if (!match?.[1]) return [];

      return match[1]
        .split("\n")
        .map((line) => line.replace(/^\s*[-*\u2022\d]+[.)-]?\s*/, "").trim())
        .filter(Boolean);
    };

    const motivationBullets = extractSectionBullets(personaOutput, "Motivations?");
    const frustrationBullets = extractSectionBullets(personaOutput, "Frustrations?");
    const goalsBullets = extractSectionBullets(personaOutput, "Goals");
    const expectationsBullets = extractSectionBullets(personaOutput, "Expectations?");
    const experienceBullets = extractSectionBullets(personaOutput, "Previous\\s+Experience");

    const bulletParagraphs = (items) =>
      items.length
        ? items.map(
            (item) =>
              new Paragraph({
                text: item,
                bullet: { level: 0 },
                spacing: { after: 120 },
              })
          )
        : [new Paragraph({ text: "-", spacing: { after: 120 } })];

    const questionParagraphs = (latestSet?.questions || []).length
      ? latestSet.questions.map(
          (q, idx) =>
            new Paragraph({
              text: `${idx + 1}. ${q}`,
              spacing: { after: 120 },
            })
        )
      : [new Paragraph({ text: "-", spacing: { after: 120 } })];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "NEUROX Persona Report", bold: true, size: 34 })],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated On: ${generatedOn}`, italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

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

            new Paragraph({ text: "Interview Context", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
            new Paragraph({ text: `Interview ID: ${latestSet?.interviewId || "-"}`, spacing: { after: 120 } }),
            new Paragraph({ text: `Question Set Created: ${generatedOn}`, spacing: { after: 240 } }),

            new Paragraph({ text: "Generated Questions", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
            ...questionParagraphs,
            new Paragraph({ text: "", spacing: { after: 120 } }),

            new Paragraph({ text: "Transcript", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
            new Paragraph({ text: transcript?.trim() || "-", spacing: { after: 300 } }),

            new Paragraph({ text: "Persona Output Summary", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
            new Paragraph({ text: "Goals", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
            ...bulletParagraphs(goalsBullets),
            new Paragraph({ text: "Motivations", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
            ...bulletParagraphs(motivationBullets),
            new Paragraph({ text: "Frustrations", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
            ...bulletParagraphs(frustrationBullets),
            new Paragraph({ text: "Previous Experience", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
            ...bulletParagraphs(experienceBullets),
            new Paragraph({ text: "Expectations", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
            ...bulletParagraphs(expectationsBullets),

            new Paragraph({ text: "Raw Persona Output", heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
            new Paragraph({ text: personaOutput.trim(), spacing: { after: 120 } }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);

    const safeName = (selectedInterviewee?.name || "interviewee")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    saveAs(blob, `persona-report-${safeName || "interviewee"}.docx`);
  };

  return (
    <div className="p-8 bg-white min-h-screen">

      {/* Persona Tabs */}
      <div className="mb-4 border-b border-gray-200 pb-2">
        <div className="flex gap-2">
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
          <div className="group relative mt-3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white/85 px-5 py-5 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-indigo-50/40 via-transparent to-transparent" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-100/35 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 top-0 h-px w-28 bg-white/80" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white transition duration-300 group-hover:scale-105">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Persona Context</p>
                    <p className="mt-0.5 text-base font-semibold text-gray-900">{activePersona.persona_name}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-xs font-semibold text-green-600 transition duration-300 group-hover:shadow-sm group-hover:shadow-green-100">
                <span className={`h-2 w-2 rounded-full ${isEnhancingPersona ? "bg-indigo-500 animate-pulse" : "bg-green-500"}`} />
                {isEnhancingPersona ? "Enhancing with AI" : "Enhanced"}
              </div>
            </div>

            <p className={`relative mt-4 rounded-xl border border-gray-200 border-l-4 border-l-indigo-400 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-800 break-words transition-opacity duration-300 ${isEnhancingPersona ? "opacity-90" : "opacity-100"}`}>
              {enhancedPersonaDescription || activePersona.persona_description}
            </p>
          </div>
        )}
      </div>

      {/* Interviewee Tabs + Plus Button */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto flex-wrap">
        {interviewees.map((i) => (
          <div key={i.interviewee_id} className="relative">
            <button
              onClick={() => {
                if (selectedInterviewee?.interviewee_id === i.interviewee_id) {
                  setSelectedInterviewee(null);
                } else {
                  setSelectedInterviewee(i);
                }
              }}
              className={`px-4 pr-10 py-2 rounded-t-md whitespace-nowrap text-sm font-medium transition ${
                selectedInterviewee?.interviewee_id === i.interviewee_id
                  ? "bg-indigo-500 text-white shadow"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {i.name}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteInterviewee(i);
              }}
              title="Delete interviewee"
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition ${
                selectedInterviewee?.interviewee_id === i.interviewee_id
                  ? "text-white/80 hover:text-white hover:bg-white/20"
                  : "text-gray-500 hover:text-red-600 hover:bg-red-50"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            setShowForm(!showForm);
            setSelectedInterviewee(null);
          }}
          className="ml-2 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-xl font-semibold shadow-sm transition"
        >
          +
        </button>
      </div>

      {/* ✅ INLINE FORM - replaces modal, appears below + button */}
      {showForm && (
        <div className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
          <h3 className="font-semibold text-base mb-4 text-gray-800">Add Interviewee</h3>

          <div className="grid grid-cols-2 gap-3">
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
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <input
                  placeholder={`Enter ${label.toLowerCase()}`}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddInterviewee}
              className="px-5 py-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setForm({
                  name: "",
                  gender: "",
                  age: "",
                  location: "",
                  relationship_status: "",
                  title: "",
                  education: "",
                });
              }}
              className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Interviewee Details */}
      {selectedInterviewee && (
        <div className="mt-6 relative rounded-xl border border-gray-200 bg-white/80 p-4 backdrop-blur-sm">
          {/* Close Button */}
          <button
            onClick={() => setSelectedInterviewee(null)}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-indigo-50/60 to-white px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2 pr-8 text-sm leading-snug">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
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
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              { label: "Gender", value: selectedInterviewee.gender },
              { label: "Education", value: selectedInterviewee.education },
              { label: "Title", value: selectedInterviewee.title },
              { label: "Relationship", value: selectedInterviewee.relationship_status },
              { label: "Age", value: selectedInterviewee.age ? `${selectedInterviewee.age}` : "" },
              { label: "Location", value: selectedInterviewee.location },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-1 text-sm leading-snug">
                <span className="text-gray-400">{item.label}</span>
                <span className="font-medium text-gray-800">
                  {item.value || <span className="italic text-gray-400">Not set</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions */}
      {selectedInterviewee && (
        <div className="mt-8 max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Interview Flow</p>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">Question Guide</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
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
                  : questionSets.length > 0
                    ? "Regenerate Questions"
                    : "Generate Questions"}
              </button>
            </div>

            {questionError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{questionError}</p>
            )}

            {isLoadingQuestions ? (
              <p className="mt-5 text-sm text-gray-500">Loading question history...</p>
            ) : questionSets.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No questions generated yet for this persona member.</p>
            ) : (
              <>
                <div className="mt-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Latest Set</p>
                    <p className="text-xs text-gray-500">{questionSets[0].questions.length} prompts</p>
                  </div>

                  <div className="space-y-3">
                    {questionSets[0].questions.map((q, index) => (
                      <div
                        key={`${questionSets[0].interviewId}-${index}`}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                      >
                        <div className="flex gap-4">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                            Q{index + 1}
                          </div>
                          <p className="pt-1 text-sm font-medium leading-6 text-gray-800">{q}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Your Answers</p>
                    <h4 className="mt-2 text-lg font-semibold text-gray-900">Structured Transcript</h4>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Write one continuous transcript using the question numbers so your notes stay easy to review.
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      ref={transcriptRef}
                      value={transcript}
                      onChange={(e) => { setTranscript(e.target.value); setSaveStatus(""); }}
                      onBlur={async () => {
                        const interviewId = questionSets[0]?.interviewId;
                        if (!interviewId) return;
                        setSaveStatus("saving");
                        try {
                          const res = await fetch("/api/generate-questions", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ interviewId, transcript }),
                          });
                          const data = await res.json();
                          if (!data?.success) {
                            throw new Error(data?.error?.message || "Failed to save transcript");
                          }

                          setSaveStatus("saved");

                          if (transcript.trim()) {
                            await generatePersonaForInterview(interviewId, transcript);
                          } else {
                            setPersonaOutput("");
                            setPersonaStatus("");
                            setPersonaError("");
                          }
                        } catch {
                          setSaveStatus("error");
                        }
                      }}
                      placeholder={"Write your answers like:\nQ1: ...\nQ2: ...\nQ3: ..."}
                      className="min-h-[240px] w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-4 font-mono text-sm leading-7 text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    {saveStatus && (
                      <p className={`mt-1.5 text-right text-xs ${
                        saveStatus === "saving" ? "text-gray-400" :
                        saveStatus === "saved" ? "text-emerald-600" :
                        "text-red-500"
                      }`}>
                        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : "Failed to save"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">User Persona Output</p>
                      <h4 className="mt-2 text-lg font-semibold text-gray-900">Interview-based Persona</h4>
                    </div>
                    <p className={`text-xs ${
                      personaStatus === "generating"
                        ? "text-gray-500"
                        : personaStatus === "ready"
                          ? "text-emerald-600"
                          : personaStatus === "error"
                            ? "text-red-600"
                            : "text-gray-400"
                    }`}>
                      {personaStatus === "generating"
                        ? "Generating persona..."
                        : personaStatus === "ready"
                          ? "Persona updated"
                          : personaStatus === "error"
                            ? "Generation failed"
                            : "Save transcript to generate"}
                    </p>
                  </div>

                  {personaError && (
                    <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {personaError}
                    </p>
                  )}

                  <div className="rounded-xl border border-gray-300 bg-white px-4 py-4 text-sm leading-7 text-gray-800 shadow-sm whitespace-pre-wrap">
                    {personaOutput || "No persona output generated yet for this interview."}
                  </div>

                  {personaOutput?.trim() && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={downloadPersonaReport}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        Download Persona Report
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/view-persona?projectId=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(projectName)}`
                          )
                        }
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                      >
                        Open View Persona Page
                      </button>
                    </div>
                  )}
                </div>

                {questionSets.length > 1 && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Previous Sets</p>
                    <div className="space-y-3">
                      {questionSets.slice(1).map((setItem) => (
                        <div key={setItem.interviewId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                          <p className="mb-3 text-xs text-gray-500">
                            {new Date(setItem.createdAt).toLocaleString()}
                          </p>
                          <div className="space-y-2">
                            {setItem.questions.map((q, idx) => (
                              <div key={`${setItem.interviewId}-${idx}`} className="flex gap-3 text-sm text-gray-700">
                                <span className="min-w-8 font-semibold text-gray-500">Q{idx + 1}</span>
                                <span className="leading-6">{q}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}