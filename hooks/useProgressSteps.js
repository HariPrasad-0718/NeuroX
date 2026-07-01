import { useCallback } from "react";

export function useProgressSteps() {
  const runProgressSteps = useCallback(async (steps, setProgress) => {
    setProgress([]);

    for (let i = 0; i < steps.length; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setProgress((prev) => [
        ...prev,
        { label: steps[i], done: i !== steps.length - 1 },
      ]);
    }
  }, []);

  return { runProgressSteps };
}
