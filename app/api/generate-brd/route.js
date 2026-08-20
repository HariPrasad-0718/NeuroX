import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { aiHeavyLimiter, rateLimitedResponse } from "@/lib/rateLimit";
import { validateBody } from "@/lib/validate";
import { generateBRDSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL ||
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const USERNAME = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
const PASSWORD = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";
const BRD_AGENT_NAME = process.env.AGENT5I_BRD_AGENT_NAME || "BRD Generator Agent";

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripMarkdownFence(value) {
  const text = String(value || "").trim();
  return text
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

function extractJsonObjectString(value) {
  const text = String(value || "");
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function extractBalancedJsonObjectString(value) {
  const text = String(value || "");
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function unwrapQuotedJson(value) {
  const text = String(value || "").trim();
  if (text.length < 2) return text;

  const startsWithDouble = text.startsWith('"') && text.endsWith('"');
  const startsWithSingle = text.startsWith("'") && text.endsWith("'");
  if (!startsWithDouble && !startsWithSingle) return text;

  const inner = text.slice(1, -1);
  return inner
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function tryParseJsonString(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const cleaned = stripMarkdownFence(value);

  const attempts = [cleaned];
  const unwrapped = unwrapQuotedJson(cleaned);
  if (unwrapped !== cleaned) attempts.push(unwrapped);

  for (const attempt of attempts) {
    let candidate = attempt;
    for (let i = 0; i < 3; i += 1) {
      const parsed = tryParseJson(candidate);
      if (parsed && typeof parsed === "object") return parsed;
      if (typeof parsed === "string") {
        candidate = parsed;
        continue;
      }
      break;
    }
  }

  // Mirrors Flask unicode_escape pass.
  const unicodeExpanded = cleaned
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
  if (unicodeExpanded !== cleaned) {
    const parsedUnicode = tryParseJson(unicodeExpanded);
    if (parsedUnicode) return parsedUnicode;
  }

  const balanced = extractBalancedJsonObjectString(cleaned);
  if (balanced) {
    const parsedBalanced = tryParseJson(balanced);
    if (parsedBalanced) return parsedBalanced;
  }

  const extracted = extractJsonObjectString(cleaned);
  if (extracted) {
    const parsedExtracted = tryParseJson(extracted);
    if (parsedExtracted) return parsedExtracted;
  }

  return null;
}

function parseBrdDocument(brdDocRaw) {
  if (brdDocRaw && typeof brdDocRaw === "object") return brdDocRaw;

  if (typeof brdDocRaw === "string") {
    const balanced = extractBalancedJsonObjectString(brdDocRaw);
    if (balanced) {
      const parsedBalanced = tryParseJsonString(balanced);
      if (parsedBalanced && typeof parsedBalanced === "object") return parsedBalanced;
    }
  }

  const parsed = tryParseJsonString(brdDocRaw);
  if (parsed?.brd_document) return parseBrdDocument(parsed.brd_document);
  if (parsed && typeof parsed === "object") return parsed;
  return null;
}

function extractQuotedFieldValue(text, fieldName) {
  if (typeof text !== "string" || !fieldName) return null;

  const singleQuoted = new RegExp(
    `${fieldName}\\s*=\\s*'((?:\\\\'|[^'])*)'`
  );
  const singleMatch = text.match(singleQuoted);
  if (singleMatch?.[1]) {
    return singleMatch[1].replace(/\\'/g, "'");
  }

  const doubleQuoted = new RegExp(
    `${fieldName}\\s*=\\s*\"((?:\\\\\"|[^\"])*)\"`
  );
  const doubleMatch = text.match(doubleQuoted);
  if (doubleMatch?.[1]) {
    return doubleMatch[1].replace(/\\\"/g, '"');
  }

  return null;
}

function looksLikeBrdObject(value) {
  if (!value || typeof value !== "object") return false;
  return (
    Boolean(value.document_meta) ||
    typeof value.business_problem === "string" ||
    Array.isArray(value.business_requirements)
  );
}

function scoreBrdCandidate(brdDoc) {
  if (!brdDoc || typeof brdDoc !== "object") return -1;
  let score = 0;

  const projectName = String(brdDoc?.document_meta?.project_name || "").toLowerCase();
  if (projectName && projectName !== "not provided in input") score += 10;
  if (typeof brdDoc.business_problem === "string" && brdDoc.business_problem.length > 60)
    score += 3;
  if (brdDoc.business_problem && typeof brdDoc.business_problem === "object")
    score += 3;
  if (Array.isArray(brdDoc.business_requirements) && brdDoc.business_requirements.length > 0)
    score += 3;
  if (Array.isArray(brdDoc?.functional_scope?.business_requirements) && brdDoc.functional_scope.business_requirements.length > 0)
    score += 3;

  return score;
}

function tryExtractBrdPayloadFromMessageString(message) {
  if (typeof message !== "string") return null;

  const contentField = extractQuotedFieldValue(message, "content");
  if (contentField) {
    const parsedContent = tryParseJsonString(contentField);
    if (parsedContent && typeof parsedContent === "object") return parsedContent;
  }

  const brdField = extractQuotedFieldValue(message, "brd_document");
  if (brdField) {
    return { brd_document: brdField };
  }

  const direct = tryParseJsonString(message);
  if (direct && typeof direct === "object") return direct;

  const extracted = extractJsonObjectString(message);
  return extracted ? tryParseJsonString(extracted) : null;
}

function extractBrdDocument(result) {
  const candidates = [];

  const addCandidate = (payload, source) => {
    if (!payload) return;

    if (payload && typeof payload === "object" && payload.brd_document) {
      const brdData = parseBrdDocument(payload.brd_document);
      if (brdData) {
        candidates.push({ source, score: scoreBrdCandidate(brdData), brd: brdData });
      }
    }

    if (looksLikeBrdObject(payload)) {
      const brdData = parseBrdDocument(payload);
      if (brdData) {
        candidates.push({ source: `${source}:direct`, score: scoreBrdCandidate(brdData), brd: brdData });
      }
    }
  };

  const messages = result?.response?.messages || [];
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const parsed = tryExtractBrdPayloadFromMessageString(messages[i]);
      addCandidate(parsed, `response.messages[${i}]`);
    }
  }

  const finalResponse = result?.response?.final_response;
  if (typeof finalResponse === "string" && finalResponse.trim()) {
    const fromFinal = tryExtractBrdPayloadFromMessageString(finalResponse);
    addCandidate(fromFinal, "response.final_response");
  }

  const topMessage = result?.message;
  if (topMessage) {
    const parsedTop = tryExtractBrdPayloadFromMessageString(topMessage);
    addCandidate(parsedTop, "message");
  }

  addCandidate(result, "result");

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].brd;

}

function collectBrdExtractionDiagnostics(result) {
  const diagnostics = [];

  const topMessage = result?.message;
  if (topMessage) {
    const parsedTop = tryExtractBrdPayloadFromMessageString(topMessage);
    diagnostics.push({
      source: "message",
      parsed: Boolean(parsedTop),
      hasBrdDocument: Boolean(parsedTop?.brd_document),
      brdDocumentType: typeof parsedTop?.brd_document,
    });
  }

  const finalResponse = result?.response?.final_response;
  if (finalResponse) {
    const parsedFinal = tryExtractBrdPayloadFromMessageString(finalResponse);
    diagnostics.push({
      source: "response.final_response",
      parsed: Boolean(parsedFinal),
      hasBrdDocument: Boolean(parsedFinal?.brd_document),
      brdDocumentType: typeof parsedFinal?.brd_document,
    });
  }

  const messages = result?.response?.messages;
  if (Array.isArray(messages)) {
    diagnostics.push({ source: "response.messages", count: messages.length });
  }

  return diagnostics;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function isMissingText(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text || text === "not provided" || text === "not provided in input" || text === "n/a";
}

function enrichBrdWithStakeholderInput(brdData, stakeholderInput) {
  if (!brdData || typeof brdData !== "object") return brdData;

  const next = { ...brdData };
  const meta = { ...(next.document_meta && typeof next.document_meta === "object" ? next.document_meta : {}) };

  const businessOwner = normalizeText(stakeholderInput?.businessOwner);
  const productOwner = normalizeText(stakeholderInput?.productOwner);
  const engineeringLead = normalizeText(stakeholderInput?.engineeringLead);
  const complianceOwner = normalizeText(stakeholderInput?.complianceOwner);
  const endUsers = normalizeText(stakeholderInput?.endUsers);
  const budgetRange = normalizeText(stakeholderInput?.budgetRange);
  const expectedTimeline = normalizeText(stakeholderInput?.expectedTimeline);
  const regulatoryRequirements = normalizeText(stakeholderInput?.regulatoryRequirements);

  if (!isMissingText(businessOwner) && isMissingText(meta.business_owner)) meta.business_owner = businessOwner;
  if (!isMissingText(productOwner) && isMissingText(meta.product_owner)) meta.product_owner = productOwner;
  if (!isMissingText(complianceOwner) && isMissingText(meta.compliance_owner)) meta.compliance_owner = complianceOwner;

  next.document_meta = meta;

  const stakeholdersFromInput = [
    { role: "Business Owner", name: businessOwner },
    { role: "Product Owner", name: productOwner },
    { role: "Engineering Lead", name: engineeringLead },
    { role: "Compliance Owner", name: complianceOwner },
    { role: "End Users", name: endUsers },
  ].filter((item) => !isMissingText(item.name));

  const existingStakeholders = Array.isArray(next.key_stakeholders) ? next.key_stakeholders : [];
  const mergedStakeholders = [...existingStakeholders];

  stakeholdersFromInput.forEach((incoming) => {
    const existingIndex = mergedStakeholders.findIndex(
      (item) => String(item?.role || "").trim().toLowerCase() === incoming.role.toLowerCase()
    );

    if (existingIndex === -1) {
      mergedStakeholders.push(incoming);
      return;
    }

    if (isMissingText(mergedStakeholders[existingIndex]?.name)) {
      mergedStakeholders[existingIndex] = { ...mergedStakeholders[existingIndex], name: incoming.name };
    }
  });

  if (mergedStakeholders.length) {
    next.key_stakeholders = mergedStakeholders;
  }

  const existingConstraints = Array.isArray(next.project_constraints) ? [...next.project_constraints] : [];
  const possibleConstraints = [
    !isMissingText(budgetRange) ? `Budget range provided by stakeholder input: ${budgetRange}.` : "",
    !isMissingText(expectedTimeline) ? `Expected delivery timeline provided by stakeholder input: ${expectedTimeline}.` : "",
    !isMissingText(regulatoryRequirements)
      ? `Regulatory and compliance details provided by stakeholder input: ${regulatoryRequirements}.`
      : "",
  ].filter(Boolean);

  possibleConstraints.forEach((line) => {
    if (!existingConstraints.some((existing) => String(existing || "").toLowerCase() === line.toLowerCase())) {
      existingConstraints.push(line);
    }
  });

  if (existingConstraints.length) {
    next.project_constraints = existingConstraints;
  }

  return next;
}

function normalizeJsonLike(value) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "N/A";
  return tryParseJsonString(trimmed) || trimmed;
}

function sanitizeAgentInput(payload) {
  if (!payload || typeof payload !== "object") return null;
  return {
    ...payload,
    username: payload.username ? "[REDACTED]" : "",
    password: payload.password ? "[REDACTED]" : "",
  };
}

function sanitizeAgentResponse(payload) {
  return payload;
}

async function ensureBrdStorageTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.BusinessRequirementsDocuments', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.BusinessRequirementsDocuments (
        brd_id INT IDENTITY(1,1) PRIMARY KEY,
        project_id INT NOT NULL,
        brd_content NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NULL
      );

      CREATE UNIQUE INDEX UX_BusinessRequirementsDocuments_project_id
      ON dbo.BusinessRequirementsDocuments(project_id);
    END
  `);
}

async function optionalProjectQuery(pool, projectId, queryText, label) {
  try {
    const result = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(queryText);
    return result?.recordset || [];
  } catch (error) {
    logger.error("POST /api/generate-brd optional context query failed", {
      label,
      message: error?.message,
      code: error?.code,
    });
    return [];
  }
}

function formatList(items, mapper) {
  if (!Array.isArray(items) || !items.length) return "N/A";
  return items.map(mapper).join("\n\n");
}

function buildCombinedBrdInput({
  project,
  personas,
  interviewees,
  interviews,
  insights,
  problemStatement,
  generatedPersonas,
  informationArchitecture,
  processFlow,
  projectFiles,
  wireframePages,
  researchSummaries,
  prdDocuments,
  iaHistory,
  processFlowHistory,
  problemStatements,
  interviewQuestions,
  stakeholderInput,
}) {
  const normalizedProject = {
    projectName: normalizeText(project?.project_name) || "N/A",
    clientName: normalizeText(project?.client_name) || "N/A",
    domain: normalizeText(project?.domain) || "N/A",
    description: normalizeText(project?.description) || "N/A",
  };

  const normalizedStakeholders = {
    businessOwner: normalizeText(stakeholderInput?.businessOwner) || "N/A",
    productOwner: normalizeText(stakeholderInput?.productOwner) || "N/A",
    engineeringLead: normalizeText(stakeholderInput?.engineeringLead) || "N/A",
    complianceOwner: normalizeText(stakeholderInput?.complianceOwner) || "N/A",
    endUsers: normalizeText(stakeholderInput?.endUsers) || "N/A",
    budgetRange: normalizeText(stakeholderInput?.budgetRange) || "N/A",
    expectedTimeline: normalizeText(stakeholderInput?.expectedTimeline) || "N/A",
    regulatoryRequirements:
      normalizeText(stakeholderInput?.regulatoryRequirements) || "N/A",
  };

  const normalizedPersonas = (Array.isArray(personas) ? personas : []).map((p) => ({
    personaId: p.persona_id,
    personaName: normalizeText(p.persona_name) || "N/A",
    personaDescription: normalizeText(p.persona_description) || "N/A",
  }));

  const intervieweeById = new Map(
    (Array.isArray(interviewees) ? interviewees : []).map((ie) => [ie.interviewee_id, ie])
  );

  const personaById = new Map(
    (Array.isArray(personas) ? personas : []).map((p) => [p.persona_id, p])
  );

  const normalizedInterviewees = (Array.isArray(interviewees) ? interviewees : []).map((ie) => ({
    intervieweeId: ie.interviewee_id,
    personaId: ie.persona_id,
    personaName: normalizeText(personaById.get(ie.persona_id)?.persona_name) || "N/A",
    name: normalizeText(ie.name) || "N/A",
    gender: normalizeText(ie.gender) || "N/A",
    age: normalizeText(ie.age) || "N/A",
    location: normalizeText(ie.location) || "N/A",
    relationshipStatus: normalizeText(ie.relationship_status) || "N/A",
    title: normalizeText(ie.title) || "N/A",
    education: normalizeText(ie.education) || "N/A",
  }));

  const normalizedInterviews = (Array.isArray(interviews) ? interviews : []).map((iv) => {
    const linkedInterviewee = intervieweeById.get(iv.interviewee_id);
    return {
      interviewId: iv.interview_id,
      intervieweeId: iv.interviewee_id,
      intervieweeName: normalizeText(linkedInterviewee?.name) || "N/A",
      transcript: normalizeText(iv.transcript) || "N/A",
      personaOutput: normalizeText(iv.persona_output) || "N/A",
      interviewOutcome: normalizeText(iv.interview_outcome) || "N/A",
      summary: normalizeText(iv.summary) || "N/A",
    };
  });

  const normalizedInsights = (Array.isArray(insights) ? insights : []).map((row) => ({
    insightId: row.insight_id,
    interviewId: row.interview_id,
    motivations: normalizeText(row.motivations) || "N/A",
    frustrations: normalizeText(row.frustrations) || "N/A",
    goals: normalizeText(row.goals) || "N/A",
    needs: normalizeText(row.needs) || "N/A",
  }));

  const normalizedGeneratedPersonas = (Array.isArray(generatedPersonas) ? generatedPersonas : []).map((row) => ({
    generatedPersonaId: row.generated_persona_id,
    personaName: normalizeText(row.persona_name) || "N/A",
    demographics: normalizeText(row.demographics) || "N/A",
    background: normalizeText(row.background) || "N/A",
    scenario: normalizeText(row.scenario_text) || "N/A",
    personality: normalizeText(row.personality) || "N/A",
    goals: normalizeText(row.goals) || "N/A",
    frustrations: normalizeText(row.frustrations) || "N/A",
    motivations: normalizeText(row.motivations) || "N/A",
    previousExperience: normalizeText(row.previous_experience) || "N/A",
    positiveThemes: normalizeText(row.positive_themes) || "N/A",
    negativeThemes: normalizeText(row.negative_themes) || "N/A",
    needsExpectations: normalizeText(row.needs_expectations) || "N/A",
    generatedOutput: normalizeText(tryParseJson(row.generated_output) || row.generated_output) || "N/A",
  }));

  const normalizedContextObject = {
    project: normalizedProject,
    stakeholders: normalizedStakeholders,
    problemStatement: normalizeText(problemStatement?.problem_statement) || "N/A",
    personas: normalizedPersonas,
    interviewees: normalizedInterviewees,
    interviews: normalizedInterviews,
    personaInsights: normalizedInsights,
    generatedPersonas: normalizedGeneratedPersonas,
    informationArchitecture: normalizeJsonLike(informationArchitecture?.ia),
    processFlow: normalizeJsonLike(processFlow?.process_flow),
    artifacts: {
      problemStatements: (Array.isArray(problemStatements) ? problemStatements : []).map((row, index) => ({
        id: row.problem_statement_id ?? index + 1,
        statement: normalizeText(row.problem_statement) || "N/A",
      })),
      informationArchitectureHistory: (Array.isArray(iaHistory) ? iaHistory : []).map((row, index) => ({
        id: row.ia_id ?? index + 1,
        ia: normalizeJsonLike(row.ia),
        createdAt: row.created_at || null,
      })),
      processFlowHistory: (Array.isArray(processFlowHistory) ? processFlowHistory : []).map((row, index) => ({
        id: row.processflow_id ?? index + 1,
        processFlow: normalizeJsonLike(row.process_flow),
        processFlowInput: normalizeJsonLike(row.pf_input),
        createdAt: row.created_at || null,
      })),
      empathyMapsFromInterviews: (Array.isArray(interviews) ? interviews : [])
        .filter((iv) => normalizeText(iv.persona_output))
        .map((iv) => ({
          interviewId: iv.interview_id,
          intervieweeId: iv.interviewee_id,
          empathyMap: normalizeJsonLike(iv.persona_output),
        })),
      wireframePages: (Array.isArray(wireframePages) ? wireframePages : []).map((row) => ({
        pageId: row.page_id,
        pageName: normalizeText(row.page_name) || "N/A",
        imageUrl: normalizeText(row.image_url) || "N/A",
        status: normalizeText(row.status) || "N/A",
        analysisOutput: normalizeJsonLike(row.analysis_output),
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
      })),
      projectFiles: (Array.isArray(projectFiles) ? projectFiles : []).map((row) => ({
        fileId: row.FileId,
        projectId: row.ProjectId,
        fileName: normalizeText(row.FileName) || "N/A",
        fileType: normalizeText(row.FileType) || "N/A",
        fileSize: row.FileSize ?? null,
        blobUrl: normalizeText(row.BlobUrl) || "N/A",
        uploadedBy: normalizeText(row.UploadedByName) || "N/A",
        uploadedAt: row.UploadedAt || null,
      })),
      interviewQuestions: (Array.isArray(interviewQuestions) ? interviewQuestions : []).map((row) => ({
        questionId: row.question_id,
        interviewId: row.interview_id,
        questionText: normalizeText(row.question_text) || "N/A",
      })),
      requirementsAndDocumentation: {
        prdDocuments: (Array.isArray(prdDocuments) ? prdDocuments : []).map((row, index) => ({
          id: row.prd_id ?? index + 1,
          prdContent: normalizeText(row.prd_content) || "N/A",
          createdAt: row.created_at || null,
        })),
        researchSummaries: (Array.isArray(researchSummaries) ? researchSummaries : []).map((row, index) => ({
          id: row.report_id ?? index + 1,
          report: normalizeText(row.report) || "N/A",
          createdAt: row.created_at || null,
        })),
      },
    },
  };

  const readableBrief = buildProjectBrief({
    project,
    personas,
    interviewees,
    interviews,
    insights,
    problemStatement,
    generatedPersonas,
    informationArchitecture,
    processFlow,
    projectFiles,
    wireframePages,
    researchSummaries,
    prdDocuments,
    iaHistory,
    processFlowHistory,
    problemStatements,
    interviewQuestions,
  });

  const stakeholderBlock = `
Business Owner:\n${normalizedStakeholders.businessOwner}

Product Owner:\n${normalizedStakeholders.productOwner}

Engineering Lead:\n${normalizedStakeholders.engineeringLead}

Compliance Owner:\n${normalizedStakeholders.complianceOwner}

End Users:\n${normalizedStakeholders.endUsers}

Budget Range:\n${normalizedStakeholders.budgetRange}

Expected Timeline:\n${normalizedStakeholders.expectedTimeline}

Regulatory / Compliance Requirements:\n${normalizedStakeholders.regulatoryRequirements}`;

  const combinedInputText = [
    "BRD INPUT PACKET",
    "================",
    readableBrief,
    "",
    "STAKEHOLDER INPUT",
    "-----------------",
    stakeholderBlock,
    "",
    "STRUCTURED CONTEXT JSON",
    "-----------------------",
    JSON.stringify(normalizedContextObject, null, 2),
  ].join("\n");

  return {
    combinedInputText,
    normalizedContextObject,
  };
}

function buildProjectBrief({
  project,
  personas,
  interviewees,
  interviews,
  insights,
  problemStatement,
  generatedPersonas,
  informationArchitecture,
  processFlow,
  projectFiles,
  wireframePages,
  researchSummaries,
  prdDocuments,
  iaHistory,
  processFlowHistory,
  problemStatements,
  interviewQuestions,
}) {
  const sections = [];

  sections.push(`Project Name:\n${normalizeText(project?.project_name) || "N/A"}`);
  sections.push(`Client Name:\n${normalizeText(project?.client_name) || "N/A"}`);
  sections.push(`Domain:\n${normalizeText(project?.domain) || "N/A"}`);
  sections.push(`Project Description:\n${normalizeText(project?.description) || "N/A"}`);

  sections.push(
    `Problem Statement:\n${normalizeText(problemStatement?.problem_statement) || "N/A"}`
  );

  sections.push(
    `Personas:\n${formatList(
      personas,
      (p, index) =>
        `${index + 1}. ${normalizeText(p.persona_name) || "N/A"}\nDescription: ${
          normalizeText(p.persona_description) || "N/A"
        }`
    )}`
  );

  sections.push(
    `Interviewees:\n${formatList(
      interviewees,
      (i, index) =>
        `${index + 1}. Name: ${normalizeText(i.name) || "N/A"}\nGender: ${
          normalizeText(i.gender) || "N/A"
        }\nAge: ${normalizeText(i.age) || "N/A"}\nLocation: ${
          normalizeText(i.location) || "N/A"
        }\nRelationship Status: ${normalizeText(i.relationship_status) || "N/A"}\nTitle: ${
          normalizeText(i.title) || "N/A"
        }\nEducation: ${normalizeText(i.education) || "N/A"}`
    )}`
  );

  sections.push(
    `Interviews:\n${formatList(
      interviews,
      (iv, index) =>
        `Interview ${index + 1}:\nTranscript: ${normalizeText(iv.transcript) || "N/A"}\nPersona Output: ${
          normalizeText(iv.persona_output) || "N/A"
        }\nInterview Outcome: ${normalizeText(iv.interview_outcome) || "N/A"}\nSummary: ${
          normalizeText(iv.summary) || "N/A"
        }`
    )}`
  );

  // Use persona_insightss if available, otherwise fall back to generated_personass
const insightSource =
  Array.isArray(insights) && insights.length > 0
    ? insights.map((row) => ({
        name: "N/A",
        motivations: row.motivations,
        frustrations: row.frustrations,
        goals: row.goals,
        needs: row.needs,
      }))
    : (generatedPersonas || []).map((row) => ({
        name: row.persona_name,
        motivations: row.motivations,
        frustrations: row.frustrations,
        goals: row.goals,
        needs: row.needs_expectations, // note: different field name
      }));

sections.push(
  `Persona Insights:\n${formatList(
    insightSource,
    (row, index) =>
      `Insight ${index + 1} (${normalizeText(row.name)}):\nMotivations: ${normalizeText(row.motivations) || "N/A"}\nFrustrations: ${
        normalizeText(row.frustrations) || "N/A"
      }\nGoals: ${normalizeText(row.goals) || "N/A"}\nNeeds: ${normalizeText(row.needs) || "N/A"}`
  )}`
);

  sections.push(
    `Generated Personas:\n${formatList(generatedPersonas, (row, index) => {
      const generated = tryParseJson(row.generated_output) || row.generated_output;
      return `Generated Persona ${index + 1}:\nPersona Name: ${
        normalizeText(row.persona_name) || "N/A"
      }\nDemographics: ${normalizeText(row.demographics) || "N/A"}\nBackground: ${
        normalizeText(row.background) || "N/A"
      }\nScenario: ${normalizeText(row.scenario_text) || "N/A"}\nPersonality: ${
        normalizeText(row.personality) || "N/A"
      }\nGoals: ${normalizeText(row.goals) || "N/A"}\nFrustrations: ${
        normalizeText(row.frustrations) || "N/A"
      }\nMotivations: ${normalizeText(row.motivations) || "N/A"}\nPrevious Experience: ${
        normalizeText(row.previous_experience) || "N/A"
      }\nPositive Themes: ${normalizeText(row.positive_themes) || "N/A"}\nNegative Themes: ${
        normalizeText(row.negative_themes) || "N/A"
      }\nNeeds & Expectations: ${normalizeText(row.needs_expectations) || "N/A"}\nGenerated Output: ${
        normalizeText(generated) || "N/A"
      }`;
    })}`
  );

  const iaParsed = tryParseJson(informationArchitecture?.ia) || informationArchitecture?.ia;
  sections.push(`Information Architecture:\n${normalizeText(iaParsed) || "N/A"}`);

  const processFlowParsed = tryParseJson(processFlow?.process_flow) || processFlow?.process_flow;
  sections.push(`Process Flow:\n${normalizeText(processFlowParsed) || "N/A"}`);

  sections.push(
    `Problem Statements History:\n${formatList(problemStatements, (row, index) =>
      `${index + 1}. ${normalizeText(row.problem_statement) || "N/A"}`
    )}`
  );

  sections.push(
    `Information Architecture History:\n${formatList(iaHistory, (row, index) => {
      const parsed = tryParseJson(row.ia) || row.ia;
      return `${index + 1}. ${normalizeText(parsed) || "N/A"}`;
    })}`
  );

  sections.push(
    `Process Flow History:\n${formatList(processFlowHistory, (row, index) => {
      const parsedFlow = tryParseJson(row.process_flow) || row.process_flow;
      const parsedInput = tryParseJson(row.pf_input) || row.pf_input;
      return `Flow ${index + 1}:\nOutput: ${normalizeText(parsedFlow) || "N/A"}\nInput: ${normalizeText(parsedInput) || "N/A"}`;
    })}`
  );

  sections.push(
    `Empathy Maps (Interview Persona Outputs):\n${formatList(
      interviews.filter((iv) => normalizeText(iv.persona_output)),
      (iv, index) =>
        `Empathy Map ${index + 1} (Interview ${iv.interview_id}): ${normalizeText(
          tryParseJson(iv.persona_output) || iv.persona_output
        ) || "N/A"}`
    )}`
  );

  sections.push(
    `Interview Questions:\n${formatList(interviewQuestions, (row, index) =>
      `${index + 1}. ${normalizeText(row.question_text) || "N/A"}`
    )}`
  );

  sections.push(
    `Wireframe Pages & Analysis:\n${formatList(wireframePages, (row, index) => {
      const parsedAnalysis = tryParseJson(row.analysis_output) || row.analysis_output;
      return `Page ${index + 1}: ${normalizeText(row.page_name) || "N/A"}\nStatus: ${
        normalizeText(row.status) || "N/A"
      }\nAnalysis: ${normalizeText(parsedAnalysis) || "N/A"}`;
    })}`
  );

  sections.push(
    `Project Files / Supporting Documents:\n${formatList(projectFiles, (row, index) =>
      `${index + 1}. ${normalizeText(row.FileName) || "N/A"} (${normalizeText(row.FileType) || "Unknown Type"}) - ${
        normalizeText(row.BlobUrl) || "N/A"
      }`
    )}`
  );

  sections.push(
    `Research Summary Reports:\n${formatList(researchSummaries, (row, index) =>
      `Report ${index + 1}: ${normalizeText(row.report) || "N/A"}`
    )}`
  );

  sections.push(
    `Stored PRD Documentation:\n${formatList(prdDocuments, (row, index) =>
      `PRD ${index + 1}: ${normalizeText(row.prd_content) || "N/A"}`
    )}`
  );

  return sections.join("\n\n");
}

export const POST = withAuth(async (request, _ctx, user) => {
  const { data: input, error: validationError } = await validateBody(request, generateBRDSchema);
  if (validationError) return validationError;

  const { limited, retryAfterSec } = aiHeavyLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  let agentInput = null;

  try {
    const projectId = Number(input.projectId);
    const forceRegenerate = input.forceRegenerate ?? false;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required." } },
        { status: 400 }
      );
    }

    if (!USERNAME || !PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Agent credentials are not configured." },
        },
        { status: 500 }
      );
    }

    const pool = await getPool();

    const projectResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT TOP 1 project_id, project_name, client_name, description, domain
        FROM projectss
        WHERE project_id = @projectId AND created_by = @userId
      `);

    const project = projectResult.recordset?.[0];
    if (!project) {
      return NextResponse.json(
        { success: false, error: { message: "Project not found." } },
        { status: 404 }
      );
    }

    await ensureBrdStorageTable(pool);

    if (!forceRegenerate) {
      const existingBrdResult = await pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 brd_content
          FROM BusinessRequirementsDocuments
          WHERE project_id = @projectId
        `);

      const existingBrdRaw = existingBrdResult.recordset?.[0]?.brd_content;
      if (existingBrdRaw) {
        const parsedExistingBrd = tryParseJsonString(existingBrdRaw) || existingBrdRaw;
        return NextResponse.json({
          success: true,
          source: "database",
          data: { brd: parsedExistingBrd },
        });
      }
    }

    const [
      personasResult,
      intervieweesResult,
      interviewsResult,
      insightsResult,
      problemStatementResult,
      generatedPersonasResult,
      iaResult,
      processFlowResult,
    ] = await Promise.all([
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT persona_id, persona_name, persona_description
          FROM personass
          WHERE project_id = @projectId
          ORDER BY persona_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT ie.interviewee_id, ie.persona_id, ie.name, ie.gender, ie.age, ie.location,
                 ie.relationship_status, ie.title, ie.education
          FROM intervieweess ie
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
          ORDER BY ie.interviewee_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT iv.interview_id, iv.interviewee_id, iv.transcript, iv.persona_output,
                 iv.interview_outcome, iv.summary
          FROM interviewss iv
          INNER JOIN intervieweess ie ON ie.interviewee_id = iv.interviewee_id
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
          ORDER BY iv.interview_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT pi.insight_id, pi.interview_id, pi.motivations, pi.frustrations, pi.goals, pi.needs
          FROM persona_insightss pi
          INNER JOIN interviewss iv ON iv.interview_id = pi.interview_id
          INNER JOIN intervieweess ie ON ie.interviewee_id = iv.interviewee_id
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
          ORDER BY pi.insight_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 problem_statement
          FROM problem_statements
          WHERE project_id = @projectId
          ORDER BY problem_statement_id DESC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT generated_persona_id, persona_name, demographics, background, scenario_text,
                 personality, goals, frustrations, motivations, previous_experience,
                 positive_themes, negative_themes, needs_expectations, generated_output
          FROM generated_personass
          WHERE project_id = @projectId
          ORDER BY generated_persona_id ASC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 ia
          FROM InformationArchitecture
          WHERE project_id = @projectId
          ORDER BY ia_id DESC
        `),
      pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT TOP 1 process_flow
          FROM ProcessFlow
          WHERE project_id = @projectId
          ORDER BY processflow_id DESC
        `),
    ]);

    const [
      problemStatementsRows,
      iaHistoryRows,
      processFlowHistoryRows,
      researchSummaryRows,
      projectFilesRows,
      wireframePagesRows,
      interviewQuestionsRows,
      prdDocumentsRows,
    ] = await Promise.all([
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT problem_statement
          FROM problem_statements
          WHERE project_id = @projectId
        `,
        "problem_statements"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT ia
          FROM InformationArchitecture
          WHERE project_id = @projectId
        `,
        "InformationArchitecture-history"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT process_flow, pf_input
          FROM ProcessFlow
          WHERE project_id = @projectId
        `,
        "ProcessFlow-history"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT report
          FROM research_summary_reports
          WHERE project_id = @projectId
        `,
        "research_summary_reports"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT
            pf.FileId,
            pf.ProjectId,
            pf.FileName,
            pf.BlobUrl,
            pf.FileType,
            pf.FileSize,
            pf.UploadedAt,
            u.name AS UploadedByName
          FROM ProjectFiles pf
          LEFT JOIN userss u ON u.user_id = pf.UploadedBy
          WHERE pf.ProjectId = @projectId
        `,
        "ProjectFiles"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT page_id, page_name, image_url, analysis_output, status, created_at, updated_at
          FROM WireframeAnalysisPages
          WHERE project_id = @projectId
        `,
        "WireframeAnalysisPages"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT q.question_id, q.interview_id, q.question_text
          FROM questionss q
          INNER JOIN interviewss iv ON iv.interview_id = q.interview_id
          INNER JOIN intervieweess ie ON ie.interviewee_id = iv.interviewee_id
          INNER JOIN personass p ON p.persona_id = ie.persona_id
          WHERE p.project_id = @projectId
        `,
        "questionss"
      ),
      optionalProjectQuery(
        pool,
        projectId,
        `
          SELECT prd_content
          FROM ProductRequirementsDocuments
          WHERE project_id = @projectId
        `,
        "ProductRequirementsDocuments"
      ),
    ]);
    console.log("========== DB QUERY RESULTS ==========");
console.log("Project:", projectResult.recordset?.[0]?.project_name);
console.log("Personas count:", personasResult.recordset?.length);
console.log("Interviewees count:", intervieweesResult.recordset?.length);
console.log("Interviews count:", interviewsResult.recordset?.length);
console.log("Insights count:", insightsResult.recordset?.length);
console.log("Problem Statement:", problemStatementResult.recordset?.[0]?.problem_statement?.slice(0, 100));
console.log("Generated Personas count:", generatedPersonasResult.recordset?.length);
console.log("IA:", iaResult.recordset?.[0]?.ia?.slice(0, 100));
console.log("Process Flow:", processFlowResult.recordset?.[0]?.process_flow?.slice(0, 100));
console.log("Problem statements history count:", problemStatementsRows.length);
console.log("IA history count:", iaHistoryRows.length);
console.log("Process flow history count:", processFlowHistoryRows.length);
console.log("Research summaries count:", researchSummaryRows.length);
console.log("Project files count:", projectFilesRows.length);
console.log("Wireframe pages count:", wireframePagesRows.length);
console.log("Interview questions count:", interviewQuestionsRows.length);
console.log("Stored PRD docs count:", prdDocumentsRows.length);
console.log("======================================");


    const { combinedInputText, normalizedContextObject } = buildCombinedBrdInput({
      project,
      personas: personasResult.recordset || [],
      interviewees: intervieweesResult.recordset || [],
      interviews: interviewsResult.recordset || [],
      insights: insightsResult.recordset || [],
      problemStatement: problemStatementResult.recordset?.[0] || null,
      generatedPersonas: generatedPersonasResult.recordset || [],
      informationArchitecture: iaResult.recordset?.[0] || null,
      processFlow: processFlowResult.recordset?.[0] || null,
      projectFiles: projectFilesRows,
      wireframePages: wireframePagesRows,
      researchSummaries: researchSummaryRows,
      prdDocuments: prdDocumentsRows,
      iaHistory: iaHistoryRows,
      processFlowHistory: processFlowHistoryRows,
      problemStatements: problemStatementsRows,
      interviewQuestions: interviewQuestionsRows,
      stakeholderInput: input,
    });

console.log("========== PROJECT BRIEF SECTIONS ==========");
console.log("--- INSIGHTS SOURCE ---");
console.log("insights length:", insightsResult.recordset?.length);
console.log("generatedPersonas length:", generatedPersonasResult.recordset?.length);
console.log("First generated persona motivations:", generatedPersonasResult.recordset?.[0]?.motivations?.slice(0, 100));
console.log("First generated persona frustrations:", generatedPersonasResult.recordset?.[0]?.frustrations?.slice(0, 100));
console.log("First generated persona goals:", generatedPersonasResult.recordset?.[0]?.goals?.slice(0, 100));
console.log("First generated persona needs:", generatedPersonasResult.recordset?.[0]?.needs_expectations?.slice(0, 100));
console.log("--- STAKEHOLDER INPUT ---");
console.log("businessOwner:", input.businessOwner);
console.log("productOwner:", input.productOwner);
console.log("engineeringLead:", input.engineeringLead);
console.log("budgetRange:", input.budgetRange);
console.log("expectedTimeline:", input.expectedTimeline);
console.log("regulatoryRequirements:", input.regulatoryRequirements);
console.log("--- COMBINED INPUT STATS ---");
console.log("combinedInput length:", combinedInputText.length);
console.log("personas sent:", normalizedContextObject.personas.length);
console.log("interviewees sent:", normalizedContextObject.interviewees.length);
console.log("interviews sent:", normalizedContextObject.interviews.length);
console.log("insights sent:", normalizedContextObject.personaInsights.length);
console.log("project files sent:", normalizedContextObject.artifacts.projectFiles.length);
console.log("wireframe pages sent:", normalizedContextObject.artifacts.wireframePages.length);
console.log("research summaries sent:", normalizedContextObject.artifacts.requirementsAndDocumentation.researchSummaries.length);
console.log("stored PRDs sent:", normalizedContextObject.artifacts.requirementsAndDocumentation.prdDocuments.length);
console.log("============================================");

const payload = {
  name: BRD_AGENT_NAME,
  project_brief: combinedInputText,
  brd_context: combinedInputText,
  user_input: combinedInputText,
  input_info: combinedInputText,
  project_context_json: normalizedContextObject,
  complete_project_data: normalizedContextObject,
  full_project_context: normalizedContextObject,
  rules: [],
  username: USERNAME,
  password: PASSWORD,
};

agentInput = sanitizeAgentInput(payload);

console.log("========== SENDING TO AGENT ==========");
console.log("URL:", WEBHOOK_URL);
console.log("Username present:", Boolean(USERNAME));
console.log("Password present:", Boolean(PASSWORD));
console.log("Final payload:", JSON.stringify(agentInput, null, 2));
console.log("======================================");

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000),
    });

    console.log("========== AGENT RESPONDED ==========");
console.log("HTTP Status:", response.status);
console.log("HTTP Status Text:", response.statusText);
console.log("======================================");


    const text = await response.text();
console.log("========== RAW AGENT RESPONSE ==========");
console.log(text.slice(0, 3000));
console.log("========================================");
    const data = tryParseJson(text);
    const agentResponse = sanitizeAgentResponse(data);

    if (!response.ok) {
      logger.error("POST /api/generate-brd upstream error", {
        status: response.status,
        preview: text.slice(0, 500),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: `Agent request failed (${response.status})` },
          agent_input: agentInput,
          agent_response: agentResponse,
        },
        { status: response.status }
      );
    }

    if (!data) {
      logger.error("POST /api/generate-brd invalid upstream JSON", {
        preview: text.slice(0, 500),
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Agent returned invalid JSON." },
          agent_input: agentInput,
          agent_response: sanitizeAgentResponse(text),
        },
        { status: 502 }
      );
    }

    const brdData = extractBrdDocument(data);
    if (!brdData) {
      const extractionDiagnostics = collectBrdExtractionDiagnostics(data);
      logger.error("POST /api/generate-brd failed to extract brd_document", {
        hasTopMessage: Boolean(data?.message),
        hasMessages: Array.isArray(data?.response?.messages),
        extractionDiagnostics,
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Could not extract brd_document from agent response." },
          raw_response: data,
          extraction_diagnostics: extractionDiagnostics,
          agent_input: agentInput,
          agent_response: agentResponse,
        },
        { status: 502 }
      );
    }

    const enrichedBrdData = enrichBrdWithStakeholderInput(brdData, input);

    await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("brdOutput", sql.NVarChar(sql.MAX), JSON.stringify(enrichedBrdData))
      .query(`
        IF EXISTS (
          SELECT 1
          FROM BusinessRequirementsDocuments
          WHERE project_id = @projectId
        )
        BEGIN
          UPDATE BusinessRequirementsDocuments
          SET
            brd_content = @brdOutput,
            updated_at = SYSUTCDATETIME()
          WHERE project_id = @projectId
        END
        ELSE
        BEGIN
          INSERT INTO BusinessRequirementsDocuments
          (
            project_id,
            brd_content
          )
          VALUES
          (
            @projectId,
            @brdOutput
          )
        END
      `);

    return NextResponse.json({ success: true, source: "agent", data: { brd: enrichedBrdData } });
  } catch (error) {
    if (error?.name === "AbortError") {
      logger.error("POST /api/generate-brd timeout", { error });
      return NextResponse.json(
        {
          success: false,
          error: { message: "Request timed out. The agent took too long to respond." },
          agent_input: agentInput,
          agent_response: null,
        },
        { status: 504 }
      );
    }

    logger.error("POST /api/generate-brd error", { error });

    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal server error" }, agent_input: agentInput, agent_response: null },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request, _ctx, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = Number(searchParams.get("projectId"));

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { message: "projectId is required." } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    const projectResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT TOP 1 project_id
        FROM projectss
        WHERE project_id = @projectId AND created_by = @userId
      `);

    if (!projectResult.recordset?.length) {
      return NextResponse.json(
        { success: false, error: { message: "Project not found." } },
        { status: 404 }
      );
    }

    await ensureBrdStorageTable(pool);

    const result = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT TOP 1 brd_content
        FROM BusinessRequirementsDocuments
        WHERE project_id = @projectId
      `);

    const brdContent = result.recordset?.[0]?.brd_content || null;
    return NextResponse.json({
      success: true,
      brd_content: brdContent,
      data: { brd: brdContent ? tryParseJsonString(brdContent) || brdContent : null },
    });
  } catch (error) {
    logger.error("GET /api/generate-brd error", { error });
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal server error" } },
      { status: 500 }
    );
  }
});
