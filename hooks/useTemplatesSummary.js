"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";

export function useTemplatesSummary() {
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getTemplatesSummary();

      if (response.success && response.data) {
        const obj = {};
        response.data.forEach((item) => {
          obj[item.stageId] = item.templateCount;
        });
        setSummary(obj);
      }
    } catch (err) {
      setError(err.message);
      // Fallback
      setSummary({
        empathize: 3, define: 2, ideate: 3,
        prototype: 2, test: 2, implement: 2, adopt: 2,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return { summary, isLoading, error, refetch: fetchSummary };
}
