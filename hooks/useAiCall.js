import { useCallback, useEffect, useRef, useState } from "react";

export function useAiCall({
  onStart,
  onSuccess,
  onError,
  resetOnExecute = false,
  cleanup = null,
} = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const cleanupRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const execute = useCallback(async (runner, options = {}) => {
    if (resetOnExecute) {
      setError("");
    }

    setIsLoading(true);

    if (typeof onStart === "function") {
      onStart(options);
    }

    try {
      const result = await runner(options);
      if (typeof onSuccess === "function") {
        onSuccess(result, options);
      }
      return result;
    } catch (err) {
      const message = err?.message || "Request failed";
      setError(message);
      if (typeof onError === "function") {
        onError(err, options);
      }
      throw err;
    } finally {
      setIsLoading(false);
      if (typeof cleanup === "function") {
        cleanupRef.current = cleanup;
      }
    }
  }, [cleanup, onError, onStart, onSuccess, resetOnExecute]);

  return { execute, isLoading, error, setError, setIsLoading };
}
