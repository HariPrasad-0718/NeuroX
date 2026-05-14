"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";

export function useProjects(userId, options = {}) {
  const {
    requireUserId = true,
    recentOnly = false,
    limit,
  } = options;

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectError, setProjectError] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProjects = async () => {
    if (requireUserId && !userId) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getProjects(userId, {
        recentOnly,
        limit,
      });
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectById = async (projectId) => {
    if (!projectId) return { success: false, error: "No project ID" };
    setIsLoadingProject(true);
    setProjectError(null);

    try {
      const response = await api.getProjectById(projectId);
      if (response.success && response.data) {
        setCurrentProject(response.data);
        return { success: true, data: response.data };
      }
      throw new Error(response.error?.message || "Failed to fetch project");
    } catch (err) {
      setProjectError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoadingProject(false);
    }
  };

  const updateProject = async (projectId, projectData) => {
    setUpdateLoading(true);
    try {
      const response = await api.updateProject(projectId, projectData, userId || "");
      if (response.success) {
        setProjects((prev) =>
          prev.map((p) => (p.projectId === projectId ? response.data : p))
        );
        return { success: true, data: response.data };
      }
      throw new Error(response.error?.message || "Failed to update project");
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setUpdateLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    setDeleteLoading(true);
    try {
      const response = await api.deleteProject(projectId, userId || "");
      if (response.success) {
        setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
        return { success: true };
      }
      throw new Error(response.error?.message || "Failed to delete project");
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    currentProject,
    isLoadingProject,
    projectError,
    fetchProjectById,
    updateProject,
    updateLoading,
    deleteProject,
    deleteLoading,
  };
}
