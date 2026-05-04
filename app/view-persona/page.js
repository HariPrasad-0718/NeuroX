"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ===========================
   SAFE PARSER (UPDATED)
=========================== */
function parsePersonaOutput(rawOutput, fallbackName) {
  const normalized = String(rawOutput || "").replace(/\r\n/g, "\n").trim();

  const getHeadingBlock = (text, heading) => {
    const regex = new RegExp(
      `${heading}:?\\s*([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`,
      "i"
    );
    return text.match(regex)?.[1]?.trim() || "";
  };

  const getBullets = (block) => {
    if (!block) return [];
    return block
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  };

  return {
    name: fallbackName || "Persona",
    says: getBullets(getHeadingBlock(normalized, "Says")),
    thinks: getBullets(getHeadingBlock(normalized, "Thinks")),
    does: getBullets(getHeadingBlock(normalized, "Does")),
    feels: getBullets(getHeadingBlock(normalized, "Feels")),
  };
}

export default function ViewPersonaPage() {
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
          intervieweeId: row.interviewee_id,
          intervieweeName: row.interviewee_name,
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
  const fetchSummary = async () => {
    if (!activeInterviewee) return;

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

// remove JSON wrapper if present
if (cleanText.includes("summary_output")) {
  try {
    const parsed = JSON.parse(cleanText);
    cleanText = parsed.summary_output || cleanText;
  } catch {}
}

// convert \n → real line breaks
cleanText = cleanText.replace(/\\n/g, "\n");

// 🔥 SPLIT SUMMARY & INSIGHTS
let summaryPart = "";
let insightsPart = [];

const parts = cleanText.split(/Key Insights:/i);

summaryPart = parts[0]?.replace(/User Summary:/i, "").trim();

if (parts[1]) {
  insightsPart = parts[1]
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.\s]+/, "").trim())
    .filter(Boolean);
}

setSummary(summaryPart);
setInsights(insightsPart);
    } catch (err) {
      setSummary("Failed to load summary");
    }

    setLoadingSummary(false);
  };

  fetchSummary();
}, [activeInterviewee]); // ✅ key fix

  const safeList = (arr) => (Array.isArray(arr) && arr.length ? arr : ["No data"]);

  return (
    <div className="page">
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


        <div className="summary-box">
  {loadingSummary ? (
    <p>Loading summary...</p>
  ) : (
    <p>{summary}</p>
  )}
</div>
  

          {/* EMPATHY MAP */}
          {activeInterviewee && (
            <div className="empathy-map">

              <div className="center">
  <div className="avatar">
    <span className="avatar-text">
      {activeInterviewee.parsed.name}
    </span>
  </div>
</div>

              <div className="quadrant says">
                <h3>SAYS</h3>
                  <div className="cards">

                {safeList(activeInterviewee.parsed.says).map((t, i) => (
                  <div key={i} className="note">{t}</div>
                ))}
                </div>
              </div>

              <div className="quadrant thinks">
                <h3>THINKS</h3>
                  <div className="cards">

                {safeList(activeInterviewee.parsed.thinks).map((t, i) => (
                  <div key={i} className="note">{t}</div>
                ))}
                </div>
              </div>

              <div className="quadrant does">
                <h3>DOES</h3>
                  <div className="cards">

                {safeList(activeInterviewee.parsed.does).map((t, i) => (
                  <div key={i} className="note">{t}</div>
                ))}
                </div>
              </div>

              <div className="quadrant feels">
                <h3>FEELS</h3>
                  <div className="cards">

                {safeList(activeInterviewee.parsed.feels).map((t, i) => (
                  <div key={i} className="note">{t}</div>
                ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
      {insights.length > 0 && (
  <div className="summary-box">
    <h3>Key Insights</h3>

    {insights.map((item, i) => (
      <p key={i}>• {item}</p>
    ))}
  </div>
)}
      <style jsx>{`

      .page-title {
  font-size: 28px;      /* 🔥 bigger heading */
  font-weight: 700;
  margin-bottom: 20px;
}

.page {
  padding: 10px 10px;   /* 🔥 space under heading */
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
  background: #f9fafb;
  border-left: 4px solid #7c3aed;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

/* Hover */
.tab:hover {
  background: #e5e7eb;
}

/* Active tab (VIOLET THEME) */
.tab.active {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  font-weight: 600;
  box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
}
  
       .empathy-map {
  position: relative;
  width: 100%;
  min-height: 700px;
  background: #f9fafb;
  margin-top: 20px;
  border: 2px solid #ddd;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 30px;
  padding: 50px;
  box-sizing: border-box;
}

/* CENTER CIRCLE */
.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  z-index: 5;
  text-align: center;
  padding: 10px;
}
  .persona-desc {
  margin-top: 10px;
  font-size: 13px;
  color: #444;
  max-width: 250px;
  line-height: 1.4;
  text-align: center;
}

/* CROSS LINES */
.empathy-map::before,
.empathy-map::after {
  content: "";
  position: absolute;
  background: #bbb;
  z-index: 1;
}

.empathy-map::before {
  width: 2px;
  height: 100%;
  left: 50%;
  top: 0;
}

.empathy-map::after {
  height: 2px;
  width: 100%;
  top: 50%;
  left: 0;
}

/* QUADRANTS */
.quadrant {
  padding: 10px;
  display: flex;
  flex-direction: column;
}

/* 🔥 CENTERED HEADINGS */
.quadrant h3 {
  text-align: center;
  font-weight: bold;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

/* GRID POSITIONS */
.says { grid-column: 1; grid-row: 1; }
.thinks { grid-column: 2; grid-row: 1; }
.does { grid-column: 1; grid-row: 2; }
.feels { grid-column: 2; grid-row: 2; }

/* 🔥 HORIZONTAL CARD LAYOUT */
.quadrant {
  display: flex;
  flex-direction: column;
}

.quadrant > div {
  display: flex;
  flex-wrap: wrap;   /* allows wrapping */
  gap: 10px;
}

/* NOTE CARDS */
.note {
  padding: 10px 14px;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  max-width: 130px;
  flex: 0 0 auto;

  /* ✨ LIGHT SHADOW */
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);

  /* ✨ SMOOTH TRANSITION */
  transition: all 0.25s ease;
  cursor: pointer;
}

.note:hover {
  transform: translateY(-4px) scale(1.02);

  /* stronger shadow on hover */
  box-shadow: 0 8px 18px rgba(0,0,0,0.25);

  /* optional glow effect */
  filter: brightness(1.05);
}

/* COLORS */
.says .note {
  background: #894bf4;
}

.thinks .note {
  background: #c0c4cb;
  color:black;
}

.does .note {
  // background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  background: #c0c4cb;;
  color:black;
}

.feels .note {
  background: #894bf4;
}
  .cards {
  display: flex;
  flex-wrap: wrap;   /* allows horizontal flow */
  gap: 10px;
}
      `}</style>
    </div>
  );
}

