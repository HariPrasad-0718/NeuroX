"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { generatePersonaCard } from "@/services/personaService";
import { generateInformationArchitecture } from "@/services/informationArchitectureService";
import { useProgressSteps } from "@/hooks/useProgressSteps";

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/\n|,/)
    .map((line) => line.replace(/^\s*[-*•\d]+[.)-]?\s*/, "").trim())
    .filter(Boolean);
}

function parseDemographics(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;

  const obj = {};
  String(value)
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (!key || !rest.length) return;
      obj[key.trim()] = rest.join(":").trim();
    });

  return obj;
}

function parseHeaderText(rawHeader, fallbackName) {
  const lines = String(rawHeader || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let name = "";
  let role = "";
  let quote = "";

  lines.forEach((line) => {
    if (/^(persona\s*)?name\s*:/i.test(line)) {
      name = line.replace(/.*?:\s*/, "").trim();
      return;
    }
    if (/^(role|title)\s*:/i.test(line)) {
      role = line.replace(/.*?:\s*/, "").trim();
      return;
    }
    if (/^quote\s*:/i.test(line)) {
      quote = line.replace(/.*?:\s*/, "").replace(/["“”]/g, "").trim();
      return;
    }
    if (!quote && (line.includes('"') || line.includes("“"))) {
      quote = line.replace(/["“”]/g, "").trim();
    }
  });

  if (!name && lines.length) {
    name = lines[0].replace(/.*?:\s*/, "").trim();
  }

  return {
    name: name || fallbackName || "Persona",
    role,
    quote,
  };
}

function parseThemeLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeAgentCard(raw = {}) {
  return {
    header: raw.header || raw.HEADER || "",
    name: raw.name || raw.NAME || "",
    quote: raw.quote || raw.QUOTE || "",
    background: raw.background || raw.BACKGROUND || "",
    scenario: raw.scenario || raw.SCENARIO || "",
    demographics: raw.demographics || raw.DEMOGRAPHICS || "",
    personality: raw.personality || raw.PERSONALITY || [],
    behaviours: raw.behaviours || raw["BEHAVIOURS & HABITS"] || [],
    goals: raw.goals || raw.GOALS || [],
    frustrations: raw.frustrations || raw.FRUSTRATIONS || [],
    motivations: raw.motivations || raw.MOTIVATIONS || [],
    previousExperience: raw.previousExperience || raw["PREVIOUS EXPERIENCE"] || [],
    positiveThemes: raw.positiveThemes || raw["POSITIVE THEMES"] || [],
    negativeThemes: raw.negativeThemes || raw["NEGATIVE THEMES"] || [],
    needs: raw.needs || raw["NEEDS & EXPECTATIONS"] || [],
    problemStatement:
      raw.problemStatement ||
      raw.problem_statement ||
      raw["PROBLEM STATEMENT"] ||
      "",
  };
}

function buildPersonaContext(persona, fallbackProjectName) {
  const validOutputs = (persona.outputs || []).filter((output) => {
    const summary = String(output.summary || "").trim();
    const outcome = String(output.interviewOutcome || "").trim();
    const personaOutput = String(output.personaOutput || "").trim();

    const hasSummary = summary && summary.toLowerCase() !== "no summary available";
    const hasOutcome =
      outcome &&
      outcome.toLowerCase() !== "no outcome available" &&
      outcome.toLowerCase() !== "no interview outcome available";
    const hasPersonaOutput =
      personaOutput && personaOutput.toLowerCase() !== "no persona output available";

    const hasDemographics = Boolean(
      output.demographics?.gender ||
        output.demographics?.age !== undefined ||
        output.demographics?.location ||
        output.demographics?.relationshipStatus ||
        output.demographics?.title ||
        output.demographics?.education
    );

    return hasSummary && hasOutcome && hasPersonaOutput && hasDemographics;
  });

  return `Persona ID: ${persona.personaId}
Persona Name: ${persona.personaName}
Project Name: ${persona.projectName || fallbackProjectName || ""}
Project Description: ${persona.projectDescription || ""}
Persona Outputs:
${validOutputs.length
  ? validOutputs
  .map((output, index) => {
    const createdAt = output.generatedAt ? new Date(output.generatedAt).toISOString() : "";
    const metadata = [
      `Output ${index + 1}`,
      output.interviewId ? `Interview ID: ${output.interviewId}` : "",
      output.intervieweeId ? `Interviewee ID: ${output.intervieweeId}` : "",
      output.intervieweeName ? `Interviewee Name: ${output.intervieweeName}` : "",
      createdAt ? `Generated At: ${createdAt}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const demographicsText = [
      output.demographics?.gender ? `Gender: ${output.demographics.gender}` : "",
      output.demographics?.age !== undefined && output.demographics?.age !== null
        ? `Age: ${output.demographics.age}`
        : "",
      output.demographics?.location ? `Location: ${output.demographics.location}` : "",
      output.demographics?.relationshipStatus
        ? `Relationship Status: ${output.demographics.relationshipStatus}`
        : "",
      output.demographics?.title ? `Title: ${output.demographics.title}` : "",
      output.demographics?.education ? `Education: ${output.demographics.education}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `${metadata}
${demographicsText ? `${demographicsText}\n` : ""}
Summary:
${output.summary || "No summary available"}

Interview Outcome:
${output.interviewOutcome || "No interview outcome available"}

Persona Output:
${output.personaOutput || "No persona output available"}`;
  })
  .join("\n\n")
  : "No valid interview details available."}`;
}

function CardBox({ title, borderColor, bgColor, titleColor, children }) {
  return (
    <div style={{ borderRadius: 12, padding: 16, border: `1px solid ${borderColor}`, background: bgColor }}>
      <h4
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: titleColor,
          margin: "0 0 10px 0",
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function AgentPersonaCard({ card, personaName }) {
  const header = parseHeaderText(card.header, card.name || personaName);
  const name = header.name || personaName || "Persona";
  const role = header.role || parseDemographics(card.demographics).Role || "";
  const quote = header.quote || card.quote || "";

  const demographics = parseDemographics(card.demographics);
  const personality = toList(card.personality);
  const behaviours = toList(card.behaviours);
  const goals = toList(card.goals);
  const frustrations = toList(card.frustrations);
  const motivations = toList(card.motivations);
  const previousExperience = toList(card.previousExperience);
  const positiveThemes = parseThemeLines(card.positiveThemes);
  const negativeThemes = parseThemeLines(card.negativeThemes);
  const needs = toList(card.needs);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const needIcons = ["📋", "🗺️", "🔔", "📊", "🤖", "📱", "⚙️", "💡", "🎯", "✨"];

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,0.12)" }}>
      <div
        style={{
          background: "#1a1a2e",
          color: "white",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: "#4a00e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
              color: "white",
              border: "3px solid rgba(255,255,255,0.25)",
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 3 }}>{role || personaName || ""}</div>
          </div>
        </div>
        {quote ? (
          <div
            style={{
              flex: 1,
              fontSize: 15,
              fontStyle: "italic",
              color: "#c9b8ff",
              borderLeft: "3px solid #4a00e0",
              paddingLeft: 18,
              lineHeight: 1.7,
              minWidth: 200,
            }}
          >
            &ldquo;{quote}&rdquo;
          </div>
        ) : null}
      </div>

      <div style={{ background: "white", display: "grid", gridTemplateColumns: "230px 1fr" }}>
        <div
          style={{
            background: "#fafafa",
            borderRight: "1px solid #eee",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "#4a00e0", textTransform: "uppercase", margin: "0 0 10px 0" }}>
              👤 Demographics
            </h4>
            {Object.keys(demographics).length ? (
              Object.entries(demographics).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 13 }}>
                  <span style={{ color: "#666", width: 80, flexShrink: 0, fontSize: 12 }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{String(v)}</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: "#999" }}>—</p>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", margin: 0 }} />
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "#4a00e0", textTransform: "uppercase", margin: "0 0 10px 0" }}>
              🧠 Personality
            </h4>
            {personality.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {personality.map((item, i) => (
                  <li key={`p-${i}`} style={{ fontSize: 13, display: "flex", gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "#4a00e0", fontSize: 18, lineHeight: 1 }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", margin: 0 }} />
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "#4a00e0", textTransform: "uppercase", margin: "0 0 10px 0" }}>
              📊 Behaviours &amp; Habits
            </h4>
            {behaviours.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {behaviours.map((item, i) => (
                  <li key={`b-${i}`} style={{ fontSize: 13, display: "flex", gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "#4a00e0", fontSize: 18, lineHeight: 1 }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <CardBox title="📄 Background" borderColor="#d1c4e9" bgColor="#faf8ff" titleColor="#4a00e0">
              <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{card.background || "—"}</p>
            </CardBox>
            <CardBox title="🎯 Scenario" borderColor="#bbdefb" bgColor="#f5faff" titleColor="#1565c0">
              <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{card.scenario || "—"}</p>
            </CardBox>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <CardBox title="✅ Goals" borderColor="#c8e6c9" bgColor="#f9fff9" titleColor="#2e7d32">
              {goals.length ? goals.map((g, i) => <p key={`g-${i}`} style={{ fontSize: 13, margin: "0 0 6px 0" }}>✔ {g}</p>) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
            </CardBox>
            <CardBox title="⚠️ Frustrations" borderColor="#ffcdd2" bgColor="#fff9f9" titleColor="#c62828">
              {frustrations.length ? frustrations.map((f, i) => <p key={`f-${i}`} style={{ fontSize: 13, margin: "0 0 6px 0" }}>✖ {f}</p>) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
            </CardBox>
            <CardBox title="⭐ Motivations" borderColor="#fde68a" bgColor="#fffdf5" titleColor="#b45309">
              {motivations.length ? motivations.map((m, i) => <p key={`m-${i}`} style={{ fontSize: 13, margin: "0 0 6px 0" }}>★ {m}</p>) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
            </CardBox>
            <CardBox title="🕐 Previous Experience" borderColor="#bbdefb" bgColor="#f5faff" titleColor="#1565c0">
              {previousExperience.length ? previousExperience.map((p, i) => <p key={`pe-${i}`} style={{ fontSize: 13, margin: "0 0 6px 0" }}>● {p}</p>) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
            </CardBox>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <CardBox title="👍 Positive Themes" borderColor="#c8e6c9" bgColor="#f9fff9" titleColor="#2e7d32">
              {positiveThemes.length ? positiveThemes.map((line, i) => <p key={`pt-${i}`} style={{ fontSize: 13, margin: "0 0 6px 0" }}>✔ {line}</p>) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
            </CardBox>
            <CardBox title="👎 Negative Themes" borderColor="#ffcdd2" bgColor="#fff9f9" titleColor="#c62828">
              {negativeThemes.length ? negativeThemes.map((line, i) => <p key={`nt-${i}`} style={{ fontSize: 13, margin: "0 0 6px 0" }}>✔ {line}</p>) : <p style={{ fontSize: 13, color: "#999" }}>—</p>}
            </CardBox>
          </div>

          <CardBox title="💜 Needs & Expectations" borderColor="#d1c4e9" bgColor="#faf8ff" titleColor="#4a00e0">
            {needs.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {needs.map((n, i) => (
                  <div
                    key={`need-${i}`}
                    style={{
                      background: "#ede8ff",
                      color: "#4a00e0",
                      borderRadius: 12,
                      padding: "12px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: "center",
                      minWidth: 100,
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{needIcons[i % needIcons.length]}</div>
                    {n}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#999" }}>—</p>
            )}
          </CardBox>
        </div>
      </div>
    </div>
  );
}

export default function DefinePhasePage() {
  const { id: projectId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const { runProgressSteps } = useProgressSteps();
  const [generating, setGenerating] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [activeIntervieweeId, setActiveIntervieweeId] = useState(null);
  const [agentCardsByPersona, setAgentCardsByPersona] = useState({});
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [loadedFromDb, setLoadedFromDb] = useState(false);
  const [iaError, setIaError] = useState("");
  const [isGeneratingProcessFlow, setIsGeneratingProcessFlow] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchEmpathyData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/personas?projectId=${projectId}&aggregateGenerated=true`);
        const data = await res.json();
        if (!data.success) throw new Error(data?.error?.message || "Failed to fetch empathy data");

        const nextPersonas = data.data?.personas || [];
        setPersonas(nextPersonas);
        setProjectName(nextPersonas[0]?.projectName || "");
        setActivePersonaId(nextPersonas[0]?.personaId ?? null);
        setActiveIntervieweeId(nextPersonas[0]?.outputs?.[0]?.intervieweeId ?? null);

        // Check DB for already-generated persona cards
        const savedRes = await fetch(`/api/save-generated-persona?projectId=${projectId}`);
        const savedData = await savedRes.json();
        if (savedData.success && savedData.exists && savedData.personas?.length) {
          const cards = {};
          savedData.personas.forEach((card, i) => {
            const personaId = nextPersonas[i]?.personaId;
            if (personaId != null) cards[personaId] = normalizeAgentCard(card);
          });
          setAgentCardsByPersona(cards);
          setProblemStatement(savedData.problemStatement || "");
          setGenerated(true);
          setLoadedFromDb(true);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch empathy data");
      } finally {
        setLoading(false);
      }
    };

    fetchEmpathyData();
  }, [projectId]);

  const handleGenerate = async () => {
    if (!personas.length) {
      setError("No empathy phase data found. Complete the empathy phase first.");
      return;
    }

    setGenerating(true);
    setError("");
    setIaError("");

    try {
      const nextCards = {};
      let sharedProblemStatement = "";

      for (const persona of personas) {
        const personaContext = buildPersonaContext(persona, projectName);

        const { data } = await generatePersonaCard({ empathyDataAndContext: personaContext });
        if (!data.success) {
          throw new Error(data.error || `Agent failed for ${persona.personaName}`);
        }

        const normalizedCard = normalizeAgentCard(data.persona_card || {});

        if (!sharedProblemStatement && String(normalizedCard.problemStatement || "").trim()) {
          sharedProblemStatement = String(normalizedCard.problemStatement).trim();
        }

        nextCards[persona.personaId] = normalizedCard;
      }

      // Keep one canonical problem statement for this generation run.
      if (sharedProblemStatement) {
        Object.keys(nextCards).forEach((personaId) => {
          nextCards[personaId] = {
            ...nextCards[personaId],
            problemStatement: sharedProblemStatement,
          };
        });
      }

      setAgentCardsByPersona(nextCards);

      // ==========================================
// SAVE GENERATED DATA TO DATABASE
// ==========================================

await fetch("/api/save-generated-persona", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    projectId,

    problemStatement: sharedProblemStatement,

    personas: Object.values(nextCards).map((card) => ({
      personaName: card.name,

      demographics: card.demographics,

      background: card.background,

      scenario: card.scenario,

      personality: card.personality,

      behaviours: card.behaviours,

      goals: card.goals,

      frustrations: card.frustrations,

      motivations: card.motivations,

      previousExperience: card.previousExperience,

      positiveThemes: card.positiveThemes,

      negativeThemes: card.negativeThemes,

      needs: card.needs,

      generatedOutput: card,
    })),
  }),
});
      const current = nextCards[activePersonaId] || nextCards[personas[0]?.personaId] || {};
      const fallbackProblemStatement =
        current.problemStatement ||
        Object.values(nextCards).find((card) => String(card?.problemStatement || "").trim())?.problemStatement ||
        "";
      setProblemStatement(fallbackProblemStatement);
      setGenerated(true);

      // Update define progress to 50 → overall = empathize(100)+define(50) = 150/500 = 30%
      try {
        await fetch(`/api/projects/${projectId}/progress`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: "define", progress: 50 }),
        });
        window.dispatchEvent(new Event('neurox:progress-updated'));
      } catch (_) {}
    } catch (err) {
      setError(err.message || "Agent generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
  const input = document.getElementById("persona-card-download");

  if (!input) return;

  const canvas = await html2canvas(input, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

  pdf.save("persona-card.pdf");
};

  const handleGenerateInformationArchitecture = async () => {
    if (!projectId) {
      setIaError("Project ID is missing");
      return;
    }

    setIsGeneratingIA(true);
    setIaError("");

    try {
      const { data: agentData } = await generateInformationArchitecture({ projectId });

      if (!agentData?.success) {
        throw new Error(agentData?.error || "Information Architecture generation failed");
      }

      sessionStorage.setItem(
        "informationArchitectureData",
        JSON.stringify(agentData.information_architecture)
      );

      sessionStorage.setItem(
        "informationArchitecturePrompt",
        agentData?.information_architecture?.PROMPT || ""
      );

      sessionStorage.setItem(
        "informationArchitectureRawResponse",
        agentData?.information_architecture?.RAW_RESPONSE || ""
      );

      router.push(`/information-architecture?projectId=${projectId}`);
    } catch (err) {
      setIaError(err.message || "Failed to generate Information Architecture");
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const activePersonaGroup = useMemo(
    () => personas.find((p) => p.personaId === activePersonaId) || null,
    [personas, activePersonaId]
  );

  const activeAgentCard = useMemo(
    () => agentCardsByPersona?.[activePersonaId] || null,
    [agentCardsByPersona, activePersonaId]
  );

  useEffect(() => {
    if (!generated) return;
    const activeProblem = agentCardsByPersona?.[activePersonaId]?.problemStatement;
    const fallbackProblem = Object.values(agentCardsByPersona || {}).find((card) => String(card?.problemStatement || "").trim())?.problemStatement;
    const resolved = activeProblem || fallbackProblem || "";
    if (resolved) setProblemStatement(resolved);
  }, [generated, activePersonaId, agentCardsByPersona]);

  const hasAnyOutput = useMemo(
    () =>
      personas.some((p) =>
        (p.outputs || []).some(
          (o) => o.personaOutput && String(o.personaOutput) !== "No persona output available"
        )
      ),
    [personas]
  );

  const totalInterviewees = useMemo(
    () => personas.reduce((acc, p) => acc + (p.outputs?.length || 0), 0),
    [personas]
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7]" style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "10px" }}>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ minHeight: "calc(100vh - 20px)" }}>
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>

          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Define Phase</p>
            <h1 className="text-xl font-semibold text-gray-900 mt-0.5">Problem Definition</h1>
            {projectName ? <p className="text-sm text-gray-500 mt-0.5">{projectName}</p> : null}
          </div>

          {!loading && !loadedFromDb ? (
           <button
    onClick={handleGenerate}
    disabled={generating || !personas.length}
    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {generating ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating...
      </>
    ) : (
      <>
        <Sparkles className="w-4 h-4" />
        {generated ? "Regenerate" : "Generate Problem Definition"}
      </>
    )}
  </button>
          ) : null}
        </div>

        <div className="max-w-6xl mx-auto px-3 py-5 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading empathy phase data...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            {!hasAnyOutput && !generated ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>No persona outputs found.</strong> Complete the empathy phase interviews in the workspace to generate persona outputs before defining the problem statement.
                </p>
              </div>
            ) : null}

            {!generated ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #ede8ff, #d1c4e9)" }}>
                  <Sparkles className="w-7 h-7 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Ready to define the problem?</h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  Click <strong>Generate Problem Definition</strong> above to analyze empathy-phase data and generate the problem statement and persona card from Agent5i.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-700">
                  {personas.length} persona group{personas.length !== 1 ? "s" : ""} • {totalInterviewees} interviewee{totalInterviewees !== 1 ? "s" : ""} found
                </div>
              </div>
            ) : null}

            {generated ? (
              <div className="space-y-10">
                <section id="problem-definition-card">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Define Phase · AI-Generated</p>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">Problem Statement</h2>
                  </div>

                  <button
                    type="button"
                    aria-label="Go to Problem Statement Card"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.hash = "problem-definition-card";
                        // Optionally scroll into view for smooth UX
                        const el = document.getElementById("problem-definition-card");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      padding: 0,
                      width: "100%",
                      textAlign: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #1a1a2e, #2d1b69)",
                        padding: "32px 36px",
                        color: "white",
                        boxShadow: "0 8px 32px rgba(74,0,224,0.25)",
                        width: "100%",
                      }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#c9b8ff", marginBottom: 16 }}>
                        Problem Statement
                      </p>
                      {problemStatement ? (
                        <p style={{ fontSize: 18, lineHeight: 1.75, fontWeight: 500 }}>{problemStatement}</p>
                      ) : (
                        <p style={{ fontSize: 15, color: "#aaa", fontStyle: "italic" }}>
                          The agent did not return a problem statement for this persona.
                        </p>
                      )}
                    </div>
                  </button>
                </section>

                <section>
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Agent Persona Output</p>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">Persona Card</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Card details are rendered from the same Agent5i response.
                    </p>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                    {personas.map((persona) => (
                      <button
                        key={persona.personaId}
                        onClick={() => {
                          setActivePersonaId(persona.personaId);
                          setActiveIntervieweeId(persona.outputs?.[0]?.intervieweeId ?? null);
                        }}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          activePersonaId === persona.personaId
                            ? "bg-[#702dff] text-white shadow"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {persona.personaName}
                      </button>
                    ))}
                  </div>

                 {activeAgentCard ? (
  <div>
    <div id="persona-card-download">
      <AgentPersonaCard
        card={activeAgentCard}
        personaName={activePersonaGroup?.personaName || "Persona"}
      />
    </div>

    <div className="mt-5 flex justify-end gap-3">
      
      <button
  disabled={isGeneratingProcessFlow}
  onClick={() => {
    setIsGeneratingProcessFlow(true);

    router.push(
      `/process-flow?projectId=${encodeURIComponent(projectId)}`
    );
  }}
  className="px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 border border-[#702dff] text-[#702dff] hover:bg-[#702dff] hover:text-white hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
>
  {isGeneratingProcessFlow ? (
    <>
      <svg
        className="h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          className="opacity-75"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      Opening Process Flow...
    </>
  ) : (
    "Generate Process Flow"
  )}
</button>
      <button
  onClick={handleDownloadPDF}
  className="px-5 py-2.5 rounded-xl text-white font-semibold transition-all duration-200 cursor-pointer hover:scale-[1.02]"
  style={{
    background: "linear-gradient(135deg, #4a00e0, #702dff)",
    boxShadow: "0 4px 14px rgba(74,0,224,0.25)",
  }}
>
  Download PDF
</button>
    </div>
    {iaError ? (
      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{iaError}</p>
    ) : null}
  </div>
) : (
                    <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                      No agent persona card available for this persona.
                    </p>
                  )}
                </section>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
    </div>
  );
}
