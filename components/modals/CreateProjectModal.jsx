"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  editingProject,
  isUpdating = false,
}) {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [sharedWith, setSharedWith] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [status, setStatus] = useState("In Progress");

  const [personas, setPersonas] = useState([
    { name: "", description: "" },
  ]);

  useEffect(() => {
    if (editingProject) {
      setProjectName(
        editingProject.title || editingProject.projectName || ""
      );
      setClientName(
        editingProject.company || editingProject.client || ""
      );
      setDescription(
        editingProject.description ||
          editingProject.projectDescription ||
          ""
      );

      if (editingProject.startDate) {
        const date = new Date(editingProject.startDate);
        setStartDate(date.toISOString().split("T")[0]);
      }

      if (
        editingProject.targetDate ||
        editingProject.targetCompletionDate
      ) {
        const date = new Date(
          editingProject.targetDate ||
            editingProject.targetCompletionDate
        );
        setTargetDate(date.toISOString().split("T")[0]);
      }

      setSharedWith(editingProject.sharedWith || "");
      setStatus(editingProject.status || "In Progress");

      // ✅ IMPORTANT: load personas if editing
      if (editingProject.personas) {
        setPersonas(editingProject.personas);
      }
    } else {
      resetForm();
    }
  }, [editingProject, isOpen]);

  const resetForm = () => {
    setProjectName("");
    setClientName("");
    setDescription("");
    setStartDate("");
    setTargetDate("");
    setSharedWith("");
    setStatus("In Progress");

    // ✅ reset personas also
    setPersonas([{ name: "", description: "" }]);
  };

  const emailSuggestions = [
    "john.doe@example.com",
    "jane.smith@lenovo.com",
    "mike.johnson@dell.com",
  ];

  const addPersona = () => {
    setPersonas([...personas, { name: "", description: "" }]);
  };

  const updatePersona = (index, field, value) => {
    const updated = [...personas];
    updated[index][field] = value;
    setPersonas(updated);
  };

  const removePersona = (index) => {
    const updated = personas.filter((_, i) => i !== index);
    setPersonas(updated);
  };

  const handleSubmit = () => {
    if (!projectName || !clientName || !startDate || !targetDate) {
      alert("Please fill in all required fields");
      return;
    }

    // ✅ Remove empty personas
    const filteredPersonas = personas.filter(
      (p) => p.name.trim() !== ""
    );

    if (filteredPersonas.length === 0) {
      alert("Please add at least one persona");
      return;
    }

    const projectData = {
      title: projectName,
      company: clientName,
      description,
      startDate,
      targetDate,
      sharedWith,
      status,
      personas: filteredPersonas, // ✅ cleaned data
    };

    if (editingProject) {
      projectData.projectId =
        editingProject.projectId || editingProject.id;
    }

    console.log("SENDING PERSONAS:", filteredPersonas); // ✅ debug

    onCreateProject(projectData);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto relative">

          <button
            onClick={onClose}
            className="absolute right-5 top-4"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 pt-10">
            <h2 className="text-2xl font-semibold mb-6">
              {editingProject ? "Edit Project" : "New Project"}
            </h2>

            {/* Project Name */}
            <input
              type="text"
              placeholder="Project Name *"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full mb-3 px-3 py-2 border"
            />

            {/* Client Name */}
            <input
              type="text"
              placeholder="Client Name *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full mb-3 px-3 py-2 border"
            />

            {/* Description */}
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mb-3 px-3 py-2 border"
            />

            {/* Personas */}
            <div className="mb-4">
              <label className="font-semibold">User Personas *</label>

              {personas.map((p, index) => (
                <div key={index} className="border p-3 mb-2 rounded">
                  <input
                    type="text"
                    placeholder="Persona Name"
                    value={p.name}
                    onChange={(e) =>
                      updatePersona(index, "name", e.target.value)
                    }
                    className="w-full mb-2 px-2 py-1 border"
                  />

                  <textarea
                    placeholder="Persona Description"
                    value={p.description}
                    onChange={(e) =>
                      updatePersona(
                        index,
                        "description",
                        e.target.value
                      )
                    }
                    className="w-full px-2 py-1 border"
                  />

                  {personas.length > 1 && (
                    <button
                      onClick={() => removePersona(index)}
                      className="text-red-500 text-sm mt-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addPersona}
                className="text-indigo-600 text-sm"
              >
                + Add Persona
              </button>
            </div>

            {/* Dates */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mb-2 px-3 py-2 border"
            />

            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full mb-3 px-3 py-2 border"
            />

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <button onClick={onClose}>Cancel</button>

              <button
                onClick={handleSubmit}
                className="bg-indigo-500 text-white px-4 py-2 rounded"
              >
                {editingProject ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}