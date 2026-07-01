export async function generatePersonaCard({ empathyDataAndContext, fetchImpl = fetch }) {
  const res = await fetchImpl("/api/generate-persona-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empathy_data_and_context: empathyDataAndContext }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}
