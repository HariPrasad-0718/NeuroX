"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";

export function useDocuments(userId) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getDocuments(userId);
      if (response.success) {
        setDocuments(response.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  return { documents, isLoading, error, refetch: fetchDocuments };
}
