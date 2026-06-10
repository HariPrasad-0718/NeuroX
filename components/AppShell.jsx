"use client";
//meow
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@/services/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AppShell({ children }) {
  const pathname = usePathname();

  // ─── Auth — single source of truth from AuthContext ───────────────────────
  const { user, isLoading: isAuthLoading, isUpdating, updateUser, logout } = useAuth();

  const userId    = user?.userId    ?? "";
  const userName  = user?.name      ?? "User";
  const userEmail = user?.email     ?? "";
  const userRole  = user?.role      ?? "designer";
  const userCreatedAt = user?.createdAt ?? "";

  // ─── UI-only state (modals, project progress) ─────────────────────────────
  const [showCreateModal,    setShowCreateModal]    = useState(false);
  const [editingProject,     setEditingProject]     = useState(null);
  const [showProfileModal,   setShowProfileModal]   = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [projectProgressData, setProjectProgressData] = useState(null);

  // Derive projectId from URL — either /projects/[id]/... or ?projectId=
  const _pathProjectId =
    pathname.split("/projects/")[1]?.split("/")[0] ?? null;
  const _searchProjectId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("projectId")
      : null;
  const projectId = _pathProjectId || _searchProjectId || null;

  // ─── Projects ─────────────────────────────────────────────────────────────
  const { updateProject, refetch: refetchProjects } = useProjects(userId, {
    requireUserId: false,
  });

  // ─── Project progress polling ─────────────────────────────────────────────
  useEffect(() => {
    const fetchProjectProgress = async () => {
      if (!projectId) return;
      try {
        const response = await fetch(`/api/projects/${projectId}/progress`);
        if (!response.ok) return;
        const text = await response.text();
        if (!text) return;
        const data = JSON.parse(text);
        if (data?.success) setProjectProgressData(data.data);
      } catch {
        // Non-critical — silently ignore
      }
    };

    fetchProjectProgress();

    const handler = () => fetchProjectProgress();
    window.addEventListener("neurox:progress-updated", handler);
    return () => window.removeEventListener("neurox:progress-updated", handler);
  }, [projectId, pathname]);

  // ─── Edit-project event from dashboard cards ──────────────────────────────
  useEffect(() => {
    const handler = async (e) => {
      const id = e.detail?.projectId;
      if (!id) return;
      try {
        const res = await api.getFullProject(id);
        if (res.success) {
          setEditingProject(res.data);
          setShowCreateModal(true);
        }
      } catch {
        // Non-critical
      }
    };
    window.addEventListener("neurox:edit-project", handler);
    return () => window.removeEventListener("neurox:edit-project", handler);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleProfileUpdate = async (updatedData) => {
    const result = await updateUser(updatedData);
    if (result.success) {
      setShowEditProfileModal(false);
      setShowProfileModal(false);
      alert("Profile updated successfully!");
    } else {
      alert(`Update failed: ${result.error}`);
    }
  };

  const handleCreateProject = async (projectData) => {
    if (editingProject?.projectId) {
      try {
        const result = await api.updateProjectById(editingProject.projectId, projectData);
        if (result.success) {
          refetchProjects();
          window.dispatchEvent(new Event("neurox:projects-updated"));
        } else {
          alert(`Failed to update: ${result.error?.message || result.error}`);
        }
      } catch (err) {
        alert(`Failed to update: ${err.message}`);
      }
    } else {
      try {
       const apiData = {
  projectName: projectData.title,
  projectDescription: projectData.description,
  clientName: projectData.company,
  startDate: projectData.startDate,
  endDate: projectData.targetDate,
  domain: projectData.domain || "",

  personas: projectData.personas.map((persona) => ({
    persona_name: persona.name,
    persona_description: persona.description,
  })),
};

console.log("Project payload:", apiData);
console.log(
  "Personas formatted:",
  JSON.stringify(apiData.personas, null, 2)
);
        
        const response = await api.createProject(apiData, userId);
        if (response.success) {
          refetchProjects();
          window.dispatchEvent(new Event("neurox:projects-updated"));
          alert("Project created successfully!");
        }
      } catch (error) {
        alert(`Error creating project: ${error.message}`);
      }
    }

    setShowCreateModal(false);
    setEditingProject(null);
  };

  // ─── Don't render shell on auth pages ─────────────────────────────────────
  if (pathname === "/login" || pathname === "/signup") {
    return children;
  }

  // Show nothing while the initial auth check is in-flight (avoids flash)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex overflow-x-hidden">
      <Sidebar onLogout={logout} />

      <div className="flex-1 ml-[240px] min-w-0 overflow-x-hidden">
        <Header
          userName={userName}
          userPersona={userRole === "manager" ? "Manager" : "Designer"}
          onCreateProject={() => setShowCreateModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          projectProgressData={projectProgressData}
        />
        <div className="min-w-0 max-w-full overflow-x-hidden pt-[73px]">
          <ErrorBoundary label="Page">
            {children}
          </ErrorBoundary>
        </div>
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingProject(null);
        }}
        onCreateProject={handleCreateProject}
        editingProject={editingProject}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userData={{
          name:      userName,
          email:     userEmail,
          role:      userRole === "manager" ? "Manager" : "Designer",
          createdAt: userCreatedAt,
        }}
        onEdit={() => {
          setShowProfileModal(false);
          setShowEditProfileModal(true);
        }}
      />

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        userData={{ name: userName, email: userEmail, role: userRole, userId }}
        onSave={handleProfileUpdate}
        isUpdating={isUpdating}
      />
    </div>
  );
}
