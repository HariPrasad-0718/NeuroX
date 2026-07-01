export async function generateInformationArchitecture({ projectId, combinedPersonaOutput = "", regenerate = false, fetchImpl = fetch }) {
  const res = await fetchImpl("/api/generate-information-architecture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      combinedPersonaOutput,
      regenerate,
    }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}
