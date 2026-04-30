"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function parsePersonaOutput(rawOutput, fallbackName) {
  const normalized = String(rawOutput || "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return {
      name: fallbackName || "Persona",
      quote: "",
      background: "No generated persona output is available yet.",
      goals: [],
      motivations: [],
      frustrations: [],
      previousExperience: [],
      expectations: [],
    };
  }

  const getHeadingBlock = (text, headingPattern) => {
    const regex = new RegExp(
      `(?:^|\\n)\\s*(?:\\*\\*)?${headingPattern}(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?[A-Za-z][^\\n]{0,80}(?:\\*\\*)?\\s*:?\\s*(?:\\n|$)|$)`,
      "i"
    );
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  const getBullets = (block) => {
    if (!block) return [];
    return block
      .split("\n")
      .map((line) => line.replace(/^\s*[-*\u2022\d]+[.)-]?\s*/, "").trim())
      .filter(Boolean);
  };

  const nameMatch = normalized.match(/(?:^|\\n)\s*(?:Name|Persona Name)\s*:\s*(.+)$/im);
  const quoteMatch = normalized.match(/"([^"]+)"/);

  const background =
    getHeadingBlock(normalized, "Background(?:\\s+Description)?") ||
    getHeadingBlock(normalized, "Description") ||
    "";

  return {
    name: (nameMatch?.[1] || fallbackName || "Persona").trim(),
    quote: (quoteMatch?.[1] || "").trim(),
    background: background || "No background description found.",
    goals: getBullets(getHeadingBlock(normalized, "Goals")),
    motivations: getBullets(getHeadingBlock(normalized, "Motivations?")),
    frustrations: getBullets(getHeadingBlock(normalized, "Frustrations?")),
    previousExperience: getBullets(getHeadingBlock(normalized, "Previous\\s+Experience")),
    expectations: getBullets(getHeadingBlock(normalized, "Expectations?")),
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
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPersonaCards = async () => {
      if (!projectId) {
        setError("projectId is required");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/personas?projectId=${projectId}&includeGenerated=true&groupByInterviewee=true`
        );
        const data = await res.json();

        if (!data?.success) {
          throw new Error(data?.error?.message || "Failed to load persona cards");
        }

        const groupsMap = new Map();

        for (const row of data?.data || []) {
          if (!groupsMap.has(row.persona_id)) {
            groupsMap.set(row.persona_id, {
              personaId: row.persona_id,
              personaName: row.persona_name,
              interviewees: [],
            });
          }

          if (row.interviewee_id) {
            groupsMap.get(row.persona_id).interviewees.push({
              intervieweeId: row.interviewee_id,
              intervieweeName: row.interviewee_name || `Interviewee ${row.interviewee_id}`,
              hasGeneratedOutput: Boolean((row.generated_output || "").trim()),
              demographics: {
                gender: row.gender || "-",
                age: row.age ?? "-",
                location: row.location || "-",
                relationshipStatus: row.relationship_status || "-",
                title: row.title || "-",
                education: row.education || "-",
              },
              parsed: parsePersonaOutput(
                row.generated_output || "",
                row.interviewee_name || row.persona_name
              ),
            });
          }
        }

        const groups = Array.from(groupsMap.values());

        setPersonaGroups(groups);
        const firstPersona = groups[0] || null;
        const firstInterviewee = firstPersona?.interviewees?.[0] || null;
        setActivePersonaId(firstPersona?.personaId || null);
        setActiveIntervieweeId(firstInterviewee?.intervieweeId || null);
      } catch (err) {
        setError(err.message || "Failed to load persona cards");
        setPersonaGroups([]);
        setActivePersonaId(null);
        setActiveIntervieweeId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonaCards();
  }, [projectId]);

  const activePersonaGroup = useMemo(
    () => personaGroups.find((group) => group.personaId === activePersonaId) || null,
    [personaGroups, activePersonaId]
  );

  const activeIntervieweeCard = useMemo(
    () =>
      activePersonaGroup?.interviewees?.find(
        (item) => item.intervieweeId === activeIntervieweeId
      ) || null,
    [activePersonaGroup, activeIntervieweeId]
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Empathize Stage</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">User Persona</h1>
            {projectName ? <p className="mt-1 text-sm text-gray-600">{projectName}</p> : null}
          </div>
          <button
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Back
          </button>
        </div>

        {isLoading ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading persona output...</p>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : personaGroups.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">No personas found for this project.</p>
        ) : (
          <>
            <div className="mb-4 border-b border-gray-200 pb-0 flex gap-2 flex-wrap">
              {personaGroups.map((group) => (
                <button
                  key={group.personaId}
                  onClick={() => {
                    setActivePersonaId(group.personaId);
                    setActiveIntervieweeId(group.interviewees?.[0]?.intervieweeId || null);
                  }}
                  className={`px-4 py-2 rounded-t-md text-sm font-medium transition ${
                    activePersonaId === group.personaId
                      ? "bg-indigo-500 text-white shadow"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {group.personaName}
                </button>
              ))}
            </div>

            <div className="mb-4 border-b border-gray-200 pb-0 flex gap-2 flex-wrap">
              {(activePersonaGroup?.interviewees || []).map((item) => (
                <button
                  key={item.intervieweeId}
                  onClick={() => setActiveIntervieweeId(item.intervieweeId)}
                  className={`px-4 py-2 rounded-t-md text-sm font-medium transition ${
                    activeIntervieweeId === item.intervieweeId
                      ? "bg-indigo-500 text-white shadow"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {item.intervieweeName}
                </button>
              ))}
            </div>

            {!activeIntervieweeCard ? (
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-700">
                No interviewees found for this persona.
              </p>
            ) : !activeIntervieweeCard?.hasGeneratedOutput ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                No persona output available for <b>{activeIntervieweeCard?.intervieweeName}</b> yet. Complete the interview transcript in the workspace to generate it.
              </p>
            ) : (
              <div className="persona-container">
                <div className="persona-sidebar">
                  <div className="persona-avatar" />

                  <div className="persona-section-title">Demographics</div>
                  <p><b>Gender:</b> {activeIntervieweeCard.demographics.gender}</p>
                  <p><b>Age:</b> {activeIntervieweeCard.demographics.age}</p>
                  <p><b>Location:</b> {activeIntervieweeCard.demographics.location}</p>
                  <p><b>Relationship Status:</b> {activeIntervieweeCard.demographics.relationshipStatus}</p>
                  <p><b>Title:</b> {activeIntervieweeCard.demographics.title}</p>
                  <p><b>Education:</b> {activeIntervieweeCard.demographics.education}</p>

                  <div className="persona-section-title">Goals</div>
                  <ul>
                    {(activeIntervieweeCard.parsed.goals.length
                      ? activeIntervieweeCard.parsed.goals
                      : ["No goals extracted yet."]
                    ).map((item, idx) => (
                      <li key={`goal-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="persona-main">
                  <div className="persona-header">
                    <h1>Name: {activeIntervieweeCard.parsed.name}</h1>
                    <div className="persona-quote">
                      {activeIntervieweeCard.parsed.quote
                        ? `"${activeIntervieweeCard.parsed.quote}"`
                        : "No quote available."}
                    </div>
                  </div>

                  <div className="persona-content">
                    <div className="persona-grid-2">
                      <div className="persona-block">
                        <h3>Motivations</h3>
                        <ul>
                          {(activeIntervieweeCard.parsed.motivations.length
                            ? activeIntervieweeCard.parsed.motivations
                            : ["No motivations extracted yet."]
                          ).map((item, idx) => (
                            <li key={`mot-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="persona-block">
                        <h3>Frustrations</h3>
                        <ul>
                          {(activeIntervieweeCard.parsed.frustrations.length
                            ? activeIntervieweeCard.parsed.frustrations
                            : ["No frustrations extracted yet."]
                          ).map((item, idx) => (
                            <li key={`fr-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="persona-grid-2">
                      <div className="persona-block">
                        <h3>Previous Experience</h3>
                        <ul>
                          {(activeIntervieweeCard.parsed.previousExperience.length
                            ? activeIntervieweeCard.parsed.previousExperience
                            : ["No previous experience extracted yet."]
                          ).map((item, idx) => (
                            <li key={`px-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="persona-block">
                        <h3>Expectations</h3>
                        <ul>
                          {(activeIntervieweeCard.parsed.expectations.length
                            ? activeIntervieweeCard.parsed.expectations
                            : ["No expectations extracted yet."]
                          ).map((item, idx) => (
                            <li key={`ex-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .persona-container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          display: flex;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .persona-sidebar {
          width: 30%;
          background: #2f5b8c;
          color: white;
          padding: 20px;
        }

        .persona-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #d9d9d9;
          margin: 0 auto 20px;
          position: relative;
        }

        .persona-avatar::after {
          content: "";
          width: 35px;
          height: 35px;
          background: #555;
          border-radius: 50%;
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
        }

        .persona-avatar::before {
          content: "";
          width: 50px;
          height: 25px;
          background: #555;
          border-radius: 25px 25px 0 0;
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
        }

        .persona-section-title {
          margin-top: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          opacity: 0.9;
        }

        .persona-sidebar p {
          font-size: 13px;
          margin-bottom: 6px;
        }

        .persona-sidebar ul {
          margin-top: 10px;
          padding-left: 18px;
        }

        .persona-sidebar li {
          font-size: 13px;
          margin-bottom: 8px;
        }

        .persona-main {
          width: 70%;
        }

        .persona-header {
          background: #1d3f77;
          color: white;
          padding: 20px;
        }

        .persona-header h1 {
          font-size: 22px;
          margin-bottom: 5px;
        }

        .persona-quote {
          font-size: 13px;
          font-style: italic;
          opacity: 0.9;
        }

        .persona-content {
          padding: 20px;
        }

        .persona-block {
          margin-bottom: 20px;
        }

        .persona-block h3 {
          font-size: 15px;
          margin-bottom: 10px;
          color: #333;
        }

        .persona-block p {
          font-size: 13px;
          color: #555;
        }

        .persona-grid-2 {
          display: flex;
          gap: 20px;
        }

        .persona-grid-2 .persona-block {
          width: 50%;
        }

        .persona-block ul {
          padding-left: 18px;
        }

        .persona-block li {
          font-size: 13px;
          margin-bottom: 8px;
          color: #444;
        }

        @media (max-width: 900px) {
          .persona-container {
            flex-direction: column;
          }

          .persona-sidebar,
          .persona-main {
            width: 100%;
          }

          .persona-grid-2 {
            flex-direction: column;
          }

          .persona-grid-2 .persona-block {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
