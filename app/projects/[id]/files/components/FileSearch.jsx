"use client";

import { Search } from "lucide-react";

export default function FileSearch({
  searchTerm,
  setSearchTerm,
}) {
  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          placeholder="Search files by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#702dff] focus:ring-2 focus:ring-[#702dff]/20"
        />
      </div>
    </div>
  );
}