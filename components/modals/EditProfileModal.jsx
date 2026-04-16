"use client";

import { X, User, Mail, Briefcase, Save } from "lucide-react";
import { useState, useEffect } from "react";

export function EditProfileModal({ isOpen, onClose, userData, onSave, isUpdating = false }) {
  const [formData, setFormData] = useState({ name: "", email: "", role: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userData && isOpen) {
      setFormData({ name: userData.name || "", email: userData.email || "", role: userData.role || "Designer" });
      setErrors({});
    }
  }, [userData, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    if (!formData.role) newErrors.role = "Role is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="relative bg-gradient-to-br from-[#702dff] to-[#9b59ff] px-6 py-6 rounded-t-2xl">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
            <p className="text-sm text-white/80 mt-1">Update your personal information</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={`block w-full pl-10 pr-3 py-2.5 border ${errors.name ? "border-red-500" : "border-gray-300"} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#702dff] focus:border-transparent text-sm`} placeholder="John Doe" disabled={isUpdating} />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={`block w-full pl-10 pr-3 py-2.5 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#702dff] focus:border-transparent text-sm`} placeholder="john@example.com" disabled={isUpdating} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-5 w-5 text-gray-400" /></div>
                <select name="role" value={formData.role} onChange={handleChange} className={`block w-full pl-10 pr-3 py-2.5 border ${errors.role ? "border-red-500" : "border-gray-300"} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#702dff] focus:border-transparent text-sm bg-white`} disabled={isUpdating}>
                  <option value="Designer">Designer</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50" disabled={isUpdating}>Cancel</button>
              <button type="submit" disabled={isUpdating} className="flex-1 px-4 py-2.5 bg-[#702dff] text-white rounded-lg font-medium hover:bg-[#5a24cc] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isUpdating ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Saving...</span></>) : (<><Save className="w-4 h-4" /><span>Save Changes</span></>)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
