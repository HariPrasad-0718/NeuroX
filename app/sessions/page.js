"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Video, Users, ChevronRight, Filter, ArrowLeft } from "lucide-react";

const upcomingSessions = [
  { id: 1, title: "UX Research Fundamentals", expert: "Dr. Sarah Chen", expertise: "UX Research Lead", date: "2024-12-28", time: "10:00 AM - 11:30 AM", duration: "90 min", type: "Workshop", location: "Virtual (Zoom)", participants: 24, maxParticipants: 30, description: "Learn the fundamentals of user research.", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop", status: "confirmed" },
  { id: 2, title: "Design Thinking Workshop", expert: "Michael Rodriguez", expertise: "Innovation Consultant", date: "2024-12-29", time: "2:00 PM - 4:00 PM", duration: "120 min", type: "Workshop", location: "Virtual (Google Meet)", participants: 18, maxParticipants: 25, description: "Hands-on design thinking workshop.", image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop", status: "confirmed" },
  { id: 3, title: "Prototyping with Figma", expert: "Emma Thompson", expertise: "Product Designer", date: "2024-12-30", time: "11:00 AM - 12:30 PM", duration: "90 min", type: "Tutorial", location: "Virtual (Zoom)", participants: 15, maxParticipants: 20, description: "Advanced prototyping techniques in Figma.", image: "https://images.unsplash.com/photo-1558403194-611308249627?w=400&h=300&fit=crop", status: "confirmed" },
];

const pastSessions = [
  { id: 7, title: "User Testing Best Practices", expert: "Dr. Sarah Chen", expertise: "UX Research Lead", date: "2024-12-20", time: "2:00 PM - 3:30 PM", duration: "90 min", type: "Workshop", location: "Virtual (Zoom)", participants: 28, maxParticipants: 30, description: "Effective user testing methodologies.", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop", status: "completed" },
];

export default function SessionsPage() {
  const router = useRouter();
  const [filterTab, setFilterTab] = useState("upcoming");

  const getSessions = () => {
    if (filterTab === "upcoming") return upcomingSessions;
    if (filterTab === "past") return pastSessions;
    return [...upcomingSessions, ...pastSessions];
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="-mb-8 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Dashboard</span></button>
          <h1 className="text-3xl font-semibold text-gray-900">Expert Sessions</h1>
          <p className="text-gray-600">Browse and join sessions with industry experts</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {["all", "upcoming", "past"].map((tab) => (
            <button key={tab} onClick={() => setFilterTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterTab === tab ? "bg-[#702dff] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {tab === "all" ? "All Sessions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {getSessions().map((session) => (
          <div key={session.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
            <div className="h-48 overflow-hidden bg-gray-100"><img src={session.image} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{session.type}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${session.status === "completed" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>{session.status === "completed" ? "Completed" : "Confirmed"}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{session.title}</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center"><span className="text-white font-semibold text-sm">{session.expert.split(" ").map((n) => n[0]).join("")}</span></div>
                <div><p className="text-sm font-medium text-gray-900">{session.expert}</p><p className="text-xs text-gray-500">{session.expertise}</p></div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{session.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4 text-gray-400" />{formatDate(session.date)}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-4 h-4 text-gray-400" />{session.time} ({session.duration})</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Video className="w-4 h-4 text-gray-400" />{session.location}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Users className="w-4 h-4 text-gray-400" />{session.participants}/{session.maxParticipants} participants</div>
              </div>
              <button className={`w-full py-2.5 rounded-lg font-medium transition-colors ${session.status === "completed" ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-[#702dff] text-white hover:bg-[#5a24cc] flex items-center justify-center gap-2"}`}>
                {session.status === "completed" ? "View Recording" : (<>Join Session<ChevronRight className="w-4 h-4" /></>)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}