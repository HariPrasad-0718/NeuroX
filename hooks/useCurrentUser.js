"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";

export function useCurrentUser() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCurrentUser = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getCurrentUser();
      if (response.success && response.data) {
        setUserData(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updatedData) => {
    if (!userData?.userId) {
      return { success: false, error: "No user ID available" };
    }

    setIsUpdating(true);
    try {
      const response = await api.updateUser(updatedData);
      if (response.success && response.data) {
        setUserData(response.data);
        return { success: true, data: response.data };
      }
      throw new Error(response.error?.message || "Failed to update user");
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return {
    userData,
    isLoading,
    error,
    isUpdating,
    updateUser,
    refetch: fetchCurrentUser,
  };
}
