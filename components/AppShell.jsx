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

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [userId, setUserId] = useState("");
  const [userPersona, setUserPersona] = useState("Designer");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userCreatedAt, setUserCreatedAt] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const {
    userData: realUserData,
    isUpdating: isUpdatingUser,
    updateUser,
  } = useCurrentUser(userId);

  const {
    updateProject,
    refetch: refetchProjects,
  } = useProjects(userId);

  // Restore session on mount
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    const storedUserId = localStorage.getItem("userId");

    if (storedRole && storedUserId) {
      setUserPersona(storedRole);
      setUserId(storedUserId);
      setUserName(storedRole === "Designer" ? "Designer User" : "Manager User");
      setUserEmail(`${storedRole.toLowerCase()}@neurox.com`);
    } else if (pathname !== "/login") {
      router.push("/login");
    }
  }, []);

  // Update state from real user data
  useEffect(() => {
    if (realUserData) {
      setUserName(realUserData.name);
      setUserEmail(realUserData.email);
      setUserCreatedAt(realUserData.createdAt);
    }
  }, [realUserData]);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    router.push("/login");
  };

  const handleProfileUpdate = async (updatedData) => {
    const result = await updateUser(updatedData);
    if (result.success) {
      setUserName(result.data.name);
      setUserEmail(result.data.email);
      setUserPersona(result.data.role);
      setShowEditProfileModal(false);
      setShowProfileModal(false);
      alert("Profile updated successfully!");
    } else {
      alert(`Update failed: ${result.error}`);
    }
  };

  const handleCreateProject = async (projectData) => {
    if (editingProject?.projectId) {
      const result = await updateProject(editingProject.projectId, projectData);
      if (result.success) {
        refetchProjects();
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    } else {
      try {
        const projectUUID = crypto.randomUUID();
        const apiData = {
          projectId: projectUUID,
          projectName: projectData.title,
          projectDescription: projectData.description,
          status: "In Progress",
          client: projectData.company,
          startDate: projectData.startDate,
          targetCompletionDate: projectData.targetDate,
        };

        const response = await api.createProject(apiData, userId);
        if (response.success) {
          refetchProjects();
          alert("Project created successfully!");
        }
      } catch (error) {
        alert(`Error creating project: ${error.message}`);
      }
    }

    setShowCreateModal(false);
    setEditingProject(null);
  };

  // Don't render shell on login page
  if (pathname === "/login") {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 ml-[240px]">
        <Header
          userName={userName}
          userPersona={userPersona}
          onCreateProject={() => setShowCreateModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />

        <div className="p-8">{children}</div>
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
        userData={{ name: userName, email: userEmail, role: userPersona, createdAt: userCreatedAt }}
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
