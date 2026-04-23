"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

function TemplateWorkspaceInner() {
  const searchParams = useSearchParams();

  const templateName = searchParams.get("template");
  const projectName = searchParams.get("projectName");
  const projectDescription = searchParams.get("description");

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 Fetch questions from AI API
  const fetchQuestions = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: projectDescription,   // ✅ FIXED
          template: templateName,           // ✅ FIXED
        }),
      });

      const data = await res.json();

      if (data.success && data.questions) {
        // ✅ Clean questions (remove numbering if AI adds it)
        const cleaned = data.questions.map((q) =>
          q.replace(/^\d+[\).\-\s]*/, "").trim()
        );

        setQuestions(cleaned);
      } else {
        throw new Error("No questions returned");
      }
    } catch (err) {
      console.error("AI error:", err);

      // ✅ fallback (static)
      const fallback = [
        `Who are the target users of ${projectName}?`,
        `What problem does "${projectDescription}" solve?`,
        "What are the key features required?",
        "What challenges might users face?",
        "How will success be measured?",
      ];
      setQuestions(fallback);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Call once when page loads
  useEffect(() => {
    if (projectDescription && templateName) {
      fetchQuestions();
    }
  }, [projectDescription, templateName]);

  return (
    <div className="p-8 bg-white min-h-screen">
      {/* Project Name */}
      <h1 className="text-3xl font-bold mb-2">
        {projectName}
      </h1>

      {/* Template Name */}
      <h2 className="text-lg text-gray-600 mb-6">
        {templateName} Workspace
      </h2>

      {/* Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-purple-700"
          onClick={fetchQuestions}
        >
          Regenerate Questions
        </button>

        <input
          type="file"
          className="border p-2 cursor-pointer hover:border-gray-400"
        />
      </div>

      {/* Questions */}
      <div className="bg-white p-4 rounded border shadow-sm">
        <h2 className="font-semibold mb-3 text-lg">
          AI Questions
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

export default function TemplateWorkspace() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <TemplateWorkspaceInner />
    </Suspense>
  );
}