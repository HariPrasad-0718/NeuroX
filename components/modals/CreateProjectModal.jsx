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
        className="fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6">
        <div className="flex min-h-full items-start justify-center sm:items-center">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.5)] ring-1 ring-slate-100/70 max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh]">

            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="scrollbar-premium max-h-[calc(100vh-1.5rem)] overflow-y-auto px-4 pb-4 pt-10 sm:max-h-[90vh] sm:px-7 sm:pb-6 sm:pt-11">
              <h2 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.8rem]">
                {editingProject ? "Edit Project" : "New Project"}
              </h2>

              {/* Project Name */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Project Name *</label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Client Name */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Client Name *</label>
                <input
                  type="text"
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  placeholder="Describe the project in detail including its purpose, features, workflow, and objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            
              {/* Personas */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">User Groups *</label>

                {personas.map((p, index) => (
                  <div key={index} className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <textarea
                        placeholder="User-Group Name"
                        value={p.name}
                        onChange={(e) =>
                          updatePersona(index, "name", e.target.value)
                        }
                        rows={1}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:w-1/3"
                      />
                      <textarea
                        placeholder="Describe what this user group does in the project, their goals, responsibilities, needs, and challenges..."
                        value={p.description}
                        onChange={(e) =>
                          updatePersona(index, "description", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:w-2/3"
                        rows={3}
                      />
                    </div>

                    {personas.length > 1 && (
                      <button
                        onClick={() => removePersona(index)}
                        className="mt-2 text-sm font-medium text-red-500 transition hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addPersona}
                  className="rounded-md px-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  + Add User Groups
                </button>
              </div>

              {/* Dates */}
              <div className="mb-4 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-500 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Target Completion Date *</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-500 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  {editingProject ? "Update" : "Create"}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}