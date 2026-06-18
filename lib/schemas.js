import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────

export const positiveInt = z.coerce
  .number({ invalid_type_error: "Must be a number" })
  .int("Must be a whole number")
  .positive("Must be a positive number");

export const nonEmptyString = z.string().min(1, "Cannot be empty").trim();

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["designer", "manager"], {
    errorMap: () => ({ message: "Role must be designer or manager" }),
  }),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
  role: z.enum(["designer", "manager"], {
    errorMap: () => ({ message: "Role must be designer or manager" }),
  }),
});

// ─────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(150).trim(),
  projectDescription: z.string().max(4000).trim().optional().default(""),
  clientName: z.string().max(150).trim().optional().default(""),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  domain: z.string().max(100).trim().optional().default(""),
  personas: z
    .array(
      z.object({
        persona_name: z.string().min(1).max(150),
        persona_description: z.string().max(2000).optional().default(""),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

// ─────────────────────────────────────────────────────────────
// Personas
// ─────────────────────────────────────────────────────────────

export const createPersonaSchema = z.object({
  projectId: positiveInt,
  persona_name: z.string().min(1, "Persona name is required").max(150).trim(),
  persona_description: z.string().max(2000).trim().optional().default(""),
});

export const patchPersonaSchema = z.object({
  personaId: positiveInt,
  personaDescription: z
    .string()
    .min(1, "Persona description cannot be empty")
    .max(4000)
    .trim(),
});

// ─────────────────────────────────────────────────────────────
// Interviewees
// ─────────────────────────────────────────────────────────────

export const createIntervieweeSchema = z.object({
  personaId: positiveInt,
  name: z.string().min(1, "Name is required").max(150).trim(),
  gender: z.string().max(50).trim().optional().default(""),
  age: z.coerce.number().int().positive().max(130).optional().nullable(),
  location: z.string().max(150).trim().optional().default(""),
  relationship_status: z.string().max(100).trim().optional().default(""),
  title: z.string().max(150).trim().optional().default(""),
  education: z.string().max(200).trim().optional().default(""),
});

// ─────────────────────────────────────────────────────────────
// AI Generation
// ─────────────────────────────────────────────────────────────

export const generateQuestionsSchema = z.object({
  personaId: positiveInt,
  projectName: z.string().min(1),

  description: z.string(),
  user_group: z.string(),
  persona_description: z.string(),
});

export const generatePersonaSchema = z.object({
  interviewId: positiveInt,
  transcript: z.string().min(1, "Transcript is required").max(20000).trim(),
});

export const enhancePersonaSchema = z.object({
  project_description: z
    .string()
    .min(1, "project_description is required")
    .max(4000)
    .trim(),
  persona_title: z
    .string()
    .min(1, "persona_title is required")
    .max(150)
    .trim(),
  persona_description: z.string().max(2000).trim().optional().default(""),
});

// generate-persona-card takes a large empathy context blob, not just projectId
export const generatePersonaCardSchema = z.object({
  empathy_data_and_context: z
    .string()
    .min(1, "empathy_data_and_context is required")
    .max(30000)
    .trim(),
});

export const generateProcessFlowSchema = z.object({
  projectId: positiveInt,
  regenerate: z.boolean().optional().default(false),
});

export const generateIASchema = z.object({
  projectId: positiveInt,
  combinedPersonaOutput: z.string().max(30000).trim().optional().default(""),
  regenerate: z.boolean().optional().default(false),
});

// UX journey takes a persona payload — project_description is required, rest optional
export const generateUXJourneySchema = z.object({
  project_description: z.string().min(1, "project_description is required").max(4000).trim(),
  persona_name: z.string().max(150).trim().optional().default("User Persona"),
  empathy_map: z.string().max(15000).trim().optional().default(""),
  background: z.string().max(4000).trim().optional().default(""),
  demographics: z.string().max(2000).trim().optional().default(""),
  personality: z.string().max(2000).trim().optional().default(""),
  goals: z.string().max(4000).trim().optional().default(""),
  frustrations: z.string().max(4000).trim().optional().default(""),
  motivations: z.string().max(4000).trim().optional().default(""),
  needs: z.string().max(4000).trim().optional().default(""),
  scenario: z.string().max(4000).trim().optional().default(""),
  previous_experience: z.string().max(4000).trim().optional().default(""),
  behaviours_habits: z.string().max(4000).trim().optional().default(""),
});

export const generateAppBuildPromptSchema = z.object({
  projectId: positiveInt,
});

export const generateBRDSchema = z.object({
  projectId: positiveInt,
});

export const generatePRDSchema = z.object({
  projectId: positiveInt,
  forceRegenerate: z.boolean().optional().default(false),
});

export const descriptionSchema = z.object({
  project_description: z.string().max(4000).trim().optional().default(""),
  user_answers: z.string().max(20000).trim().optional().default(""),
  persona_description: z.string().max(4000).trim().optional().default(""),
  persona_title: z.string().max(150).trim().optional().default(""),
  persona_name: z.string().max(150).trim().optional().default(""),
  interview_id: z.coerce.number().int().positive().optional().nullable(),
});

export const saveGeneratedPersonaSchema = z.object({
  projectId: positiveInt,
  problemStatement: z.string().max(4000).trim().optional().default(""),
  personas: z
    .array(z.record(z.unknown()))
    .max(20)
    .optional()
    .default([]),
});

// ─────────────────────────────────────────────────────────────
// Interviews / transcript
// ─────────────────────────────────────────────────────────────

export const generatePersonaFromTranscriptSchema = z.object({
  interviewId: positiveInt,
  transcript: z.string().max(30000).trim().optional().default(""),
});

export const updateTranscriptSchema = z.object({
  interviewId: positiveInt,
  transcript: z.string().max(30000).trim().optional().default(""),
});

export const updateInterviewSummarySchema = z.object({
  interviewId: positiveInt,
  summary: z.string().min(1, "summary is required").max(10000).trim(),
});

export const updatePersonaOutputSchema = z.object({
  interviewId: positiveInt,
  personaOutput: z.string().min(1, "personaOutput is required").max(30000).trim(),
});

// ─────────────────────────────────────────────────────────────
// Query param schemas (GET requests)
// ─────────────────────────────────────────────────────────────

export const getPersonasQuerySchema = z.object({
  projectId: positiveInt,
  includeGenerated: z.string().optional(),
  groupByInterviewee: z.string().optional(),
  aggregateGenerated: z.string().optional(),
});

export const getIntervieweesQuerySchema = z.object({
  personaId: positiveInt,
});

export const deleteIntervieweeQuerySchema = z.object({
  intervieweeId: positiveInt,
});

export const getProjectQuerySchema = z.object({
  projectId: positiveInt.optional(),
  recent: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
});

// ─────────────────────────────────────────────────────────────
// Project [id] route (uses different field names from /projects)
// ─────────────────────────────────────────────────────────────

export const updateProjectByIdSchema = z.object({
  title: z.string().max(150).trim().optional(),
  projectName: z.string().max(150).trim().optional(),
  description: z.string().max(4000).trim().optional().default(""),
  projectDescription: z.string().max(4000).trim().optional(),
  company: z.string().max(150).trim().optional(),
  clientName: z.string().max(150).trim().optional(),
  client: z.string().max(150).trim().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  domain: z.string().max(100).trim().optional().default(""),
  personas: z
    .array(
      z.object({
        personaId: z.coerce.number().int().positive().optional(),
        name: z.string().min(1).max(150).trim(),
        description: z.string().max(2000).trim().optional().default(""),
      })
    )
    .max(20)
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// Project progress
// ─────────────────────────────────────────────────────────────

export const updateProgressSchema = z.object({
  stage: z.enum(["empathize", "define", "ideate", "prototype", "test"], {
    errorMap: () => ({ message: "Invalid stage" }),
  }),
  progress: z.coerce.number().int().min(0).max(100),
});

// ─────────────────────────────────────────────────────────────
// Users admin
// ─────────────────────────────────────────────────────────────

export const createUserAdminSchema = z.object({
  name: z.string().min(1, "Name is required").max(150).trim(),
  email: z.string().min(1, "Email is required").email("Invalid email").toLowerCase(),
  role: z.enum(["designer", "manager"]).optional().default("designer"),
});

export const updateUserAdminSchema = z.object({
  userId: positiveInt,
  name: z.string().min(1, "Name is required").max(150).trim(),
  email: z.string().min(1, "Email is required").email("Invalid email").toLowerCase(),
  role: z.enum(["designer", "manager"], {
    errorMap: () => ({ message: "Role must be designer or manager" }),
  }),
});
