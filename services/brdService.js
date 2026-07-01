export async function generateBrd({ projectId, businessOwner, productOwner, engineeringLead, complianceOwner, endUsers, budgetRange, expectedTimeline, regulatoryRequirements, fetchImpl = fetch }) {
  const res = await fetchImpl("/api/generate-brd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: Number(projectId),
      businessOwner,
      productOwner,
      engineeringLead,
      complianceOwner,
      endUsers,
      budgetRange,
      expectedTimeline,
      regulatoryRequirements,
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
