/**
 * Generates the User Research Summary Report
 * by calling the Next.js API.
 */

export async function generateResearchSummary(projectId) {
  try {
    const response = await fetch("/api/research-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Failed to generate Research Summary Report."
      );
    }

    return data;
  } catch (error) {
    console.error("Research Summary API Error:", error);
    throw error;
  }
}