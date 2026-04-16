"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Folder,
  BookOpen,
  Users,
  BookMarked,
  Settings,
  LogOut,
} from "lucide-react";
import Logo from "./Logo";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Folder, label: "Projects", href: "/projects" },
  { icon: BookOpen, label: "Templates", href: "/templates" },
  { icon: Users, label: "Experts", href: "/experts" },
  { icon: BookMarked, label: "Sessions", href: "/sessions" },
];

export default function Sidebar({ onLogout }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[240px] bg-white border-r border-[#e5e7eb] flex flex-col fixed h-full z-20">
      <div className="px-6 py-6">
        <div className="h-10">
          <Logo />
        </div>
      </div>

      <nav className="flex-1 px-4">
        <p className="text-xs font-medium text-[#9ca3af] uppercase px-3 mb-3">
          Menu
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white text-[#702dff] shadow-sm"
                    : "text-[#6b7280] hover:bg-[#f9fafb]"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.5} />
                <span className={active ? "font-medium" : ""}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-4 pb-4 border-t border-[#e5e7eb]">
        <p className="text-xs font-medium text-[#9ca3af] uppercase px-3 mb-3 mt-4">
          Settings
        </p>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
          <Settings className="w-4 h-4" strokeWidth={1.5} />
          <span>Settings</span>
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
