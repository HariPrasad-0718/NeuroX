export async function generatePrd({ projectId, forceRegenerate = false, fetchImpl = fetch }) {
  const res = await fetchImpl("/api/generate-prd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: Number(projectId),
      forceRegenerate,
    }),
  });

  const bodyText = await res.text();
  let data = null;

  try {
    data = JSON.parse(bodyText);
  } catch {
    data = null;
  }

  return { res, data, bodyText };
}

export async function getExistingPrd({ projectId, fetchImpl = fetch }) {
  const res = await fetchImpl(`/api/generate-prd?projectId=${projectId}`);
  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}
