"use client";

import { AlertTriangle, HandHeart, Lightbulb } from "lucide-react";

function Section({ title, items }) {
  const safeItems = Array.isArray(items)
    ? items
    : typeof items === "string"
    ? items.split("\n")
    : [];

  return (
    <div>
      <h4 className="mb-2 font-semibold">{title}</h4>

      {safeItems.length > 0 ? (
        <ul className="ml-5 list-disc space-y-1 text-sm">
          {safeItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">No data available</p>
      )}
    </div>
  );
}

export default function PersonaSectionPanel({
  finalPersonaCard,
  processFlowData,
  personaCards,
  activePersonaCardId,
  activePersonaCard,
  isPersonaCardsLoading,
  personaCardsError,
  isCombiningPersonaOutput,
  onCombinePersonaOutputs,
  onClose,
  onSelectPersonaCard,
}) {
  return (
    <div className="bg-[#f5f7fa] px-8 pb-10">
      <div className="border-t border-gray-200 pt-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Empathize Stage</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">User Persona Output</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCombinePersonaOutputs}
              disabled={isCombiningPersonaOutput}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCombiningPersonaOutput ? "Combining..." : "Combine All Persona Outputs"}
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Close
            </button>
          </div>
        </div>

        {finalPersonaCard && (
          <div className="mt-10">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Final AI Generated Persona</h2>
              <p className="text-sm text-gray-600">Combined insights from all personas</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 border-b pb-4">
                <h3 className="text-2xl font-bold text-[#702dff]">{finalPersonaCard.name || "Persona"}</h3>

                <p className="mt-1 italic text-gray-600">{finalPersonaCard.quote || "No quote available"}</p>

                <p className="mt-3 text-sm text-gray-700">{finalPersonaCard.background || "No description"}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Section title="Goals" items={finalPersonaCard.goals} />
                <Section title="Needs" items={finalPersonaCard.needs} />
                <Section title="Pain Points" items={finalPersonaCard.frustrations} />
                <Section title="Motivations" items={finalPersonaCard.motivations} />
                <Section title="Personality" items={finalPersonaCard.personality} />
                <Section title="Behaviours & Habits" items={finalPersonaCard.behaviours} />
                <Section title="Positive Themes" items={finalPersonaCard.positiveThemes} />
                <Section title="Negative Themes" items={finalPersonaCard.negativeThemes} />
              </div>

              <div className="mt-6">
                <h4 className="mb-2 font-semibold">Scenario</h4>
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{finalPersonaCard.scenario || "No scenario available"}</p>
              </div>

              <div className="mt-6">
                <h4 className="mb-2 font-semibold">Demographics</h4>
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {typeof finalPersonaCard.demographics === "object" ? (
                    Object.entries(finalPersonaCard.demographics).map(([key, value]) => (
                      <p key={key}>
                        <b>{key}:</b> {value}
                      </p>
                    ))
                  ) : (
                    <p>{finalPersonaCard.demographics || "No demographics available"}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="mb-2 font-semibold">Problem Statement</h4>
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {finalPersonaCard.problemStatement || "No problem statement available"}
                </p>
              </div>
            </div>
          </div>
        )}

        {processFlowData && (
          <div className="mt-1">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-gray-900">AI Generated Process Flow</h2>
              <p className="text-sm text-gray-600">Generated from persona insights</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{JSON.stringify(processFlowData, null, 2)}</pre>
            </div>
          </div>
        )}

        {isPersonaCardsLoading ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading persona output...</p>
        ) : personaCardsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{personaCardsError}</p>
        ) : personaCards.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">No personas found for this project.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-0">
              {personaCards.map((card) => (
                <button
                  key={card.personaId}
                  onClick={() => onSelectPersonaCard(card.personaId)}
                  className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
                    activePersonaCardId === card.personaId
                      ? "bg-indigo-500 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {card.personaName}
                </button>
              ))}
            </div>

            {!activePersonaCard?.hasGeneratedOutput ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                No persona output available for <b>{activePersonaCard?.personaName}</b> yet. Complete the interview transcript in the workspace to generate it.
              </p>
            ) : (
              <div className="persona-container">
                <div className="persona-sidebar">
                  <div className="persona-avatar" />

                  <div className="persona-section-title">Demographics</div>
                  <p><b>Gender:</b> {activePersonaCard.demographics.gender}</p>
                  <p><b>Age:</b> {activePersonaCard.demographics.age}</p>
                  <p><b>Location:</b> {activePersonaCard.demographics.location}</p>
                  <p><b>Relationship Status:</b> {activePersonaCard.demographics.relationshipStatus}</p>
                  <p><b>Title:</b> {activePersonaCard.demographics.title}</p>
                  <p><b>Education:</b> {activePersonaCard.demographics.education}</p>

                  <div className="persona-section-title">Goals</div>
                  <ul>
                    {(activePersonaCard.parsed.goals.length ? activePersonaCard.parsed.goals : ["No goals extracted yet."]).map((item, idx) => (
                      <li key={`goal-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="persona-main">
                  <div className="persona-header">
                    <h1>Name: {activePersonaCard.parsed.name}</h1>
                    <div className="persona-quote">
                      {activePersonaCard.parsed.quote ? `"${activePersonaCard.parsed.quote}"` : "No quote available."}
                    </div>
                  </div>

                  <div className="persona-content">
                    <div className="persona-block">
                      <h3>Background Description</h3>
                      <p>{activePersonaCard.parsed.background}</p>
                    </div>

                    <div className="persona-grid-2">
                      <div className="persona-block">
                        <h3>Says</h3>
                        <ul>
                          {(activePersonaCard.parsed.says.length ? activePersonaCard.parsed.says : ["No data extracted yet."]).map((item, idx) => (
                            <li key={`says-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="persona-block">
                        <h3>Thinks</h3>
                        <ul>
                          {(activePersonaCard.parsed.thinks.length ? activePersonaCard.parsed.thinks : ["No data extracted yet."]).map((item, idx) => (
                            <li key={`thinks-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="persona-grid-2">
                      <div className="persona-block">
                        <h3>Does</h3>
                        <ul>
                          {(activePersonaCard.parsed.does.length ? activePersonaCard.parsed.does : ["No data extracted yet."]).map((item, idx) => (
                            <li key={`does-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="persona-block">
                        <h3>Feels</h3>
                        <ul>
                          {(activePersonaCard.parsed.feels.length ? activePersonaCard.parsed.feels : ["No data extracted yet."]).map((item, idx) => (
                            <li key={`feels-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="persona-insight-grid">
                      <div className="insight-tile pain-points">
                        <div className="insight-head">
                          <span className="insight-icon"><AlertTriangle className="h-4 w-4" /></span>
                          <h3>Pain Points</h3>
                        </div>
                        <div className="insight-body">
                          {(activePersonaCard.parsed.frustrations.length ? activePersonaCard.parsed.frustrations : ["No pain points extracted yet."]).map((item, idx) => (
                            <span key={`pain-${idx}`} className="insight-chip">{item}</span>
                          ))}
                        </div>
                      </div>

                      <div className="insight-tile needs">
                        <div className="insight-head">
                          <span className="insight-icon"><HandHeart className="h-4 w-4" /></span>
                          <h3>Needs</h3>
                        </div>
                        <div className="insight-body">
                          {(activePersonaCard.parsed.needs.length ? activePersonaCard.parsed.needs : activePersonaCard.parsed.goals.length ? activePersonaCard.parsed.goals : ["No needs extracted yet."]).map((item, idx) => (
                            <span key={`need-${idx}`} className="insight-chip">{item}</span>
                          ))}
                        </div>
                      </div>

                      <div className="insight-tile key-insights">
                        <div className="insight-head">
                          <span className="insight-icon"><Lightbulb className="h-4 w-4" /></span>
                          <h3>Key Insights</h3>
                        </div>
                        <div className="insight-body">
                          {(activePersonaCard.parsed.keyInsights.length ? activePersonaCard.parsed.keyInsights : activePersonaCard.parsed.motivations.length ? activePersonaCard.parsed.motivations : ["No key insights extracted yet."]).map((item, idx) => (
                            <span key={`insight-${idx}`} className="insight-chip">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
