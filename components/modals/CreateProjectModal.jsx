"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";

export function CreateProjectModal({ isOpen, onClose, onCreateProject, editingProject, isUpdating = false }) {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [sharedWith, setSharedWith] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [status, setStatus] = useState("In Progress");

  useEffect(() => {
    if (editingProject) {
      setProjectName(editingProject.title || editingProject.projectName || "");
      setClientName(editingProject.company || editingProject.client || "");
      setDescription(editingProject.description || editingProject.projectDescription || "");
      if (editingProject.startDate) {
        const date = new Date(editingProject.startDate);
        setStartDate(date.toISOString().split("T")[0]);
      }
      if (editingProject.targetDate || editingProject.targetCompletionDate) {
        const date = new Date(editingProject.targetDate || editingProject.targetCompletionDate);
        setTargetDate(date.toISOString().split("T")[0]);
      }
      setSharedWith(editingProject.sharedWith || "");
      setStatus(editingProject.status || "In Progress");
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
  };

  const emailSuggestions = [
    "john.doe@example.com",
    "jane.smith@lenovo.com",
    "mike.johnson@dell.com",
  ];

  const handleSubmit = () => {
    if (!projectName || !clientName || !startDate || !targetDate) {
      alert("Please fill in all required fields");
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
    };
    if (editingProject) {
      projectData.projectId = editingProject.projectId || editingProject.id;
    }
    onCreateProject(projectData);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto relative scrollbar-hide">
          <button onClick={onClose} className="absolute right-5 top-4 w-6 h-6 flex items-center justify-center text-[#21272A] hover:bg-gray-100 rounded transition-colors z-10">
            <X className="w-5 h-5" />
          </button>
          <div className="p-6 pt-10">
            <h2 className="text-2xl font-semibold text-[#222426] mb-6">
              {editingProject ? "Edit Project" : "New Project"}
            </h2>
            {editingProject && (
              <div className="mb-4">
                <label className="block text-lg text-[#222426] mb-1.5">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-[38px] px-3 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] focus:outline-none focus:border-[#6366F1] transition-colors">
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-lg text-[#222426] mb-1.5">Project Name *</label>
              <input type="text" placeholder="Enter project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full h-[38px] px-3 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] placeholder:text-[#949494] focus:outline-none focus:border-[#6366F1] transition-colors" />
            </div>
            <div className="mb-4">
              <label className="block text-lg text-[#222426] mb-1.5">Client Name *</label>
              <input type="text" placeholder="Enter client name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full h-[38px] px-3 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] placeholder:text-[#949494] focus:outline-none focus:border-[#6366F1] transition-colors" />
            </div>
            <div className="mb-4">
              <label className="block text-lg text-[#222426] mb-1.5">Description</label>
              <textarea placeholder="Description ..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-[70px] px-3 py-2 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] placeholder:text-[#949494] resize-none focus:outline-none focus:border-[#6366F1] transition-colors" />
            </div>
            <div className="mb-4 flex gap-8">
              <div className="flex-1">
                <label className="block text-lg text-[#222426] mb-1.5">Start Date *</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-[38px] px-3 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] focus:outline-none focus:border-[#6366F1] transition-colors" />
              </div>
              <div className="flex-1">
                <label className="block text-lg text-[#222426] mb-1.5">Target Completion Date *</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full h-[38px] px-3 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] focus:outline-none focus:border-[#6366F1] transition-colors" />
              </div>
            </div>
            <div className="mb-6 relative">
              <label className="block text-lg text-[#222426] mb-1.5">Share with</label>
              <input type="text" placeholder="Emails or user name, comma separated" value={sharedWith} onChange={(e) => setSharedWith(e.target.value)} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="w-full h-[38px] px-3 bg-[#fbfbfb] border border-[#ababab] text-[12px] text-[#949494] placeholder:text-[#949494] focus:outline-none focus:border-[#6366F1] transition-colors" />
              {showSuggestions && (
                <div className="absolute z-20 w-full bg-white border border-gray-300 shadow-md">
                  {emailSuggestions.map((email) => (
                    <div key={email} className="px-3 py-2 cursor-pointer hover:bg-gray-100" onClick={() => setSharedWith(email)}>{email}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-4">
              <button onClick={onClose} className="h-8 px-6 bg-white border border-indigo-500 text-indigo-500 rounded text-sm hover:bg-gray-50 transition-colors" disabled={isUpdating}>Cancel</button>
              <button onClick={handleSubmit} disabled={isUpdating} className="h-8 px-6 bg-indigo-500 border border-indigo-500 text-white rounded text-sm hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isUpdating && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
                <span>{editingProject ? "Save Changes" : "Next"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
