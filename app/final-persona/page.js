"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Utility functions for parsing fields
function parseHeader(text) {
  if (!text) return { name: "Persona", role: "", quote: "" };
  let name = "", role = "", quote = "";
  text.split(/\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const lo = line.toLowerCase();
    if (lo.match(/^(persona\s*)?name\s*:/i)) name = line.replace(/.*?:\s*/, "").trim();
    else if (lo.match(/^(role|title)\s*:/i)) role = line.replace(/.*?:\s*/, "").trim();
    else if (lo.match(/^quote\s*:/i)) quote = line.replace(/.*?:\s*/, "").replace(/[""']/g, "").trim();
    else if (!quote && (line.includes('"') || line.includes('\u201c'))) quote = line.replace(/[""']/g, "").trim();
  });
  if (!name) name = text.split(/\n/)[0].replace(/.*?:\s*/, "").trim();
  return { name, role, quote };
}

function parseDemographics(text) {
  const r = {};
  if (!text) return r;
  if (typeof text === "object" && !Array.isArray(text)) return text;
  text.split(/\n/).map(l => l.replace(/^[•\-\*]/, "").trim()).filter(Boolean).forEach(line => {
    const p = line.split(/:\s*/);
    if (p.length >= 2) r[p[0].trim()] = p.slice(1).join(": ").trim();
  });
  return r;
}

function parseNeeds(text) {
  if (!text) return [];
  return text.split(/\n|,/).map(l => l.replace(/^[•\-\*\d+\.]\s*/, "").trim()).filter(l => l.length > 2);
}

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    return data.split(/\n|\-/).map(i => i.trim()).filter(i => i);
  }
  return [];
}

function themeList(text, dotCls) {
  if (!text) return null;
  return text.split(/\n/).map(l => l.trim()).filter(Boolean).map((line, idx) => {
    const m = line.match(/^[•\-\*]?\s*([^–\-:]+)[–\-:](.+)$/);
    if (m) return (
      <div className="flex items-start gap-2 mb-2 text-sm" key={idx}>
        <span className={dotCls + " text-lg mt-1"}>✔</span>
        <span><strong>{m[1].trim()}</strong> – <span className="text-gray-500">{m[2].trim()}</span></span>
      </div>
    );
    return (
      <div className="flex items-start gap-2 mb-2 text-sm" key={idx}>
        <span className={dotCls + " text-lg mt-1"}>✔</span>
        <span>{line.replace(/^[•\-\*]/, "")}</span>
      </div>
    );
  });
}

function FinalPersonaContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchFinalPersona();
    }
    // eslint-disable-next-line
  }, [projectId]);

  const fetchFinalPersona = async () => {
    try {
      const res = await fetch(`/api/personas?projectId=${projectId}&aggregateGenerated=true`);
      const data = await res.json();
      if (!data.success) throw new Error(data?.error?.message || "API failed");
      if (!data.data || !data.data.combinedOutput) throw new Error("combinedOutput not found");

      const agentRes = await fetch("/api/generate-persona-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empathy_data_and_context: data.data.combinedOutput }),
      });
      const agentData = await agentRes.json();
      if (!agentData.success) throw new Error("Agent failed");
      const raw = agentData.persona_card;
      let parsedData = {};
      try {
        parsedData = JSON.parse(agentData.raw?.message || "{}");
      } catch (e) {}

      setPersona(parsedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="p-6">Generating persona...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!persona) return <p className="p-6">No persona data</p>;

  // HEADER
  const hdr = parseHeader(persona.HEADER);
  const demo = parseDemographics(persona.DEMOGRAPHICS);
  const needs = parseNeeds(persona["NEEDS & EXPECTATIONS"]);
  const inits = (hdr.name || "P").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const icons = ["📋", "🗺️", "🔔", "📊", "🤖", "📱", "⚙️", "💡", "🎯", "✨"];

  return (
    <div className="min-h-screen bg-[#f0f0f5] py-10 px-2">
      <div className="max-w-5xl mx-auto persona-card rounded-2xl overflow-hidden shadow-2xl">
        {/* HEADER */}
        <div className="p-header flex items-center gap-6 bg-[#1a1a2e] text-white px-8 py-7">
          <div className="p-header-left flex items-center gap-4">
            <div className="p-avatar w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-3xl font-bold border-4 border-white/20">
              {inits}
            </div>
            <div>
              <div className="p-name text-2xl font-bold">{hdr.name || "Persona"}</div>
              <div className="p-role text-xs text-gray-300 mt-1">{hdr.role || demo["Occupation"] || demo["Role"] || ""}</div>
            </div>
          </div>
          {hdr.quote && (
            <div className="p-quote flex-1 text-base italic text-purple-200 border-l-4 border-purple-500 pl-6 ml-6">
              "{hdr.quote}"
            </div>
          )}
        </div>

        <div className="p-body grid md:grid-cols-[230px_1fr] grid-cols-1">
          {/* SIDEBAR */}
          <div className="p-sidebar bg-[#fafafa] border-r border-gray-200 px-6 py-8 flex flex-col gap-8">
            <div className="sb-section">
              <h4 className="text-[11px] font-bold tracking-wider text-purple-700 uppercase mb-3 flex items-center gap-2">👤 Demographics</h4>
              {Object.keys(demo).length
                ? Object.entries(demo).map(([k, val], i) => (
                    <div className="demo-row flex gap-2 mb-2 text-[13px]" key={i}>
                      <span className="demo-lbl text-gray-500 w-20 text-xs">{k}</span>
                      <span className="demo-val font-medium">{val}</span>
                    </div>
                  ))
                : <p className="text-xs text-gray-400">—</p>}
            </div>
            <hr className="divider border-t border-gray-200" />
            <div className="sb-section">
              <h4 className="text-[11px] font-bold tracking-wider text-purple-700 uppercase mb-3 flex items-center gap-2">🧠 Personality</h4>
              <ul className="dot-list flex flex-col gap-2">
                {toArray(persona.PERSONALITY).map((p, i) => (
                  <li key={i} className="text-[13px] flex gap-2 items-start"><span className="text-purple-600">•</span>{p}</li>
                ))}
              </ul>
            </div>
            <hr className="divider border-t border-gray-200" />
            <div className="sb-section">
              <h4 className="text-[11px] font-bold tracking-wider text-purple-700 uppercase mb-3 flex items-center gap-2">📊 Behaviours &amp; Habits</h4>
              <ul className="dot-list flex flex-col gap-2">
                {toArray(persona["BEHAVIOURS & HABITS"]).map((b, i) => (
                  <li key={i} className="text-[13px] flex gap-2 items-start"><span className="text-purple-600">•</span>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* MAIN */}
          <div className="p-main px-8 py-8 flex flex-col gap-6">
            <div className="row-2 grid md:grid-cols-2 grid-cols-1 gap-4">
              <div className="box box-purple rounded-xl border border-purple-200 bg-[#faf8ff] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-purple-700 uppercase mb-2 flex items-center gap-2">📄 Background</h4>
                <p className="text-[13px] text-gray-800 leading-relaxed">{persona.BACKGROUND || "—"}</p>
              </div>
              <div className="box box-blue rounded-xl border border-blue-200 bg-[#f5faff] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-blue-700 uppercase mb-2 flex items-center gap-2">🎯 Scenario</h4>
                <p className="text-[13px] text-gray-800 leading-relaxed">{persona.SCENARIO || "—"}</p>
              </div>
            </div>

            <div className="row-4 grid md:grid-cols-4 grid-cols-1 gap-4">
              <div className="box box-green rounded-xl border border-green-200 bg-[#f9fff9] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-green-700 uppercase mb-2 flex items-center gap-2">✅ Goals</h4>
                <ul className="chk flex flex-col gap-2">
                  {toArray(persona.GOALS).map((g, i) => (
                    <li key={i} className="flex gap-2 items-start text-[13px]"><span className="text-green-700">✔</span>{g}</li>
                  ))}
                </ul>
              </div>
              <div className="box box-red rounded-xl border border-red-200 bg-[#fff9f9] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-red-700 uppercase mb-2 flex items-center gap-2">⚠️ Frustrations</h4>
                <ul className="chk flex flex-col gap-2">
                  {toArray(persona.FRUSTRATIONS).map((f, i) => (
                    <li key={i} className="flex gap-2 items-start text-[13px]"><span className="text-red-700">✖</span>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="box box-gold rounded-xl border border-yellow-200 bg-[#fffdf5] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-yellow-700 uppercase mb-2 flex items-center gap-2">⭐ Motivations</h4>
                <ul className="chk flex flex-col gap-2">
                  {toArray(persona.MOTIVATIONS).map((m, i) => (
                    <li key={i} className="flex gap-2 items-start text-[13px]"><span className="text-yellow-600">★</span>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="box box-blue rounded-xl border border-blue-200 bg-[#f5faff] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-blue-700 uppercase mb-2 flex items-center gap-2">🕐 Previous Experience</h4>
                <ul className="chk flex flex-col gap-2">
                  {toArray(persona["PREVIOUS EXPERIENCE"]).map((e, i) => (
                    <li key={i} className="flex gap-2 items-start text-[13px]"><span className="text-blue-700">●</span>{e}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="row-2 grid md:grid-cols-2 grid-cols-1 gap-4">
              <div className="box box-green rounded-xl border border-green-200 bg-[#f9fff9] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-green-700 uppercase mb-2 flex items-center gap-2">👍 Positive Themes <span className="font-normal normal-case text-[10px] tracking-normal">(What works well)</span></h4>
                {themeList(persona["POSITIVE THEMES"], "text-green-700")}
              </div>
              <div className="box box-red rounded-xl border border-red-200 bg-[#fff9f9] p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-red-700 uppercase mb-2 flex items-center gap-2">👎 Negative Themes <span className="font-normal normal-case text-[10px] tracking-normal">(What doesn't work)</span></h4>
                {themeList(persona["NEGATIVE THEMES"], "text-red-700")}
              </div>
            </div>

            <div className="box box-purple rounded-xl border border-purple-200 bg-[#faf8ff] p-5">
              <h4 className="text-[11px] font-bold tracking-wider text-purple-700 uppercase mb-2 flex items-center gap-2">💜 Needs &amp; Expectations</h4>
              <div className="needs-grid flex flex-wrap gap-3 mt-2">
                {needs.length
                  ? needs.map((n, i) => (
                      <div key={i} className="need-chip bg-purple-100 text-purple-700 rounded-xl px-4 py-3 font-semibold flex flex-col items-center min-w-[100px] text-xs">
                        <span className="ni text-xl mb-1">{icons[i % icons.length]}</span>
                        {n}
                      </div>
                    ))
                  : <p className="text-xs text-gray-400">{persona["NEEDS & EXPECTATIONS"]}</p>}
              </div>
            </div>

            {persona["PROBLEM STATEMENT"] && (
              <div className="box bg-gray-50 rounded-xl p-5">
                <h4 className="text-[11px] font-bold tracking-wider text-gray-700 uppercase mb-2 flex items-center gap-2">Problem Statement</h4>
                <p className="text-[13px] text-gray-800 leading-relaxed">{persona["PROBLEM STATEMENT"]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinalPersonaPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <FinalPersonaContent />
    </Suspense>
  );
}
