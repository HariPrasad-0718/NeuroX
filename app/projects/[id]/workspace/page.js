"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EmpathyMapPage() {
  const { id: projectId } = useParams();

  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [interviewees, setInterviewees] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedInterviewee, setSelectedInterviewee] = useState(null);

  const [form, setForm] = useState({
    name: "",
    gender: "",
    age: "",
    location: "",
    relationship_status: "",
    title: "",
    education: "",
  });

  // 🔥 Load Personas
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

  // 🔥 Load Interviewees
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

  useEffect(() => {
    fetchPersonas();
  }, []);

  useEffect(() => {
    if (activePersona) {
      fetchInterviewees(activePersona.persona_id);
      setSelectedInterviewee(null); // ✅ reset on persona change
    }
  }, [activePersona]);

  // 🔥 Add Interviewee
  const handleAddInterviewee = async () => {
    const res = await fetch("/api/interviewees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

  return (
    <div className="p-8 bg-white min-h-screen">

      {/* 🔥 Persona Tabs */}
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

  {/* ✅ Persona Description (NEW FIX) */}
  {activePersona && (
    <div className="mt-2 px-2 text-sm text-gray-600">
      {activePersona.persona_description}
    </div>
  )}
</div>

      {/* 🔥 Interviewee Tabs */}
     <div className="flex items-center gap-2 mb-6 overflow-x-auto">

  {interviewees.map((i) => (
    <button
      key={i.interviewee_id}
      onClick={() => {
        if (selectedInterviewee?.interviewee_id === i.interviewee_id) {
          setSelectedInterviewee(null);
        } else {
          setSelectedInterviewee(i);
        }
      }}
      className={`px-4 py-2 rounded-t-md whitespace-nowrap text-sm font-medium transition ${
        selectedInterviewee?.interviewee_id === i.interviewee_id
          ? "bg-indigo-500 text-white shadow"
          : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      {i.name}
    </button>
  ))}

  {/* ✅ Google-style Add Button */}
  <button
    onClick={() => setShowForm(true)}
    className="ml-2 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-xl font-semibold shadow-sm transition"
  >
    +
  </button>
</div>

      {/* 🔥 Interviewee Details */}
      {selectedInterviewee && (
        <div className="mt-6 p-5 border rounded bg-white shadow relative">

          <button
            onClick={() => setSelectedInterviewee(null)}
            className="absolute top-2 right-3 text-gray-500 hover:text-black"
          >
            ✕
          </button>

          <h2 className="text-xl font-semibold mb-3">
            {selectedInterviewee.name}
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <p><b>Gender:</b> {selectedInterviewee.gender}</p>
            <p><b>Age:</b> {selectedInterviewee.age}</p>
            <p><b>Location:</b> {selectedInterviewee.location}</p>
            <p><b>Status:</b> {selectedInterviewee.relationship_status}</p>
            <p><b>Title:</b> {selectedInterviewee.title}</p>
            <p><b>Education:</b> {selectedInterviewee.education}</p>
          </div>
        </div>
      )}

      {/* 🔥 Questions */}
      {selectedInterviewee && (
        <div className="mt-6 p-5 border rounded bg-gray-50">
          <h3 className="font-semibold mb-3">
            Interview Questions & Answers
          </h3>

          {[
            "What are your daily challenges?",
            "What motivates you?",
          ].map((q, index) => (
            <div key={index} className="mb-3">
              <p className="font-medium">{q}</p>
              <textarea
                placeholder="Type answer..."
                className="w-full mt-1 px-2 py-2 border rounded"
              />
            </div>
          ))}
        </div>
      )}

      {/* 🔥 MODAL (FIXED UI ISSUE) */}
      {showForm && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowForm(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-[400px] relative">

              <button
                onClick={() => setShowForm(false)}
                className="absolute top-2 right-3 text-gray-500"
              >
                ✕
              </button>

              <h3 className="font-semibold mb-4 text-lg">
                Add Interviewee
              </h3>

              {Object.keys(form).map((key) => (
                <input
                  key={key}
                  placeholder={key}
                  value={form[key]}
                  onChange={(e) =>
                    setForm({ ...form, [key]: e.target.value })
                  }
                  className="block w-full mb-2 px-2 py-2 border rounded"
                />
              ))}

              <button
                onClick={handleAddInterviewee}
                className="bg-indigo-500 text-white px-4 py-2 rounded mt-2 w-full"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}