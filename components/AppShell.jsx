"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@/services/api";
import { useMemo } from "react";

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const _pathProjectId = pathname.split("/projects/")[1]?.split("/")[0];
  const _searchProjectId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("projectId")
    : null;
  const projectId = _pathProjectId || _searchProjectId || null;

  const [userId, setUserId] = useState("");
  const [userPersona, setUserPersona] = useState("designer");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userCreatedAt, setUserCreatedAt] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [projectProgressData, setProjectProgressData] = useState(null);
  

  const {
    userData: realUserData,
    isUpdating: isUpdatingUser,
    updateUser,
  } = useCurrentUser();

  const {
    updateProject,
    refetch: refetchProjects,
  } = useProjects(userId, { requireUserId: false });

  // Restore session from secure auth cookie
  useEffect(() => {
    const isAuthPage = pathname === "/login" || pathname === "/signup";

    const bootstrapSession = async () => {
      try {
        const response = await api.getSessionUser();
        if (!response?.success || !response?.data?.userId) {
          if (!isAuthPage) {
            router.push("/login");
          }
          return;
        }

        const user = response.data;
        setUserId(String(user.userId));
        setUserPersona(String(user.role || "designer").toLowerCase());
        setUserName(user.name || "User");
        setUserEmail(user.email || "");
        setUserCreatedAt(user.createdAt || "");
      } catch {
        if (!isAuthPage) {
          router.push("/login");
        }
      }
    };

    bootstrapSession();
  }, [pathname, router]);

  // Update state from real user data
  useEffect(() => {
    if (realUserData) {
      setUserId(String(realUserData.userId || ""));
      setUserName(realUserData.name);
      setUserEmail(realUserData.email);
      setUserPersona(String(realUserData.role || "designer").toLowerCase());
      setUserCreatedAt(realUserData.createdAt);
    }
  }, [realUserData]);

  useEffect(() => {
  const fetchProjectProgress = async () => {
    if (!projectId) return;

    try {
      const response = await fetch(
  `/api/projects/${projectId}/progress`
);

if (!response.ok) {
  console.error(
    "Failed to fetch progress:",
    response.status
  );
  return;
}

const text = await response.text();

if (!text) {
  console.error("Empty response from API");
  return;
}

const data = JSON.parse(text);

if (data?.success) {
  setProjectProgressData(data.data);
}
    } catch (err) {
      console.error(
        "Failed to fetch project progress",
        err
      );
    }
  };

  fetchProjectProgress();

  const handler = () => fetchProjectProgress();
  window.addEventListener('neurox:progress-updated', handler);
  return () => window.removeEventListener('neurox:progress-updated', handler);
}, [projectId, pathname]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      router.push("/login");
    }
  };

  const handleProfileUpdate = async (updatedData) => {
    const result = await updateUser(updatedData);
    if (result.success) {
      setUserName(result.data.name);
      setUserEmail(result.data.email);
      setUserPersona(String(result.data.role || "designer").toLowerCase());
      setShowEditProfileModal(false);
      setShowProfileModal(false);
      alert("Profile updated successfully!");
    } else {
      alert(`Update failed: ${result.error}`);
    }
  };

  // Listen for edit-project events dispatched from dashboard cards/list rows
  useEffect(() => {
    const handler = async (e) => {
      const projectId = e.detail?.projectId;
      if (!projectId) return;
      try {
        const res = await api.getFullProject(projectId);
        if (res.success) {
          setEditingProject(res.data);
          setShowCreateModal(true);
        }
      } catch (err) {
        console.error("Failed to load project for editing:", err);
      }
    };
    window.addEventListener("neurox:edit-project", handler);
    return () => window.removeEventListener("neurox:edit-project", handler);
  }, []);

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
        personas: projectData.personas   // ✅ THIS FIXES EVERYTHING
      };

      console.log("FINAL DATA SENT TO API:", apiData); // ✅ debug

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

  // Don't render shell on auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex overflow-x-hidden">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 ml-[240px] min-w-0 overflow-x-hidden">
       <Header
  userName={userName}
  userPersona={
    userPersona === "manager"
      ? "Manager"
      : "Designer"
  }
  onCreateProject={() =>
    setShowCreateModal(true)
  }
  onOpenProfile={() =>
    setShowProfileModal(true)
  }
  projectProgressData={projectProgressData}
/>

        <div className="min-w-0 max-w-full overflow-x-hidden pt-[73px]">{children}</div>
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
        userData={{ name: userName, email: userEmail, role: userPersona === "manager" ? "Manager" : "Designer", createdAt: userCreatedAt }}
        onEdit={() => {
          setShowProfileModal(false);
          setShowEditProfileModal(true);
        }}
      />

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        userData={{ name: userName, email: userEmail, role: userPersona, userId: realUserData?.userId || userId }}
        onSave={handleProfileUpdate}
        isUpdating={isUpdatingUser}
      />
    </div>
  );
}








