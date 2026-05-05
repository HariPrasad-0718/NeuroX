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
  const [status, setStatus] = useState("In Progress");

  const [personas, setPersonas] = useState([
    { name: "", description: "" },
  ]);

  useEffect(() => {
    if (editingProject) {
      setProjectName(editingProject.title || "");
      setClientName(editingProject.company || "");
      setDescription(editingProject.description || "");

      if (editingProject.startDate) {
        const date = new Date(editingProject.startDate);
        setStartDate(date.toISOString().split("T")[0]);
      }

      if (editingProject.targetDate) {
        const date = new Date(editingProject.targetDate);
        setTargetDate(date.toISOString().split("T")[0]);
      }

      setSharedWith(editingProject.sharedWith || "");
      setStatus(editingProject.status || "In Progress");

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
    setPersonas([{ name: "", description: "" }]);
  };

  const addPersona = () => {
    setPersonas([...personas, { name: "", description: "" }]);
  };

  const updatePersona = (index, field, value) => {
    const updated = [...personas];
    updated[index][field] = value;
    setPersonas(updated);
  };

  const removePersona = (index) => {
    setPersonas(personas.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!projectName || !clientName || !startDate || !targetDate) {
      alert("Please fill in all required fields");
      return;
    }

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
      personas: filteredPersonas,
    };

    if (editingProject) {
      projectData.projectId = editingProject.projectId;
    }

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
        <div className="bg-white rounded-xl shadow-lg w-full max-w-[640px] relative">

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
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Project Name *</label>
              <input
                type="text"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Client Name */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Client Name *</label>
              <input
                type="text"
                placeholder="Enter client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
              <textarea
                placeholder="Description ..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            
            {/* Personas */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">User Groups *</label>

              {personas.map((p, index) => (
                <div key={index} className="mb-4">
                  <div className="flex gap-3">
                    <textarea
                      placeholder="User-Group Name"
                      value={p.name}
                      onChange={(e) =>
                        updatePersona(index, "name", e.target.value)
                      }
                      rows={1}
                      className="w-1/3 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none overflow-hidden"
                    />
                    <textarea
                      placeholder="User-Group Description"
                      value={p.description}
                      onChange={(e) =>
                        updatePersona(index, "description", e.target.value)
                      }
                      className="w-2/3 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                      rows={3}
                    />
                  </div>

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
            <div className="flex gap-4 mb-4 mt-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-400 focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Target Completion Date *</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-400 focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
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