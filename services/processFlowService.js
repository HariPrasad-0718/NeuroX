export async function generateProcessFlow({ projectId, regenerate = false, fetchImpl = fetch }) {
  const res = await fetchImpl("/api/generate-process-flow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, regenerate }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}
