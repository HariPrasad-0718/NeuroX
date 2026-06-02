/**
 * NeuroX — OpenAPI 3.0 Specification
 *
 * ──────────────────────────────────────────────────────────────────
 * MAINTAINERS: When you add or change an API route you MUST update
 * this file in the same PR/commit. The live Swagger UI at /api-docs
 * is generated directly from this object — out-of-date specs will be
 * caught in code review.
 *
 * Quick-reference update checklist:
 *  1. Add / remove / rename the path under `paths`
 *  2. Add any new request/response schemas under `components.schemas`
 *  3. Tag the endpoint so it appears in the right section of the UI
 *  4. Verify at /api-docs after `npm run dev`
 * ──────────────────────────────────────────────────────────────────
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "NeuroX API",
    description: `
## NeuroX — Design Thinking Platform API

All protected endpoints require a valid session cookie (\`neurox_auth\`) obtained via \`POST /api/auth/login\`.

### Authentication
- Login returns an **HttpOnly cookie** (\`neurox_auth\`) — the browser sends it automatically on every subsequent request.
- The cookie is a signed JWT containing \`userId\`, \`name\`, \`email\`, and \`role\`.

### Response Envelope
Every endpoint returns the same envelope:
\`\`\`json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "message": "Human readable message" } }

// Validation error (400)
{ "success": false, "error": { "message": "Validation failed", "details": [...] } }
\`\`\`

### Rate Limits
| Tier | Limit | Used by |
|------|-------|---------|
| Heavy AI | 5 req/min | Persona card, IA, Process Flow, App-build prompt |
| Standard AI | 15 req/min | Generate persona, Generate questions |
| Light AI | 30 req/min | Enhance persona, Analyze wireframe, Research summary |
    `,
    version: "1.0.0",
    contact: {
      name: "NeuroX Engineering",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current environment",
    },
  ],
  tags: [
    { name: "Authentication", description: "Login, signup, session management" },
    { name: "Projects", description: "Project CRUD and progress tracking" },
    { name: "Personas", description: "Persona management for a project" },
    { name: "Interviewees", description: "Interviewee management for a persona" },
    { name: "AI — Generation", description: "AI-powered generation endpoints (rate-limited)" },
    { name: "AI — Enhancement", description: "AI-powered enhancement & analysis endpoints" },
    { name: "Interviews", description: "Interview data updates" },
    { name: "Stages", description: "Design thinking stages reference data" },
    { name: "Users", description: "User management (admin)" },
    { name: "Templates", description: "Stage templates" },
    { name: "Bookings", description: "Expert bookings (stub — not yet active)" },
    { name: "Documents", description: "Project documents (stub — not yet active)" },
    { name: "Experts", description: "Expert directory (stub — not yet active)" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "neurox_auth",
        description: "JWT session cookie set by POST /api/auth/login",
      },
    },
    schemas: {
      // ──────────────────── Common ────────────────────
      SuccessEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
        },
      },
      ErrorEnvelope: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            required: ["message"],
            properties: {
              message: { type: "string", example: "Not found" },
              details: {
                type: "array",
                items: { type: "object" },
                description: "Present only on 400 validation errors",
              },
            },
          },
        },
      },

      // ──────────────────── Auth ────────────────────
      LoginRequest: {
        type: "object",
        required: ["email", "password", "role"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", minLength: 1, example: "MyPass@123" },
          role: { type: "string", enum: ["designer", "manager"], example: "designer" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              userId: { type: "integer", example: 1 },
              role: { type: "string", example: "designer" },
            },
          },
        },
      },
      SignupRequest: {
        type: "object",
        required: ["name", "email", "password", "role"],
        properties: {
          name: { type: "string", minLength: 2, example: "Jane Designer" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          password: {
            type: "string",
            minLength: 8,
            description: "Must contain uppercase, digit, and special character",
            example: "Secure@123",
          },
          role: { type: "string", enum: ["designer", "manager"], example: "designer" },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          userId: { type: "integer", example: 1 },
          name: { type: "string", example: "Jane Designer" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { type: "string", enum: ["designer", "manager"], example: "designer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UpdateMeRequest: {
        type: "object",
        required: ["name", "email", "role"],
        properties: {
          name: { type: "string", example: "Jane Designer" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { type: "string", enum: ["designer", "manager"], example: "designer" },
        },
      },

      // ──────────────────── Projects ────────────────────
      PersonaInput: {
        type: "object",
        required: ["persona_name"],
        properties: {
          persona_name: { type: "string", maxLength: 150, example: "Healthcare Nurse" },
          persona_description: { type: "string", maxLength: 2000, example: "Frontline nurse managing..." },
        },
      },
      CreateProjectRequest: {
        type: "object",
        required: ["projectName"],
        properties: {
          projectName: { type: "string", maxLength: 150, example: "Hospital App Redesign" },
          projectDescription: { type: "string", maxLength: 4000, example: "Redesigning the patient portal..." },
          clientName: { type: "string", maxLength: 150, example: "HealthCo" },
          startDate: { type: "string", format: "date", nullable: true, example: "2025-01-15" },
          endDate: { type: "string", format: "date", nullable: true, example: "2025-06-30" },
          domain: { type: "string", maxLength: 100, example: "Healthcare" },
          personas: {
            type: "array",
            maxItems: 20,
            items: { $ref: "#/components/schemas/PersonaInput" },
          },
        },
      },
      ProjectDto: {
        type: "object",
        properties: {
          projectId: { type: "integer", example: 42 },
          projectName: { type: "string", example: "Hospital App Redesign" },
          projectDescription: { type: "string" },
          status: { type: "string", example: "In Progress" },
          client: { type: "string", example: "HealthCo" },
          startDate: { type: "string", format: "date" },
          targetCompletionDate: { type: "string", format: "date" },
          domain: { type: "string", example: "Healthcare" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          createdBy: { type: "integer", example: 1 },
        },
      },
      UpdateProjectByIdRequest: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 150 },
          description: { type: "string", maxLength: 4000 },
          company: { type: "string", maxLength: 150 },
          startDate: { type: "string", format: "date", nullable: true },
          endDate: { type: "string", format: "date", nullable: true },
          domain: { type: "string", maxLength: 100 },
          personas: {
            type: "array",
            maxItems: 20,
            items: {
              type: "object",
              properties: {
                personaId: { type: "integer", description: "Omit for new personas" },
                name: { type: "string", maxLength: 150 },
                description: { type: "string", maxLength: 2000 },
              },
              required: ["name"],
            },
          },
        },
      },
      ProjectProgress: {
        type: "object",
        properties: {
          progress: { type: "integer", minimum: 0, maximum: 500, description: "Sum of all 5 stage progress values" },
          completedStages: { type: "array", items: { type: "string" }, example: ["Empathize", "Define"] },
          currentStage: { type: "string", example: "Ideate" },
        },
      },
      UpdateProgressRequest: {
        type: "object",
        required: ["stage", "progress"],
        properties: {
          stage: {
            type: "string",
            enum: ["empathize", "define", "ideate", "prototype", "test"],
            example: "ideate",
          },
          progress: { type: "integer", minimum: 0, maximum: 100, example: 75 },
        },
      },

      // ──────────────────── Personas ────────────────────
      PersonaDto: {
        type: "object",
        properties: {
          persona_id: { type: "integer", example: 7 },
          persona_name: { type: "string", example: "Healthcare Nurse" },
          persona_description: { type: "string" },
        },
      },
      PatchPersonaRequest: {
        type: "object",
        required: ["personaId", "personaDescription"],
        properties: {
          personaId: { type: "integer", example: 7 },
          personaDescription: { type: "string", maxLength: 4000 },
        },
      },

      // ──────────────────── Interviewees ────────────────────
      CreateIntervieweeRequest: {
        type: "object",
        required: ["personaId", "name"],
        properties: {
          personaId: { type: "integer", example: 7 },
          name: { type: "string", maxLength: 150, example: "Alice Smith" },
          gender: { type: "string", maxLength: 50, example: "Female" },
          age: { type: "integer", minimum: 1, maximum: 130, nullable: true, example: 34 },
          location: { type: "string", maxLength: 150, example: "New York, USA" },
          relationship_status: { type: "string", maxLength: 100, example: "Married" },
          title: { type: "string", maxLength: 150, example: "Senior Nurse" },
          education: { type: "string", maxLength: 200, example: "BSc Nursing" },
        },
      },
      IntervieweeDto: {
        type: "object",
        properties: {
          interviewee_id: { type: "integer", example: 12 },
          persona_id: { type: "integer", example: 7 },
          name: { type: "string", example: "Alice Smith" },
          gender: { type: "string", example: "Female" },
          age: { type: "integer", example: 34 },
          location: { type: "string", example: "New York, USA" },
          relationship_status: { type: "string", example: "Married" },
          title: { type: "string", example: "Senior Nurse" },
          education: { type: "string", example: "BSc Nursing" },
        },
      },

      // ──────────────────── AI Generation ────────────────────
      GenerateQuestionsRequest: {
        type: "object",
        required: ["personaId", "description", "user_group"],
        properties: {
          personaId: { type: "integer", example: 7 },
          description: { type: "string", maxLength: 4000, description: "Project description", example: "A hospital patient portal app..." },
          user_group: { type: "string", maxLength: 150, example: "Healthcare Nurse" },
          persona_description: { type: "string", maxLength: 2000, example: "Frontline nurse managing patient care..." },
        },
      },
      GeneratePersonaRequest: {
        type: "object",
        required: ["interviewId", "transcript"],
        properties: {
          interviewId: { type: "integer", example: 5 },
          transcript: { type: "string", maxLength: 20000, example: "Interviewer: Tell me about your day-to-day..." },
        },
      },
      GeneratePersonaCardRequest: {
        type: "object",
        required: ["empathy_data_and_context"],
        properties: {
          empathy_data_and_context: {
            type: "string",
            maxLength: 30000,
            description: "Full empathy map and interview outputs concatenated",
            example: "Persona ID: 7\nPersona Name: Healthcare Nurse\n...",
          },
        },
      },
      GenerateIARequest: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "integer", example: 42 },
          combinedPersonaOutput: { type: "string", maxLength: 30000, description: "Combined persona/interview outputs for richer IA" },
          regenerate: { type: "boolean", default: false, description: "Force re-generation even if cached output exists" },
        },
      },
      GenerateProcessFlowRequest: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "integer", example: 42 },
          regenerate: { type: "boolean", default: false },
        },
      },
      GenerateUXJourneyRequest: {
        type: "object",
        required: ["project_description"],
        properties: {
          project_description: { type: "string", maxLength: 4000, example: "A hospital patient portal app..." },
          persona_name: { type: "string", maxLength: 150, example: "Healthcare Nurse" },
          empathy_map: { type: "string", maxLength: 15000 },
          background: { type: "string", maxLength: 4000 },
          demographics: { type: "string", maxLength: 2000 },
          personality: { type: "string", maxLength: 2000 },
          goals: { type: "string", maxLength: 4000 },
          frustrations: { type: "string", maxLength: 4000 },
          motivations: { type: "string", maxLength: 4000 },
          needs: { type: "string", maxLength: 4000 },
          scenario: { type: "string", maxLength: 4000 },
          previous_experience: { type: "string", maxLength: 4000 },
          behaviours_habits: { type: "string", maxLength: 4000 },
        },
      },
      GenerateAppBuildPromptRequest: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "integer", example: 42 },
        },
      },
      GenerateBRDRequest: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "integer", example: 42 },
        },
      },
      GeneratePRDRequest: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "integer", example: 42 },
        },
      },
      EnhancePersonaRequest: {
        type: "object",
        required: ["project_description", "persona_title"],
        properties: {
          project_description: { type: "string", maxLength: 4000, example: "A hospital patient portal app..." },
          persona_title: { type: "string", maxLength: 150, example: "Healthcare Nurse" },
          persona_description: { type: "string", maxLength: 2000, example: "Frontline nurse..." },
        },
      },
      DescriptionRequest: {
        type: "object",
        properties: {
          project_description: { type: "string", maxLength: 4000 },
          user_answers: { type: "string", maxLength: 20000, description: "Raw interview transcript or answers" },
          persona_description: { type: "string", maxLength: 4000 },
          persona_title: { type: "string", maxLength: 150 },
          persona_name: { type: "string", maxLength: 150 },
          interview_id: { type: "integer", nullable: true },
        },
      },

      // ──────────────────── Interviews ────────────────────
      UpdateInterviewSummaryRequest: {
        type: "object",
        required: ["interviewId", "summary"],
        properties: {
          interviewId: { type: "integer", example: 5 },
          summary: { type: "string", maxLength: 10000, example: "The interviewee highlighted pain points around..." },
        },
      },
      UpdatePersonaOutputRequest: {
        type: "object",
        required: ["interviewId", "personaOutput"],
        properties: {
          interviewId: { type: "integer", example: 5 },
          personaOutput: { type: "string", maxLength: 30000, description: "Full AI-generated persona output JSON or text" },
        },
      },
      SaveGeneratedPersonaRequest: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "integer", example: 42 },
          problemStatement: { type: "string", maxLength: 4000, example: "Nurses need a faster way to..." },
          personas: {
            type: "array",
            maxItems: 20,
            items: { type: "object", additionalProperties: true },
            description: "Array of persona card objects (freeform structure from AI output)",
          },
        },
      },

      // ──────────────────── Stages ────────────────────
      StageDto: {
        type: "object",
        properties: {
          stageId: { type: "string", example: "empathize" },
          stageName: { type: "string", example: "Empathize" },
          sequenceOrder: { type: "integer", example: 1 },
        },
      },

      // ──────────────────── Users ────────────────────
      CreateUserRequest: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: { type: "string", maxLength: 150, example: "Jane Designer" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { type: "string", enum: ["designer", "manager"], default: "designer" },
        },
      },
      UpdateUserRequest: {
        type: "object",
        required: ["userId", "name", "email", "role"],
        properties: {
          userId: { type: "integer", example: 3 },
          name: { type: "string", maxLength: 150, example: "Jane Designer" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { type: "string", enum: ["designer", "manager"], example: "designer" },
        },
      },
      UserDto: {
        type: "object",
        properties: {
          userId: { type: "integer", example: 3 },
          name: { type: "string", example: "Jane Designer" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { type: "string", enum: ["designer", "manager"], example: "designer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },

      // ──────────────────── Templates ────────────────────
      TemplateDto: {
        type: "object",
        properties: {
          templateId: { type: "integer", example: 1 },
          stageId: { type: "string", example: "empathize" },
          stageName: { type: "string", example: "Empathize" },
          templateName: { type: "string", example: "Empathy Map Template" },
          fileUrl: { type: "string", format: "uri", example: "https://storage.example.com/templates/empathy-map.docx" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [],  // Most routes use cookieAuth; set per-path below
  paths: {
    // ═══════════════════════════════════════════════════════
    // AUTHENTICATION
    // ═══════════════════════════════════════════════════════
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login",
        description: "Authenticates the user and sets an HttpOnly session cookie (`neurox_auth`). The cookie is sent automatically on all subsequent requests.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            headers: {
              "Set-Cookie": {
                description: "neurox_auth=<JWT>; HttpOnly; Secure; SameSite=Lax",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          403: { description: "Role mismatch", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Sign up",
        description: "Creates a new user account. Password requirements: ≥8 chars, 1 uppercase, 1 digit, 1 special character.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SignupRequest" } },
          },
        },
        responses: {
          201: {
            description: "Account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: { userId: { type: "integer", example: 1 } },
                    },
                    message: { type: "string", example: "Account created successfully" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          409: { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user",
        description: "Returns the authenticated user's profile. Uses the session cookie; returns 401 if not logged in.",
        security: [],
        responses: {
          200: {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      put: {
        tags: ["Authentication"],
        summary: "Update current user profile",
        description: "Updates name, email, and role for the currently authenticated user.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateMeRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          409: { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout",
        description: "Clears the `neurox_auth` session cookie.",
        security: [],
        responses: {
          200: {
            description: "Logged out",
            content: {
              "application/json": {
                schema: { type: "object", properties: { success: { type: "boolean", example: true } } },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // PROJECTS
    // ═══════════════════════════════════════════════════════
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects (or fetch one by ID)",
        description: "Returns all projects for the authenticated user. Pass `projectId` to fetch a single project. Pass `recent=true` with optional `limit` (default 6, max 20) to get the most recent projects.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "projectId", in: "query", schema: { type: "integer" }, description: "Fetch a specific project by ID" },
          { name: "recent", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Set to `true` to return only recent projects" },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 20, default: 6 }, description: "Number of recent projects to return (only used when `recent=true`)" },
        ],
        responses: {
          200: {
            description: "Project list or single project",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { $ref: "#/components/schemas/ProjectDto" },
                        { type: "array", items: { $ref: "#/components/schemas/ProjectDto" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        description: "Creates a new project. Optionally supply an array of personas — their descriptions are AI-enhanced asynchronously via Agent5i.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateProjectRequest" } },
          },
        },
        responses: {
          200: {
            description: "Created project",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/ProjectDto" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update a project",
        description: "Updates an existing project (ownership-checked). Pass `projectId` as a query parameter.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "projectId", in: "query", required: true, schema: { type: "integer" }, description: "ID of the project to update" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateProjectRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated project",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project",
        description: "Permanently deletes a project and all its cascaded data (personas → interviewees → interviews → questions). Ownership-checked.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "projectId", in: "query", required: true, schema: { type: "integer" }, description: "ID of the project to delete" },
        ],
        responses: {
          200: {
            description: "Deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object", properties: { projectId: { type: "integer", example: 42 } } },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project by ID (with personas)",
        description: "Returns a single project including its associated personas.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Project ID" },
        ],
        responses: {
          200: {
            description: "Project detail with personas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/ProjectDto" },
                        {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            company: { type: "string" },
                            description: { type: "string" },
                            targetDate: { type: "string", format: "date" },
                            personas: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  personaId: { type: "integer" },
                                  name: { type: "string" },
                                  description: { type: "string" },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update project by ID (with persona sync)",
        description: "Updates a project. If `personas` array is provided, existing personas are synced (upserted/deleted) against the supplied list.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Project ID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateProjectByIdRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object", properties: { projectId: { type: "integer" } } },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/projects/{id}/progress": {
      get: {
        tags: ["Projects"],
        summary: "Get project progress",
        description: "Returns stage-level completion percentages and the overall progress sum for a project.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Project ID" },
        ],
        responses: {
          200: {
            description: "Progress data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/ProjectProgress" },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update project progress",
        description: "Updates a single stage's progress value (0–100). Progress is only written if the new value is higher than the current value. Overall progress is automatically recalculated as the sum of all five stage values.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Project ID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateProgressRequest" } },
          },
        },
        responses: {
          200: {
            description: "Progress updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Progress updated successfully" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // PERSONAS
    // ═══════════════════════════════════════════════════════
    "/api/personas": {
      get: {
        tags: ["Personas"],
        summary: "Get personas for a project",
        description: `Returns personas for a given project. Control the shape with query flags:
- Default: returns \`persona_id\`, \`persona_name\`, \`persona_description\`
- \`includeGenerated=true&groupByInterviewee=true\`: enriches each persona with latest interview output per interviewee
- \`aggregateGenerated=true\`: returns full interview data plus \`combinedOutput\` text suitable for AI prompts`,
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "projectId", in: "query", required: true, schema: { type: "integer" }, description: "Project ID" },
          { name: "includeGenerated", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Include AI-generated persona output" },
          { name: "groupByInterviewee", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Group outputs by interviewee (requires includeGenerated=true)" },
          { name: "aggregateGenerated", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Return aggregated combined output suitable for downstream AI calls" },
        ],
        responses: {
          200: {
            description: "Personas list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { type: "array", items: { $ref: "#/components/schemas/PersonaDto" } },
                        {
                          type: "object",
                          properties: {
                            personas: { type: "array", items: { type: "object" } },
                            combinedOutput: { type: "string", description: "Aggregated text for AI consumption" },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      patch: {
        tags: ["Personas"],
        summary: "Update persona description",
        description: "Updates the description of a single persona (ownership-checked via project).",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/PatchPersonaRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated persona",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        personaId: { type: "integer" },
                        personaDescription: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Persona not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // INTERVIEWEES
    // ═══════════════════════════════════════════════════════
    "/api/interviewees": {
      get: {
        tags: ["Interviewees"],
        summary: "List interviewees for a persona",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "personaId", in: "query", required: true, schema: { type: "integer" }, description: "Persona ID" },
        ],
        responses: {
          200: {
            description: "Interviewees list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/IntervieweeDto" } },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["Interviewees"],
        summary: "Create an interviewee",
        description: "Creates an interviewee under a persona and automatically creates an empty interview record.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateIntervieweeRequest" } },
          },
        },
        responses: {
          200: {
            description: "Created interviewee",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/IntervieweeDto" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      delete: {
        tags: ["Interviewees"],
        summary: "Delete an interviewee",
        description: "Deletes an interviewee and cascades to their interview records.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "intervieweeId", in: "query", required: true, schema: { type: "integer" }, description: "Interviewee ID" },
        ],
        responses: {
          200: {
            description: "Deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object", properties: { intervieweeId: { type: "integer" } } },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Interviewee not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // AI — GENERATION
    // ═══════════════════════════════════════════════════════
    "/api/generate-persona": {
      get: {
        tags: ["AI — Generation"],
        summary: "Get existing persona output",
        description: "Returns the saved AI-generated persona output for a given interview (does NOT call the AI).",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "interviewId", in: "query", required: true, schema: { type: "integer" }, description: "Interview ID" },
        ],
        responses: {
          200: {
            description: "Existing persona output",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Interview not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["AI — Generation"],
        summary: "Generate persona from transcript",
        description: "**Rate limit: 15 req/min (Standard AI).** Sends the interview transcript to Agent5i to generate a persona output and summary. Saves both to the interview record.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GeneratePersonaRequest" } },
          },
        },
        responses: {
          200: {
            description: "Generated persona output",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Interview not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-questions": {
      get: {
        tags: ["AI — Generation"],
        summary: "Get question history for an interviewee",
        description: "Returns all past interview sessions and their generated questions for an interviewee.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "intervieweeId", in: "query", required: true, schema: { type: "integer" }, description: "Interviewee ID" },
        ],
        responses: {
          200: {
            description: "Question history grouped by interview session",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["AI — Generation"],
        summary: "Generate interview questions",
        description: "**Rate limit: 15 req/min (Standard AI).** Generates tailored interview questions for a persona. Optionally saves a transcript update. Stores questions in the DB.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GenerateQuestionsRequest" } },
          },
        },
        responses: {
          200: {
            description: "Generated questions",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-persona-card": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate persona card",
        description: "**Rate limit: 5 req/min (Heavy AI).** Sends aggregated empathy data to Agent5i's Persona Creation Agent and returns a structured persona card JSON.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GeneratePersonaCardRequest" } },
          },
        },
        responses: {
          200: {
            description: "Structured persona card",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-information-architecture": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate Information Architecture",
        description: "**Rate limit: 5 req/min (Heavy AI).** Generates an IA JSON tree and summary for the project. Pass `combinedPersonaOutput` for richer context. Set `regenerate: true` to force re-generation.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GenerateIARequest" } },
          },
        },
        responses: {
          200: {
            description: "IA JSON tree + summary",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-process-flow": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate process flow",
        description: "**Rate limit: 5 req/min (Heavy AI).** Generates a ReactFlow-compatible `{ nodes, edges }` process flow diagram for the project. Set `regenerate: true` to bypass cached output.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GenerateProcessFlowRequest" } },
          },
        },
        responses: {
          200: {
            description: "Process flow nodes and edges",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-ux-journey": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate UX journey map",
        description: "**Rate limit: 15 req/min (Standard AI).** Generates a UX journey map as `{ nodes, edges }` from persona context.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GenerateUXJourneyRequest" } },
          },
        },
        responses: {
          200: {
            description: "UX journey nodes and edges",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-app-build-prompt": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate app-build prompt",
        description: "**Rate limit: 5 req/min (Heavy AI).** Generates a structured app-build prompt from the project's full context (persona outputs, IA, process flow, etc.).",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GenerateAppBuildPromptRequest" } },
          },
        },
        responses: {
          200: {
            description: "App build prompt object",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-brd": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate BRD document",
        description: "**Rate limit: 5 req/min (Heavy AI).** Builds a BRD from project data (personas, interviews, insights, IA, process flow) and returns structured BRD content.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GenerateBRDRequest" } },
          },
        },
        responses: {
          200: {
            description: "Generated BRD",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/generate-prd": {
      post: {
        tags: ["AI — Generation"],
        summary: "Generate PRD document",
        description: "**Rate limit: 5 req/min (Heavy AI).** Builds a PRD from the same aggregated project context used by BRD and returns professional PRD HTML output.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/GeneratePRDRequest" } },
          },
        },
        responses: {
          200: {
            description: "Generated PRD output",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // AI — ENHANCEMENT
    // ═══════════════════════════════════════════════════════
    "/api/enhance-persona": {
      post: {
        tags: ["AI — Enhancement"],
        summary: "Enhance persona description",
        description: "**Rate limit: 30 req/min (Light AI).** Uses Agent5i to enrich a raw persona description with more detail.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/EnhancePersonaRequest" } },
          },
        },
        responses: {
          200: {
            description: "Enhanced persona description",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        persona_title: { type: "string" },
                        persona_description: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/analyze-wireframe": {
      post: {
        tags: ["AI — Enhancement"],
        summary: "Analyze wireframe image",
        description: "**Rate limit: 30 req/min (Light AI).** Accepts a wireframe image via `multipart/form-data`, sends it to Agent5i's Wireframe Analyzer Agent, and returns a textual analysis.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: {
                    type: "string",
                    format: "binary",
                    description: "Wireframe image file (PNG, JPG, etc.)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Wireframe analysis text",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "No image uploaded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/description": {
      post: {
        tags: ["AI — Enhancement"],
        summary: "Generate research summary",
        description: "**Rate limit: 30 req/min (Light AI).** Sends interview transcript / persona data to the Research Summary Agent and returns a concise summary. Optionally updates the interview's summary field in the DB.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/DescriptionRequest" } },
          },
        },
        responses: {
          200: {
            description: "Research summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        summary: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          429: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // INTERVIEWS
    // ═══════════════════════════════════════════════════════
    "/api/update-interview-summary": {
      post: {
        tags: ["Interviews"],
        summary: "Update interview summary",
        description: "Saves an edited or AI-generated summary to an interview record (ownership-checked).",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateInterviewSummaryRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object", properties: { interviewId: { type: "integer" } } },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Interview not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/update-persona-output": {
      post: {
        tags: ["Interviews"],
        summary: "Update persona output",
        description: "Saves an edited AI persona output back to the interview record (ownership-checked).",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdatePersonaOutputRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object", properties: { interviewId: { type: "integer" } } },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Interview not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/save-generated-persona": {
      get: {
        tags: ["Interviews"],
        summary: "Get saved generated personas",
        description: "Returns the saved AI-generated persona cards for a project.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "projectId", in: "query", required: true, schema: { type: "integer" }, description: "Project ID" },
        ],
        responses: {
          200: {
            description: "Saved persona cards",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Missing projectId", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["Interviews"],
        summary: "Save generated persona cards",
        description: "Persists AI-generated persona cards (with a problem statement) for a project. Up to 20 persona objects.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SaveGeneratedPersonaRequest" } },
          },
        },
        responses: {
          200: {
            description: "Saved successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // STAGES
    // ═══════════════════════════════════════════════════════
    "/api/stages": {
      get: {
        tags: ["Stages"],
        summary: "Get design thinking stages",
        description: "Returns the 7 design thinking stages as static reference data.",
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: "Stages list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/StageDto" } },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // USERS (admin)
    // ═══════════════════════════════════════════════════════
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users (or fetch one)",
        description: "Returns all users. Pass `?userId=` to fetch a specific user.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "userId", in: "query", schema: { type: "integer" }, description: "Fetch a specific user by ID" },
        ],
        responses: {
          200: {
            description: "User list or single user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { $ref: "#/components/schemas/UserDto" },
                        { type: "array", items: { $ref: "#/components/schemas/UserDto" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create a user (admin)",
        description: "Creates a user without a password — for admin provisioning.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateUserRequest" } },
          },
        },
        responses: {
          200: {
            description: "Created user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserDto" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update a user (admin)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateUserRequest" } },
          },
        },
        responses: {
          200: {
            description: "Updated user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserDto" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // TEMPLATES
    // ═══════════════════════════════════════════════════════
    "/api/templates": {
      get: {
        tags: ["Templates"],
        summary: "List templates",
        description: "Returns all templates, optionally filtered by `stageId` or `templateId`. Pass `?summary=true` for a stage-level count summary.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "stageId", in: "query", schema: { type: "string" }, description: "Filter by stage (e.g. `empathize`)" },
          { name: "templateId", in: "query", schema: { type: "integer" }, description: "Fetch a specific template" },
          { name: "summary", in: "query", schema: { type: "string", enum: ["true"] }, description: "Return a count-per-stage summary instead of full records" },
        ],
        responses: {
          200: {
            description: "Template list or summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      oneOf: [
                        { type: "array", items: { $ref: "#/components/schemas/TemplateDto" } },
                        {
                          type: "array",
                          description: "Summary mode",
                          items: {
                            type: "object",
                            properties: {
                              stageId: { type: "string", example: "empathize" },
                              templateCount: { type: "integer", example: 3 },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/templates/download/{template_id}": {
      get: {
        tags: ["Templates"],
        summary: "Download a template file",
        description: "Streams the template file (DOCX, PDF, etc.) directly from Azure Blob Storage.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "template_id", in: "path", required: true, schema: { type: "integer" }, description: "Template ID" },
        ],
        responses: {
          200: {
            description: "File stream",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
          404: { description: "Template not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════════
    // STUB ROUTES (not yet active)
    // ═══════════════════════════════════════════════════════
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List bookings (stub)",
        description: "⚠️ **Not yet active.** Returns an empty array until the bookings schema is implemented.",
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: "Empty bookings list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create booking (stub)",
        description: "⚠️ **Not yet active.** Returns 501 Not Implemented.",
        security: [{ cookieAuth: [] }],
        responses: {
          501: { description: "Not implemented", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/documents": {
      get: {
        tags: ["Documents"],
        summary: "List documents (stub)",
        description: "⚠️ **Not yet active.** Returns an empty array.",
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: "Empty documents list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Create document (stub)",
        description: "⚠️ **Not yet active.** Returns 501 Not Implemented.",
        security: [{ cookieAuth: [] }],
        responses: {
          501: { description: "Not implemented", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete document (stub)",
        description: "⚠️ **Not yet active.** Returns 501 Not Implemented.",
        security: [{ cookieAuth: [] }],
        responses: {
          501: { description: "Not implemented", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
    "/api/experts": {
      get: {
        tags: ["Experts"],
        summary: "List experts (stub)",
        description: "⚠️ **Not yet active.** Returns an empty array.",
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: "Empty experts list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } } },
          },
          401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
    },
  },
};
