// Frontend API service — calls Next.js API routes at /api/*

const API_BASE = "/api";

async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API ${endpoint} failed:`, error.message);
    throw error;
  }
}

export const api = {
  // --- Users ---
  getCurrentUser: (userId) =>
    fetchApi(`users?userId=${userId}`, { method: "GET" }),

  updateUser: (userId, userData, requestingUserId) =>
    fetchApi(`users?userId=${requestingUserId}`, {
      method: "PUT",
      body: JSON.stringify({ userId, ...userData }),
    }),

  // --- Stages ---
  getStages: () => fetchApi("stages", { method: "GET" }),

  // --- Templates ---
  getTemplatesByStage: (stageId) =>
    fetchApi(`templates?stageId=${stageId}`, { method: "GET" }),

  getTemplateById: (templateId) =>
    fetchApi(`templates?templateId=${templateId}`, { method: "GET" }),

  getTemplatesSummary: () =>
    fetchApi("templates?summary=true", { method: "GET" }),

  // --- Documents ---
  getDocuments: (userId) =>
    fetchApi(`documents?userId=${userId}`, { method: "GET" }),

  createDocument: (documentData) =>
    fetchApi("documents", {
      method: "POST",
      body: JSON.stringify(documentData),
    }),

  deleteDocument: (documentId) =>
    fetchApi(`documents?documentId=${documentId}`, { method: "DELETE" }),

  // --- Experts ---
  getExperts: () => fetchApi("experts", { method: "GET" }),

  // --- Bookings ---
  createBooking: (bookingData, userId) =>
    fetchApi(`bookings?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify(bookingData),
    }),

  getBookingsByExpert: (expertId, userId) =>
    fetchApi(`bookings?expertId=${expertId}&userId=${userId}`, {
      method: "GET",
    }),

  // --- Projects ---
  getProjects: () => fetchApi("projects", { method: "GET" }),

  getProjectById: (projectId) =>
    fetchApi(`projects?projectId=${projectId}`, { method: "GET" }),

  createProject: (projectData, userId) =>
    fetchApi(`projects?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify(projectData),
    }),

  updateProject: (projectId, projectData, userId) =>
    fetchApi(`projects?projectId=${projectId}&userId=${userId}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    }),

  deleteProject: (projectId, userId) =>
    fetchApi(`projects?projectId=${projectId}&userId=${userId}`, {
      method: "DELETE",
    }),
};
