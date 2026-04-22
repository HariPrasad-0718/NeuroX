"use client";

import { generateProjectDocument } from "@/utils/generateDoc";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function TemplateWorkspace() {
  const searchParams = useSearchParams();

  const templateName = searchParams.get("template");
  const projectName = searchParams.get("projectName");
  const projectDescription = searchParams.get("description");

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Project object for Word generation
  const project = {
    projectName,
    projectDescription,
  };

  // 🔥 Fetch AI Questions (FIXED)
  const fetchQuestions = async () => {
  try {
    setLoading(true);

    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: {
          name: projectName,
          client: "Default Client",
          desc: projectDescription,
          persona: "users",
        },
      }),
    });

    // 👇 ADD THIS
const text = await res.text();
console.log("RAW RESPONSE:", text);

// 👇 THEN parse
const data = JSON.parse(text);

    // const data = await res.json();

    console.log("API RESPONSE:", data);

    if (data.success) {
      setQuestions(data.questions || []);
    } else {
      console.error("AI ERROR:", data.error);
      setQuestions([]);
    }
  } catch (err) {
    console.error("FETCH ERROR:", err);
    setQuestions([]);
  } finally {
    setLoading(false);
  }
};

  // 🔥 Auto load on page open
  useEffect(() => {
    if (projectDescription) {
      fetchQuestions();
    }
  }, [projectDescription]);

  return (
    <div className="min-h-screen bg-white p-10">
      {/* ✅ Project Name */}
      <h1 className="text-3xl font-bold mb-2">
        {projectName || "No Project Name"}
      </h1>

      {/* ✅ Template Name */}
      <h2 className="text-lg text-gray-600 mb-6">
        {templateName} Workspace
      </h2>

      {/* ✅ Buttons */}
      <div className="flex gap-4 mb-6">
        {/* Generate Word */}
        <button
          onClick={() =>
            generateProjectDocument(project, questions, templateName)
          }
          className="bg-[#702dff] hover:bg-[#5a24cc] text-white px-5 py-2.5 rounded-lg cursor-pointer"
        >
          Generate Template
        </button>

        {/* Regenerate AI */}
        <button
          onClick={fetchQuestions}
          className="bg-gray-200 hover:bg-gray-300 px-5 py-2.5 rounded-lg cursor-pointer"
        >
          Regenerate Questions
        </button>

        {/* Upload */}
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg">
          Upload Document
          <input type="file" className="hidden" />
        </label>
      </div>

      {/* ✅ Questions */}
      <div className="bg-white p-5 rounded border shadow-sm">
        <h2 className="font-semibold mb-3 text-lg">
          Suggested Questions
        </h2>

        {loading ? (
          <p className="text-gray-500">Generating questions...</p>
        ) : questions.length === 0 ? (
          <p className="text-gray-500">No questions generated</p>
        ) : (
          questions.map((q, i) => (
            <p key={i} className="mb-2">
              {i + 1}. {q}
            </p>
          ))
        )}
      </div>
    </div>
  );
}