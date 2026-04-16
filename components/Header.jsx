"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, User } from "lucide-react";

export default function Header({
  userName,
  userPersona,
  onCreateProject,
  onOpenProfile,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="bg-white border-b border-[#e5e7eb] px-8 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search projects, templates..."
              className="w-full pl-10 pr-4 py-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:border-[#702dff] focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 ml-8">
          <button
            className="bg-[#702dff] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#5a24cc] transition-colors"
            onClick={onCreateProject}
          >
            <Plus className="w-4 h-4" />
            Create New Project
          </button>

          <div className="relative">
            <button className="w-9 h-9 bg-[#f9fafb] hover:bg-[#f3f4f6] rounded-lg flex items-center justify-center transition-colors relative">
              <Bell className="w-4 h-4 text-[#6b7280]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full" />
            </button>
          </div>

          <div className="relative">
            <button
              className="w-9 h-9 rounded-lg overflow-hidden border border-[#e5e7eb] hover:border-[#702dff] transition-colors bg-gradient-to-br from-[#702dff] to-[#9b59ff] flex items-center justify-center"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <span className="text-white font-semibold text-xs">
                {userName?.charAt(0) || "U"}
              </span>
            </button>

            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[60] min-w-[200px]">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500">{userPersona}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      if (onOpenProfile) onOpenProfile();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>View Profile</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
