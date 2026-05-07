"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function FinalPersonaPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchFinalPersona();
    }
  }, [projectId]);
  console.log("PROJECT ID:", projectId);

  const fetchFinalPersona = async () => {
      console.log("FUNCTION CALLED 🚀");

    try {
      const res = await fetch(
        `/api/personas?projectId=${projectId}&aggregateGenerated=true`
      );
      const data = await res.json();
     console.log("FULL API RESPONSE:", data);

if (!data.success) {
  console.error("API ERROR:", data);
  throw new Error(data?.error?.message || "API failed");
}

if (!data.data || !data.data.combinedOutput) {
  console.error("Combined output missing:", data);
  throw new Error("combinedOutput not found");
}

console.log("COMBINED DATA:", data.data.combinedOutput);

      if (!data.success) throw new Error("Failed to fetch combined output");

      const agentRes = await fetch("/api/generate-persona-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empathy_data_and_context: data.data.combinedOutput,
        }),
      });

      const agentData = await agentRes.json();

      if (!agentData.success) throw new Error("Agent failed");

      const raw = agentData.persona_card;

      let parsedData = {};
      try {
        parsedData = JSON.parse(agentData.raw?.message || "{}");
      } catch (e) {
        console.log("JSON parse failed");
      }

      // Extract name
      let name = "Persona";
      if (parsedData.HEADER) {
        const match = parsedData.HEADER.match(/Name:\s*(.*)/i);
        if (match) name = match[1].trim();
      }

      // Extract quote
      let quote = "";
      if (parsedData.HEADER) {
        const match = parsedData.HEADER.match(/Quote:\s*(.*)/i);
        if (match) quote = match[1].trim();
      }

      setPersona({
        name,
        quote,
        background: parsedData.BACKGROUND || raw.background || "",
        scenario: parsedData.SCENARIO || "",
        problemStatement:
          parsedData["PROBLEM STATEMENT"] || raw.problemStatement || "",
        demographics: parsedData.DEMOGRAPHICS || {},
        personality: parsedData.PERSONALITY || [],
        behaviours: parsedData["BEHAVIOURS & HABITS"] || [],
        goals: parsedData.GOALS || [],
        frustrations: parsedData.FRUSTRATIONS || [],
        motivations: parsedData.MOTIVATIONS || [],
        previousExperience: parsedData["PREVIOUS EXPERIENCE"] || [],
        positiveThemes: parsedData["POSITIVE THEMES"] || [],
        negativeThemes: parsedData["NEGATIVE THEMES"] || [],
        needs: parsedData["NEEDS & EXPECTATIONS"] || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert string → array safely
  const toArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === "string") {
      return data
        .split(/\n|-/)
        .map((i) => i.trim())
        .filter((i) => i);
    }
    return [];
  };

  // ✅ Card components (FIXED ERROR)
  const Card = ({ title, children, color }) => (
    <div className={`${color} p-4 rounded-xl`}>
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      <p className="text-sm text-gray-700">{children}</p>
    </div>
  );

  const ListCard = ({ title, items, color }) => (
    <div className={`${color} p-4 rounded-xl`}>
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      <ul className="list-disc ml-4 text-sm space-y-1">
        {toArray(items).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );

  // UI STATES
  if (loading) return <p className="p-6">Generating persona...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!persona) return <p className="p-6">No persona data</p>;

  const parseDemographics = (data) => {
  if (!data) return {};

  // already object → return directly
  if (typeof data === "object" && !Array.isArray(data)) {
    return data;
  }

  // string → convert to object
  if (typeof data === "string") {
    const obj = {};

    data.split("\n").forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (!key || rest.length === 0) return;

      obj[key.trim()] = rest.join(":").trim();
    });

    return obj;
  }

  return {};
};

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* HEADER */}
        <div className="bg-[#1c1c3c] text-white p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold">
            {persona.name?.charAt(0)}
          </div>

          <div>
            <h1 className="text-xl font-semibold">{persona.name}</h1>
            <p className="text-sm text-gray-300">UI/UX Designer</p>
          </div>

          <div className="ml-auto italic text-gray-300">
            "{persona.quote}"
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 p-6">

          {/* LEFT */}
          <div className="space-y-6">

            <div>
              <h3 className="text-purple-600 font-semibold text-sm mb-2">DEMOGRAPHICS</h3>
              {Object.entries(parseDemographics(persona.demographics)).map(([k, v], i) => (
    <p key={i}>
      <b>{k}:</b> {v}
    </p>
  ))}
            </div>

            <div>
              <h3 className="text-purple-600 font-semibold text-sm mb-2">PERSONALITY</h3>
              <ul className="list-disc ml-4 text-sm">
                {toArray(persona.personality).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-purple-600 font-semibold text-sm mb-2">BEHAVIOURS</h3>
              <ul className="list-disc ml-4 text-sm">
                {toArray(persona.behaviours).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

          </div>

          {/* RIGHT */}
          <div className="col-span-3 space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <Card title="BACKGROUND" color="bg-purple-50">
                {persona.background}
              </Card>

              <Card title="SCENARIO" color="bg-blue-50">
                {persona.scenario}
              </Card>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <ListCard title="GOALS" items={persona.goals} color="bg-green-50" />
              <ListCard title="FRUSTRATIONS" items={persona.frustrations} color="bg-red-50" />
              <ListCard title="MOTIVATIONS" items={persona.motivations} color="bg-yellow-50" />
              <ListCard title="EXPERIENCE" items={persona.previousExperience} color="bg-blue-50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ListCard title="POSITIVE THEMES" items={persona.positiveThemes} color="bg-green-50" />
              <ListCard title="NEGATIVE THEMES" items={persona.negativeThemes} color="bg-red-50" />
            </div>

            <div className="bg-purple-50 p-4 rounded-xl">
              <h3 className="font-semibold mb-2">NEEDS</h3>
              <div className="grid grid-cols-3 gap-3">
                {toArray(persona.needs).map((n, i) => (
                  <div key={i} className="bg-white p-3 rounded shadow text-sm">
                    {n}
                  </div>
                ))}
              </div>
            </div>

            {persona.problemStatement && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold mb-2">Problem Statement</h3>
                <p>{persona.problemStatement}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}