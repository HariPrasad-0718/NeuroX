"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [role, setRole] = useState("Designer");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("userRole", role);
    localStorage.setItem("userId", "u");
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#4a1a8f] via-[#6b2d9e] to-[#8b3faf] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Neurox</h2>
          <p className="text-gray-600 mb-6">Select your role to continue to your workspace</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">I am a</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setRole("Designer")} className={`px-6 py-8 rounded-xl border-2 transition-all ${role === "Designer" ? "border-[#702dff] bg-[#702dff]/5 shadow-lg shadow-purple-500/20" : "border-gray-300 bg-gray-50 hover:border-gray-400"}`}>
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role === "Designer" ? "bg-[#702dff]" : "bg-gray-300"}`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    </div>
                    <div><span className={`block font-semibold text-lg ${role === "Designer" ? "text-[#702dff]" : "text-gray-700"}`}>Designer</span><span className="text-xs text-gray-500 mt-1 block">Create & manage projects</span></div>
                  </div>
                </button>
                <button type="button" onClick={() => setRole("Manager")} className={`px-6 py-8 rounded-xl border-2 transition-all ${role === "Manager" ? "border-[#702dff] bg-[#702dff]/5 shadow-lg shadow-purple-500/20" : "border-gray-300 bg-gray-50 hover:border-gray-400"}`}>
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role === "Manager" ? "bg-[#702dff]" : "bg-gray-300"}`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div><span className={`block font-semibold text-lg ${role === "Manager" ? "text-[#702dff]" : "text-gray-700"}`}>Manager</span><span className="text-xs text-gray-500 mt-1 block">Oversee teams & clients</span></div>
                  </div>
                </button>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-[#702dff] text-white rounded-lg font-medium hover:bg-[#5a24cc] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/30">
              Continue as {role}
            </button>
          </form>
        </div>
        <p className="text-center text-white/60 text-sm mt-6">© 2024 Neurox. All rights reserved.</p>
      </div>
    </div>
  );
}
