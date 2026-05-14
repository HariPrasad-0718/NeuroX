// Frontend API service — calls Next.js API routes at /api/*

const API_BASE = "/api";

async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers, credentials: "include" });

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
  // --- Auth ---
  signup: (payload) =>
    fetchApi("auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    fetchApi("auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () =>
    fetchApi("auth/logout", {
      method: "POST",
    }),

  getSessionUser: () =>
    fetchApi("auth/me", {
      method: "GET",
    }),

  updateCurrentUser: (userData) =>
    fetchApi("auth/me", {
      method: "PUT",
      body: JSON.stringify(userData),
    }),

  // --- Users ---
  getCurrentUser: () =>
    fetchApi("auth/me", { method: "GET" }),

  updateUser: (userData) => fetchApi("auth/me", {
    method: "PUT",
    body: JSON.stringify(userData),
  }),

  // --- Stages ---
  getStages: () => fetchApi("stages", { method: "GET" }),

  // --- Templates ---
  getTemplates: () =>
    fetchApi("templates", { method: "GET" }),

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
  getProjects: (userId, options = {}) => {
    const params = new URLSearchParams();

    if (userId) params.set("userId", userId);
    if (options.recentOnly) params.set("recent", "true");
    if (options.limit) params.set("limit", String(options.limit));

    const query = params.toString();
    return fetchApi(query ? `projects?${query}` : "projects", { method: "GET" });
  },

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
