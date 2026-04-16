"use client";

import { X, Mail, Briefcase, Calendar, Shield } from "lucide-react";

export function ProfileModal({ isOpen, onClose, userData, onEdit }) {
  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="relative bg-gradient-to-br from-[#702dff] to-[#9b59ff] px-6 pt-6 pb-12 rounded-t-2xl">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex flex-col items-center mt-2">
              <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center text-white text-2xl font-bold">
                {userData?.name?.charAt(0) || "U"}
              </div>
            </div>
          </div>
          <div className="px-6 -mt-8 pb-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 text-center mb-1">{userData?.name}</h2>
              <p className="text-center text-sm text-[#702dff] font-medium mb-4">{userData?.role}</p>
              <div className="border-t border-gray-200 my-4" />
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-[#702dff]" /></div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Email Address</p><p className="text-sm text-gray-900 truncate">{userData?.email}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0"><Briefcase className="w-4 h-4 text-[#6366F1]" /></div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Role</p><p className="text-sm text-gray-900">{userData?.role}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-green-600" /></div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Member Since</p><p className="text-sm text-gray-900">{formatDate(userData?.createdAt)}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><Shield className="w-4 h-4 text-emerald-600" /></div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Account Status</p><div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><p className="text-sm text-gray-900">Active</p></div></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Close</button>
              <button onClick={onEdit} className="flex-1 px-4 py-2.5 bg-[#702dff] text-white rounded-lg font-medium hover:bg-[#5a24cc] transition-colors">Edit Profile</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
