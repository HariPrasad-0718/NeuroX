export async function generateBrd({ projectId, forceRegenerate = false, businessOwner, productOwner, engineeringLead, complianceOwner, endUsers, budgetRange, expectedTimeline, regulatoryRequirements, fetchImpl = fetch }) {
  const res = await fetchImpl("/api/generate-brd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: Number(projectId),
      forceRegenerate,
      regenerate: forceRegenerate,
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

export async function getExistingBrd({ projectId, fetchImpl = fetch }) {
  const res = await fetchImpl(`/api/generate-brd?projectId=${projectId}`);
  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}

export async function updateBrd({
  projectId,
  brdDocument,
  businessOwner,
  productOwner,
  engineeringLead,
  complianceOwner,
  endUsers,
  budgetRange,
  expectedTimeline,
  regulatoryRequirements,
  fetchImpl = fetch,
}) {
  const res = await fetchImpl("/api/generate-brd", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: Number(projectId),
      brdDocument,
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
