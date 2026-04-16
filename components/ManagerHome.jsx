"use client";

import { Calendar, Clock, TrendingUp, Users, Folder, CheckCircle } from "lucide-react";

export default function ManagerHome({ projects, onProjectClick, onExpertsClick }) {
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "Completed").length;
  const inProgressProjects = projects.filter((p) => p.status === "In Progress").length;
  const uniqueClients = [...new Set(projects.map((p) => p.company))];

  const projectsByClient = uniqueClients.map((client) => {
    const clientProjects = projects.filter((p) => p.company === client);
    return {
      name: client,
      totalProjects: clientProjects.length,
      completed: clientProjects.filter((p) => p.status === "Completed").length,
      inProgress: clientProjects.filter((p) => p.status === "In Progress").length,
      projects: clientProjects,
    };
  });

  const stats = [
    { label: "Total Projects", value: totalProjects, icon: Folder, bgColor: "bg-blue-50", textColor: "text-blue-600" },
    { label: "In Progress", value: inProgressProjects, icon: TrendingUp, bgColor: "bg-amber-50", textColor: "text-amber-600" },
    { label: "Completed", value: completedProjects, icon: CheckCircle, bgColor: "bg-emerald-50", textColor: "text-emerald-600" },
    { label: "Active Clients", value: uniqueClients.length, icon: Users, bgColor: "bg-purple-50", textColor: "text-purple-600" },
  ];

  const mockSessions = [
    { id: 1, expert: "Sarah Johnson", role: "UX Research Lead", date: "Dec 6, 2024", time: "2:00 PM - 3:00 PM", topic: "User Interview Best Practices", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" },
    { id: 2, expert: "Michael Chen", role: "Design Strategy Expert", date: "Dec 8, 2024", time: "10:00 AM - 11:00 AM", topic: "Ideation Workshop Planning", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" },
    { id: 3, expert: "Emily Rodriguez", role: "Prototype Specialist", date: "Dec 10, 2024", time: "3:00 PM - 4:00 PM", topic: "Rapid Prototyping Techniques", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}><Icon className={`w-6 h-6 ${stat.textColor}`} /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsByClient.map((client, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div><h3 className="font-semibold text-gray-900 mb-2">{client.name}</h3><p className="text-sm text-gray-600">{client.totalProjects} Projects</p></div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">{client.name.charAt(0)}</div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Completed</span><span className="font-medium text-emerald-600">{client.completed}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-gray-600">In Progress</span><span className="font-medium text-amber-600">{client.inProgress}</span></div>
              </div>
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {client.projects.slice(0, 2).map((project, idx) => (
                  <div key={idx} onClick={() => onProjectClick(project)} className="text-sm text-gray-700 hover:text-purple-600 cursor-pointer flex items-center gap-2 group">
                    <div className={`w-2 h-2 rounded-full ${project.status === "Completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className="truncate group-hover:underline">{project.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Upcoming Expert Sessions</h2>
          <button onClick={onExpertsClick} className="text-sm text-purple-600 hover:text-purple-700 font-medium">View All Sessions →</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mockSessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <img src={session.avatar} alt={session.expert} className="w-12 h-12 rounded-full object-cover" />
                <div><h3 className="font-semibold text-gray-900 mb-1">{session.expert}</h3><p className="text-sm text-gray-600">{session.role}</p></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4" /><span>{session.date}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-4 h-4" /><span>{session.time}</span></div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-3">{session.topic}</p>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Join Session</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
