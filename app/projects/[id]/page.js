"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Upload, Download, Share2, Trash2, FileText, Link as LinkIcon, Loader2, AlertTriangle, HandHeart, Lightbulb, X } from "lucide-react";
import { api } from "@/services/api";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

const STAGES = [
  { id: "empathize", name: "Empathize", description: "Understand your users through observation and engagement." },
  { id: "define", name: "Define", description: "Define the problem statement and user needs." },
  { id: "ideate", name: "Ideate", description: "Generate creative ideas and solutions." },
  { id: "prototype", name: "Prototype", description: "Create tangible representations of your ideas." },
  { id: "test", name: "Test", description: "Validate your prototypes with real users." },
  { id: "implement", name: "Implement", description: "Bring your solution to life." },
];

const STAGE_TEMPLATES = {
  empathize: [
    { id: "empathy-map", name: "Empathy Map", icon: FileText, type: "file" },
    { id: "user-persona", name: "User Persona", icon: FileText, type: "file" },
    { id: "other-files", name: "Other Files", icon: FileText, type: "file" },
  ],
  define: [
  { id: "problem-statement", name: "Problem Statement", icon: FileText, type: "file" },
  { id: "process-flow", name: "Process Flow", icon: FileText, type: "agent" },
],
 ideate: [
  { id: "information-architecture", name: "Information Architecture", icon: FileText, type: "agent" },
  { id: "wireframe-reviewer", name: "Wireframe Reviewer", icon: FileText, type: "upload" },
  {
  id: "brd-prd-generator",
  name: "BRD & PRD Generator",
  description: "Generate BRD and PRD from project context",
  icon: FileText
},
],
  prototype: [
    { id: "low-fidelity", name: "Low Fidelity Prototype", icon: LinkIcon, type: "link" },
    { id: "high-fidelity", name: "High Fidelity Prototype", icon: LinkIcon, type: "link" },
  ],
  test: [
    { id: "test-results", name: "Test Results", icon: FileText, type: "file" },
    { id: "user-feedback", name: "User Feedback", icon: FileText, type: "file" },
  ],
  implement: [
    { id: "implementation-plan", name: "Implementation Plan", icon: FileText, type: "file" },
    { id: "final-deliverables", name: "Final Deliverables", icon: FileText, type: "file" },
  ],
};

const EMPATHIZE_CARD_MEDIA = {
  "empathy-map":   { bg: "from-violet-100 to-indigo-100", iconColor: "text-indigo-400", icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" width=\"48\" height=\"48\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z\"/></svg>", eyebrow: "Collaborative input", title: "Interview Assist", description: "Capture user thoughts, feelings, and context before stepping into the workspace." },
  "user-persona":  { bg: "from-purple-100 to-pink-100",   iconColor: "text-purple-400", icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" width=\"48\" height=\"48\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>", eyebrow: "Profile framing",     title: "Empathy Map",      description: "Review the persona structure and prepare a standard or uploaded reference template." },
  "other-files":   { bg: "from-blue-100 to-cyan-100",     iconColor: "text-blue-400",   icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" width=\"48\" height=\"48\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\"/></svg>",   eyebrow: "Supporting inputs",   title: "Other Files",      description: "Keep supporting research artifacts and additional input materials accessible." },
};

const DEFINE_CARD_MEDIA = {
  "problem-statement": { bg: "from-amber-100 to-orange-100", iconColor: "text-amber-500", icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" width=\"48\" height=\"48\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01\"/></svg>", eyebrow: "Problem framing",  title: "Problem Definition", description: "Clearly define the problem based on user insights." },
  "process-flow":      { bg: "from-teal-100 to-emerald-100", iconColor: "text-teal-500",  icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" width=\"48\" height=\"48\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2\"/></svg>",  eyebrow: "Workflow Design",  title: "Process Flow",       description: "Generate AI-based process flow from combined persona insights." },
};

const IDEATE_CARD_MEDIA = {
  "wireframe-reviewer": {
    image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&h=800&fit=crop",
    eyebrow: "Design Review",
    title: "Wireframe Reviewer",
    description: "Upload a wireframe image for AI-powered review and analysis.",
  },
  "information-architecture": {
    image:
      "https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&h=800&fit=crop",
    eyebrow: "Structure Planning",
    title: "Information Architecture",
    description:
      "Generate AI-powered information architecture from persona insights and project requirements.",
  },
  "brd-prd-generator": {
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=800&fit=crop",
    eyebrow: "Document Generation",
    title: "BRD & PRD Generator",
    description: "Generate BRD and PRD from project context.",
  },
};

const PROTOTYPE_CARD_MEDIA = {
  "low-fidelity": { image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&h=800&fit=crop", eyebrow: "Early Concepts", title: "Low Fidelity Prototype", description: "Sketch and wireframe your ideas to quickly validate concepts with users." },
  "high-fidelity": { image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=800&fit=crop", eyebrow: "Polished Design", title: "High Fidelity Prototype", description: "Build a detailed, interactive prototype that closely resembles the final product." },
};
const TEST_CARD_MEDIA = {
  "test-results": { image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop", eyebrow: "Validation", title: "Test Results", description: "Document and analyze usability test findings to guide design decisions." },
  "user-feedback": { image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200&h=800&fit=crop", eyebrow: "User Insights", title: "User Feedback", description: "Collect and synthesize feedback from real users to improve your solution." },
};
const IMPLEMENT_CARD_MEDIA = {
  "implementation-plan": { image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=1200&h=800&fit=crop", eyebrow: "Execution", title: "Implementation Plan", description: "Define the roadmap and steps needed to bring your solution to life." },
  "final-deliverables": { image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=800&fit=crop", eyebrow: "Delivery", title: "Final Deliverables", description: "Package and present the completed solution and all supporting artifacts." },
};
const STAGE_MEDIA_MAP = { prototype: PROTOTYPE_CARD_MEDIA, test: TEST_CARD_MEDIA, implement: IMPLEMENT_CARD_MEDIA };

function formatKeyLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function appendWordValue(paragraphs, value, depth = 0) {
  if (value === null || value === undefined) {
    paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
    return;
  }

  if (typeof value === "string") {
    const lines = value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
      return;
    }

    lines.forEach((line) => {
      paragraphs.push(new Paragraph({ text: line, spacing: { after: 120 } }));
    });
    return;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      paragraphs.push(new Paragraph({ text: "-", spacing: { after: 120 } }));
      return;
    }

    value.forEach((item, index) => {
      if (item && typeof item === "object") {
        paragraphs.push(
          new Paragraph({
            text: `Item ${index + 1}`,
            bullet: { level: Math.min(depth, 2) },
            spacing: { after: 80 },
          })
        );
        appendWordValue(paragraphs, item, depth + 1);
      } else {
        paragraphs.push(
          new Paragraph({
            text: String(item),
            bullet: { level: Math.min(depth, 2) },
            spacing: { after: 120 },
          })
        );
      }
    });
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) => {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `${formatKeyLabel(key)}:`, bold: true })],
          spacing: { after: 80 },
        })
      );
      appendWordValue(paragraphs, nested, depth + 1);
    });
    return;
  }

  paragraphs.push(new Paragraph({ text: String(value), spacing: { after: 120 } }));
}

function cleanPrdHtml(value) {
  const text = String(value || "").trim();

  // Remove script tags
  let cleaned = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  // Remove inline event handlers
  cleaned = cleaned.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  cleaned = cleaned.replace(/\son\w+\s*=\s*'[^']*'/gi, "");

  // Remove javascript: URLs
  cleaned = cleaned.replace(/\sjavascript:/gi, " ");

  // Ensure the content has proper HTML structure
  if (!cleaned.startsWith("<") && !cleaned.includes("<h1")) {
    // If it's plain text, wrap in paragraphs
    cleaned = cleaned.split(/\n+/).filter(line => line.trim()).map(line =>
      `<p>${line.trim()}</p>`
    ).join("");
  }

  return cleaned;
}
// Helper: Convert markdown to HTML
const convertMarkdownToHtml = (text) => {
  if (!text) return "";
  
  let html = text;
  
  // Convert headers
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  
  // Convert bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr />');
  
  // Convert bullet lists
  html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
  
  // Convert numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)+/g, function(match) {
    if (match.includes('<ol>')) return match;
    return `<ol>${match}</ol>`;
  });
  
  // Convert paragraphs
  const lines = html.split('\n');
  let result = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) {
      result.push('<br />');
      continue;
    }
    
    // Skip if already wrapped in HTML tags
    if (/^<[hH][1-6]/.test(line) || /^<ul>/.test(line) || /^<ol>/.test(line) || 
        /^<li>/.test(line) || /^<table>/.test(line) || /^<hr \/>/.test(line)) {
      result.push(line);
      continue;
    }
    
    result.push(`<p>${line}</p>`);
  }
  
  html = result.join('\n');
  
  return html;
};
// Final sanitizer: strips only what Python's clean_prd_output + normalize_text strip.
// Run this once, right before setPrdHtml / before rendering.
function sanitizePrdText(value) {
  if (!value) return "";

  let text = String(value).trim();

  // Remove markdown code fences (```html ... ```)
  text = text.replace(/```html/g, "");
  text = text.replace(/```/g, "");

  // Remove a single pair of wrapping outer quotes, if present
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  // Normalize literal unicode-escape sequences that leaked through as text
  // (these are LITERAL strings like backslash-u-2013, not real unicode chars)
  const escapeReplacements = {
    "\\u2013": "–",
    "\\u2014": "—",
    "\\u2018": "'",
    "\\u2019": "'",
    "\\u201c": '"',
    "\\u201d": '"',
    "\\u2192": "→",
    "\\u2265": "≥",
    "\\u2264": "≤",
    "\\u2022": "•",
    "\\n": "\n",
    "\\t": " ",
  };

  for (const [bad, good] of Object.entries(escapeReplacements)) {
    const escaped = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "g"), good);
  }

  // Collapse excessive whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");

  // Strip unsafe HTML before it's ever rendered with dangerouslySetInnerHTML
  text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  text = text.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  text = text.replace(/\sjavascript:/gi, " ");

  // If it's not HTML at all, wrap plain lines in paragraphs
  if (!text.startsWith("<") && !text.includes("<h1") && !text.includes("<h2")) {
    text = text
      .split(/\n+/)
      .filter((line) => line.trim())
      .map((line) => `<p>${line.trim()}</p>`)
      .join("");
  }

  return text.trim();
}
// Helper: Decode escaped text (single definition)
function decodeEscapedText(value) {
  return String(value || "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

// Helper: Try to parse JSON string (mirrors Python backend)
const tryParseJsonString = (s) => {
  if (!s) return null;
  
  let cleaned = s.trim();
  
  // Remove markdown code fences
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace("```json", "").trim();
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace("```", "").trim();
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3).trim();
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try with unicode escape
    try {
      return JSON.parse(cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      ));
    } catch (e2) {
      return null;
    }
  }
};

// Helper: Clean PRD output (mirrors Python backend)
// Helper: Clean PRD output (mirrors Python backend)
const cleanPrdOutput = (text) => {
  if (!text) return "";

  let cleaned = text.trim();

  // Remove markdown code fences
  cleaned = cleaned.replace(/```html/g, "");
  cleaned = cleaned.replace(/```/g, "");

  // Remove outer quotes if present
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Normalize Unicode characters
  const replacements = {
    "\\u2013": "–",
    "\\u2014": "—",
    "\\u2018": "'",
    "\\u2019": "'",
    "\\u201c": '"',
    "\\u201d": '"',
    "\\u2192": "→",
    "\\u2265": "≥",
    "\\u2264": "≤",
    "\\u2022": "•",
    "\\n": "\n",
    "\\t": " "
  };

  for (const [bad, good] of Object.entries(replacements)) {
    cleaned = cleaned.replace(new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), good);
  }

  // Remove excessive whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
};
// Helper: Extract PRD output (mirrors Python backend)
const extractPrdOutput = (result) => {
  // 1. Check for messages in response
  const messages = result?.response?.messages || [];
  
  // Prefer full assistant HTML output from messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (typeof msg !== "string") continue;

    // Try to extract content from the message string
    const match = msg.match(/content='(.*?)'\s+additional_kwargs=/s);
    if (!match) continue;

    const content = match[1];
    
    // Check if it contains HTML headers
    if (content.includes("<h1>") && content.includes("<h2>")) {
      const cleaned = cleanPrdOutput(content);
      // Avoid truncated output
      if (!cleaned.includes("...") && cleaned.length > 1000) {
        return cleaned;
      }
      if (cleaned.length > 1000) {
        return cleaned;
      }
    }
  }

  // 2. Fallback: Check top-level prd_output
  const topMessage = result?.message || "";
  if (topMessage) {
    const parsed = tryParseJsonString(topMessage);
    if (parsed && typeof parsed === "object") {
      const prd = parsed.prd_output || "";
      if (typeof prd === "string" && 
          prd.includes("<h1>") && 
          prd.includes("<h2>") && 
          !prd.includes("...") && 
          prd.length > 1000) {
        return cleanPrdOutput(prd);
      }
    }
  }

  // 3. Check data.prd_output directly
  if (result?.data?.prd_output) {
    const prd = result.data.prd_output;
    if (typeof prd === "string" && prd.includes("<h1>") && prd.includes("<h2>")) {
      return cleanPrdOutput(prd);
    }
  }

  // 4. Check result.prd_output directly
  if (result?.prd_output) {
    const prd = result.prd_output;
    if (typeof prd === "string" && prd.includes("<h1>") && prd.includes("<h2>")) {
      return cleanPrdOutput(prd);
    }
  }

  // 5. Try to extract from final_response
  if (result?.final_response) {
    if (typeof result.final_response === "object" && result.final_response.prd_output) {
      return cleanPrdOutput(result.final_response.prd_output);
    }
    if (typeof result.final_response === "string") {
      const parsed = tryParseJsonString(result.final_response);
      if (parsed && parsed.prd_output) {
        return cleanPrdOutput(parsed.prd_output);
      }
      // Check if it's HTML directly
      if (result.final_response.includes("<h1>") && result.final_response.includes("<h2>")) {
        return cleanPrdOutput(result.final_response);
      }
    }
  }

  return null;
};

function extractPrdMarkup(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return "";

  if (typeof value === "object") {
    // Check for prd_output field first
    if (Object.prototype.hasOwnProperty.call(value, "prd_output")) {
      const prdOutput = value.prd_output;
      // If prd_output is a string, try to parse it
      if (typeof prdOutput === "string") {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(prdOutput);
          if (parsed && typeof parsed === "object") {
            // If parsed successfully, extract from the parsed object
            const found = extractPrdMarkup(parsed, depth + 1);
            if (found) return found;
          }
        } catch (e) {
          // If not valid JSON, it might be the HTML content itself
          // Check if it contains HTML tags
          if (prdOutput.includes("<h1") || prdOutput.includes("<h2")) {
            return prdOutput;
          }
          // Try to clean and parse as loose JSON
          const cleaned = prdOutput.replace(/\\n/g, "\n").replace(/\\"/g, '"');
          try {
            const parsed = JSON.parse(cleaned);
            if (parsed && typeof parsed === "object") {
              const found = extractPrdMarkup(parsed, depth + 1);
              if (found) return found;
            }
          } catch (e2) {
            // Return the cleaned string if it contains HTML
            if (cleaned.includes("<h1") || cleaned.includes("<h2")) {
              return cleaned;
            }
          }
        }
      }
    }
    
    // Other existing checks
    const directKeys = ["message", "final_response", "content", "output", "result"];
    for (const key of directKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = extractPrdMarkup(value[key], depth + 1);
        if (found) return found;
      }
    }

    if (Array.isArray(value.messages)) {
      for (let i = value.messages.length - 1; i >= 0; i -= 1) {
        const found = extractPrdMarkup(value.messages[i], depth + 1);
        if (found) return found;
      }
    }

    for (const nested of Object.values(value)) {
      const found = extractPrdMarkup(nested, depth + 1);
      if (found) return found;
    }

    return "";
  }

  const raw = decodeEscapedText(value).trim();
  if (!raw) return "";

  // Check if it's a JSON string containing prd_output
  if (raw.startsWith("{") && raw.includes("prd_output")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const found = extractPrdMarkup(parsed, depth + 1);
        if (found) return found;
      }
    } catch (e) {
      // Continue with other checks
    }
  }

  const stripped = stripFence(raw)
    .replace(/^```html/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  if (stripped.includes("<h1") && stripped.includes("<h2")) {
    return stripped;
  }

  const prdOutputAssignment = stripped.match(/prd_output\s*[:=]\s*['"]([\s\S]*)['"]$/i);
  if (prdOutputAssignment) {
    const found = extractPrdMarkup(prdOutputAssignment[1], depth + 1);
    if (found) return found;
  }

  const parsed = parseLooseJson(stripped);
  if (parsed) {
    const found = extractPrdMarkup(parsed, depth + 1);
    if (found) return found;
  }

  return "";
}

function formatApiResponse(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function isHtmlLike(value) {
  return typeof value === "string" && /<[^>]+>/.test(value);
}

function extractDocumentFromAgentResponse(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return null;

  const parsed = typeof value === "string" ? parseApiJson(value) || toObjectIfPossible(value) : value;
  if (!parsed || typeof parsed !== "object") return null;

  const nestedKeys = ["data", "message", "final_response", "content", "output", "result", "body"];
  for (const key of nestedKeys) {
    const nested = parsed[key];
    if (!nested) continue;

    const extracted = extractDocumentFromAgentResponse(nested, depth + 1);
    if (extracted) return extracted;
  }

  if (parsed.brd_document) {
    const brdDocument = typeof parsed.brd_document === "string" ? parseApiJson(parsed.brd_document) || toObjectIfPossible(parsed.brd_document) : parsed.brd_document;
    if (brdDocument && typeof brdDocument === "object") return brdDocument;
  }

  return parsed;
}

function renderDocumentValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-slate-500">-</p>;
  }

  if (typeof value === "string") {
    if (isHtmlLike(value)) {
      return (
        <div
          className="rounded-[18px] border border-[#dacfff] bg-white p-5 prose prose-slate max-w-none shadow-[0_10px_35px_rgba(108,61,255,0.08)]"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      );
    }

    const lines = value
      .split(/(?:\r?\n|\\n)+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <p key={`${depth}-line-${idx}`} className="text-[16px] leading-8 text-[#4d466d]">
            {line}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    return (
      <ol className="space-y-3 pl-5 list-decimal marker:text-[#6c3dff]">
        {value.map((item, idx) => (
          <li key={`${depth}-arr-${idx}`} className="text-[16px] text-[#4d466d]">
            {item && typeof item === "object" ? renderDocumentValue(item, depth + 1) : String(item)}
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, nested]) => (
          <div key={`${depth}-obj-${key}`} className="rounded-[18px] border border-[#dacfff] bg-[#faf7ff] p-4 shadow-[0_8px_24px_rgba(108,61,255,0.06)]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6c3dff]">
              {formatKeyLabel(key)}
            </p>
            <div>{renderDocumentValue(nested, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-[16px] text-[#4d466d]">{String(value)}</p>;
}

function renderAgentResponseDocument(rawResponse, title) {
  const responseDocument = extractDocumentFromAgentResponse(rawResponse);
  if (!responseDocument) return null;

  const entries = Object.entries(responseDocument);
  const heading = String(
    responseDocument?.document_meta?.project_name ||
    responseDocument?.project_name ||
    responseDocument?.name ||
    title ||
    "Agent Response Document"
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-[#dacfff] bg-white p-7 shadow-[0_10px_35px_rgba(108,61,255,0.08)]">
        <div className="inline-flex rounded-full border border-[#dacfff] bg-[#f8f4ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c3dff]">
          Agent Response Document
        </div>
        <h4 className="mt-4 text-[38px] font-extrabold leading-none text-[#6c3dff]" style={{ fontFamily: "Syne, sans-serif" }}>{heading}</h4>
        <p className="mt-3 max-w-3xl text-[17px] leading-8 text-[#6b6390]">
          Structured JSON response received from the agent, rendered as a document for easier review.
        </p>
      </div>

      {entries.map(([key, value]) => (
        <section key={key} className="rounded-[30px] border border-[#dacfff] bg-white p-7 shadow-[0_10px_35px_rgba(108,61,255,0.08)]">
          <div className="mb-5 border-b border-[#e8deff] pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c3dff]">{formatKeyLabel(key)}</p>
          </div>
          <div className="prose prose-slate max-w-none">{renderDocumentValue(value)}</div>
        </section>
      ))}
    </div>
  );
}

function parseApiJson(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildApiResponseSnapshot(response, bodyText, body) {
  return {
    url: response.url,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    bodyText,
    body,
  };
}

function toObjectIfPossible(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function stripFence(value) {
  return String(value || "")
    .trim()
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

function parseLooseJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;

  const cleaned = stripFence(value);

  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === "object") return direct;
    if (typeof direct === "string") {
      const nested = parseLooseJson(direct);
      if (nested) return nested;
    }
  } catch {
    // continue
  }

  const extracted = extractJsonObjectString(cleaned);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // continue
    }
  }

  const relaxed = cleaned
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"');
  if (relaxed !== cleaned) {
    try {
      const parsed = JSON.parse(relaxed);
      if (parsed && typeof parsed === "object") return parsed;
      if (typeof parsed === "string") {
        const nested = parseLooseJson(parsed);
        if (nested) return nested;
      }
    } catch {
      // continue
    }

    const extractedRelaxed = extractJsonObjectString(relaxed);
    if (extractedRelaxed) {
      try {
        const parsed = JSON.parse(extractedRelaxed);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // continue
      }
    }
  }

  return null;
}

function normalizeLooseText(value) {
  return stripFence(String(value || ""))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [prototypeLinks, setPrototypeLinks] = useState({});
  const [templateDownloadMapByStage, setTemplateDownloadMapByStage] = useState({});
  const [loadingStageTemplates, setLoadingStageTemplates] = useState({});
  const [showPersonaSection, setShowPersonaSection] = useState(false);
  const [personaCards, setPersonaCards] = useState([]);
  const [activePersonaCardId, setActivePersonaCardId] = useState(null);
  const [isPersonaCardsLoading, setIsPersonaCardsLoading] = useState(false);
  const [personaCardsError, setPersonaCardsError] = useState("");
  const [combinedPersonaOutput, setCombinedPersonaOutput] = useState("");
  const [isCombiningPersonaOutput, setIsCombiningPersonaOutput] = useState(false);
  const [combinedPersonaOutputError, setCombinedPersonaOutputError] = useState("");
  const [showCombinedOutputModal, setShowCombinedOutputModal] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [finalPersonaCard, setFinalPersonaCard] = useState(null);
  const [completedStages, setCompletedStages] = useState([]);
  const [processFlowData, setProcessFlowData] = useState(null);
const [isGeneratingProcessFlow, setIsGeneratingProcessFlow] = useState(false);
const [processFlowError, setProcessFlowError] = useState("");
const [informationArchitectureData, setInformationArchitectureData] = useState(null);
const [isGeneratingIA, setIsGeneratingIA] = useState(false);
const [informationArchitectureError, setInformationArchitectureError] = useState("");
const [isBrdModalOpen, setIsBrdModalOpen] = useState(false);
const [brdLoading, setBrdLoading] = useState(false);
const [brdError, setBrdError] = useState("");
const [brdData, setBrdData] = useState(null);
const [isDownloadingBrd, setIsDownloadingBrd] = useState(false);
const [brdCollapsed, setBrdCollapsed] = useState({});
const [isPrdModalOpen, setIsPrdModalOpen] = useState(false);
const [prdLoading, setPrdLoading] = useState(false);
const [prdError, setPrdError] = useState("");
const [prdHtml, setPrdHtml] = useState("");
const [prdRawResponse, setPrdRawResponse] = useState("");
const [isDownloadingPrd, setIsDownloadingPrd] = useState(false);
const [brdProgress, setBrdProgress] = useState([]);
const [prdProgress, setPrdProgress] = useState([]);
const BRD_STEPS = [
  "Analyzing requirements",
  "Extracting business requirements",
  "Structuring BRD sections",
  "Validating completeness",
  "Finalizing document",
];

const PRD_STEPS = [
  "Analyzing system flow",
  "Mapping product features",
  "Structuring PRD sections",
  "Adding technical details",
  "Finalizing document",
];

  useEffect(() => {
    fetchProject();
    fetch(`/api/projects/${projectId}/progress`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success)
          setCompletedStages((res.data.completedStages || []).map((s) => s.toLowerCase()));
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!isBrdModalOpen && !isPrdModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsBrdModalOpen(false);
        setIsPrdModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBrdModalOpen, isPrdModalOpen]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const response = await api.getProjectById(projectId);
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError("Project not found");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!projectId) return;

    setIsLoadingDocs(true);
    try {
    const userId = "u";
    const response = await api.getDocuments(userId);
    if (response.success && response.data) {
      setDocuments(response.data);
    }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchTemplateDownloadMap = async () => {
    try {
    const response = await api.getTemplates();
    if (!response.success || !Array.isArray(response.data)) return;

    const map = {};
    response.data.forEach((template) => {
      const stageId = String(template.stageId || "").toLowerCase().trim();
      const templateName = String(template.templateName || "").toLowerCase().trim();
      if (!stageId || !templateName) return;

      map[`${stageId}::${templateName}`] = template.templateId;
    });

    setTemplateDownloadMapByStage(map);
    } catch (err) {
      console.error("Failed to fetch templates for download mapping:", err);
    }
  };

  const ensureStageTemplatesLoaded = async (stageId) => {
    const normalizedStageId = String(stageId || "").toLowerCase().trim();
    if (!normalizedStageId || templateDownloadMapByStage[normalizedStageId] || loadingStageTemplates[normalizedStageId]) {
      return;
    }

    setLoadingStageTemplates((prev) => ({ ...prev, [normalizedStageId]: true }));

    try {
      const response = await api.getTemplatesByStage(normalizedStageId);
      if (!response.success || !Array.isArray(response.data)) return;

      const map = {};
      response.data.forEach((template) => {
        const stageKey = String(template.stageId || normalizedStageId).toLowerCase().trim();
        const templateName = String(template.templateName || "").toLowerCase().trim();
        if (!stageKey || !templateName) return;
        map[`${stageKey}::${templateName}`] = template.templateId;
      });

      setTemplateDownloadMapByStage((prev) => ({
        ...prev,
        [normalizedStageId]: map,
      }));
    } catch (err) {
      console.error("Failed to fetch templates for stage:", normalizedStageId, err);
    } finally {
      setLoadingStageTemplates((prev) => ({ ...prev, [normalizedStageId]: false }));
    }
  };

  const getDocsForStage = (stageId) => documents.filter((d) => d.stageId === stageId && d.projectId === projectId);
  const getDocsForTemplate = (stageId, templateId) => documents.filter((d) => d.stageId === stageId && d.templateId === templateId && d.projectId === projectId);

 const getStageStatus = (stageId) => {
  if (completedStages.includes(stageId)) return "Completed";
  return "Not Started";
};
 const getProgress = () => {
  const totalStages = STAGES.length;
  const completed = completedStages.length;

  return Math.round((completed / totalStages) * 100);
};

 const Section = ({ title, items }) => {
    const safeItems = Array.isArray(items)
      ? items
      : typeof items === "string"
      ? items.split("\n")
      : [];

    return (
      <div>
        <h4 className="font-semibold mb-2">{title}</h4>

        {safeItems.length > 0 ? (
          <ul className="list-disc ml-5 text-sm space-y-1">
            {safeItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No data available</p>
        )}
      </div>
    );
  };

  const getFileName = (path) => {
    if (!path) return "Document";
    const parts = path.split("/");
    return parts[parts.length - 1] || "Document";
  };

  const getWorkspaceUrl = (templateName) => {
    return `/projects/${projectId}/workspace?template=${encodeURIComponent(templateName)}&projectName=${encodeURIComponent(project.projectName)}&description=${encodeURIComponent(project.projectDescription)}`;
  };

  const parsePersonaOutput = (rawOutput, fallbackName) => {
    const normalized = String(rawOutput || "").replace(/\r\n/g, "\n").trim();

    if (!normalized) {
      return {
        name: fallbackName || "Persona",
        quote: "",
        background: "No generated persona output is available yet.",
        says:[],
        thinks:[],
        does:[],
        feels:[],
        goals: [],
        motivations: [],
        frustrations: [],
        needs: [],
        keyInsights: [],
        previousExperience: [],
        expectations: [],
      };
    }

    const getHeadingBlock = (text, headingPattern) => {
      const regex = new RegExp(`(?:^|\\n)\\s*(?:\\*\\*)?${headingPattern}(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?[A-Za-z][^\\n]{0,80}(?:\\*\\*)?\\s*:?\\s*(?:\\n|$)|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const getBullets = (block) => {
      if (!block) return [];
      const lines = block
        .split("\n")
        .map((line) => line.replace(/^\s*[-*\u2022\d]+[.)-]?\s*/, "").trim())
        .filter(Boolean);
      return lines;
    };

    const nameMatch = normalized.match(/(?:^|\\n)\s*(?:Name|Persona Name)\s*:\s*(.+)$/im);
    const quoteMatch = normalized.match(/"([^"]+)"/);

    const background =
      getHeadingBlock(normalized, "Background(?:\\s+Description)?") ||
      getHeadingBlock(normalized, "Description") ||
      "";

    return {
  name: (nameMatch?.[1] || fallbackName || "Persona").trim(),
  quote: (quoteMatch?.[1] || "").trim(),
  background: background || "No background description found.",

  says: getBullets(getHeadingBlock(normalized, "Says")),
  thinks: getBullets(getHeadingBlock(normalized, "Thinks")),
  does: getBullets(getHeadingBlock(normalized, "Does")),
  feels: getBullets(getHeadingBlock(normalized, "Feels")),

  goals: getBullets(getHeadingBlock(normalized, "Goals")),
  motivations: getBullets(getHeadingBlock(normalized, "Motivations?")),
  frustrations: getBullets(getHeadingBlock(normalized, "Frustrations?")),
  needs: getBullets(getHeadingBlock(normalized, "Needs?")),
  keyInsights: getBullets(getHeadingBlock(normalized, "Key\s+Insights?")),
};
  };

  const fetchPersonaCards = async () => {
    setIsPersonaCardsLoading(true);
    setPersonaCardsError("");

    try {
      const res = await fetch(`/api/personas?projectId=${projectId}&includeGenerated=true`);
      const data = await res.json();

      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to load persona cards");
      }

      const cards = (data?.data || []).map((row) => {
        const parsed = parsePersonaOutput(row.generated_output || "", row.interviewee_name || row.persona_name);

        return {
          personaId: row.persona_id,
          personaName: row.persona_name,
          interviewId: row.interview_id,
          generatedAt: row.generated_at,
          hasGeneratedOutput: Boolean((row.generated_output || "").trim()),
          demographics: {
            gender: row.gender || "-",
            age: row.age ?? "-",
            location: row.location || "-",
            relationshipStatus: row.relationship_status || "-",
            title: row.title || "-",
            education: row.education || "-",
          },
          parsed,
        };
      });

      setPersonaCards(cards);
      setActivePersonaCardId(cards[0]?.personaId || null);
    } catch (err) {
      setPersonaCardsError(err.message || "Failed to load persona cards");
      setPersonaCards([]);
      setActivePersonaCardId(null);
    } finally {
      setIsPersonaCardsLoading(false);
    }
  };

  const handleCombinePersonaOutputs = async () => {
  setIsCombiningPersonaOutput(true);
  setCombinedPersonaOutput("");
  setCombinedPersonaOutputError("");

  try {
    const res = await fetch(`/api/personas?projectId=${projectId}&aggregateGenerated=true`);
    const data = await res.json();

    if (!data?.success) {
      throw new Error(data?.error?.message || "Failed to combine persona outputs");
    }

    const combinedOutput = data?.data?.combinedOutput || "";
    setCombinedPersonaOutput(combinedOutput);

    const agentRes = await fetch("/api/generate-persona-card", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  project_description: project?.projectDescription,
  persona_name: finalPersonaCard?.name,
  background: finalPersonaCard?.background,
  demographics: finalPersonaCard?.demographics,
  scenario: finalPersonaCard?.scenario,
  personality: finalPersonaCard?.personality,
  goals: finalPersonaCard?.goals,
  frustrations: finalPersonaCard?.frustrations,
  motivations: finalPersonaCard?.motivations,
  needs: finalPersonaCard?.needs,
  positive_themes: finalPersonaCard?.positiveThemes,
  negative_themes: finalPersonaCard?.negativeThemes,
  empathy_map: combinedOutput,
}),
    });

    const agentData = await agentRes.json();

    if (!agentData?.success) {
      throw new Error(agentData?.error || "Agent failed");
    }
    setFinalPersonaCard(agentData.persona_card);

  } catch (err) {
    setCombinedPersonaOutputError(err.message || "Failed to combine persona outputs");
    setCombinedPersonaOutput("");
  } finally {
    setIsCombiningPersonaOutput(false);
  }
};

const handleGenerateProcessFlow = async () => {
  setIsGeneratingProcessFlow(true);
  setProcessFlowError("");

  try {
    console.log("Sending generate process flow request:", { projectId });
    const agentRes = await fetch("/api/generate-process-flow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    const agentData = await agentRes.json();

    if (!agentData?.success) {
      console.error("PROCESS FLOW AGENT RAW RESPONSE:", JSON.stringify(agentData?.raw, null, 2));
      throw new Error(agentData?.error || "Process Flow generation failed");
    }

    sessionStorage.removeItem("processFlowData");
    sessionStorage.setItem(
      "processFlowData",
      JSON.stringify(agentData.process_flow)
    );

    router.push(`/process-flow?projectId=${projectId}`);

  } catch (err) {
    setProcessFlowError(err.message || "Failed to generate process flow");
  } finally {
    setIsGeneratingProcessFlow(false);
  }
};

const handleGenerateInformationArchitecture = async () => {
  setIsGeneratingIA(true);
  setInformationArchitectureError("");

  try {
    if (!projectId) {
      throw new Error("Project ID is missing");
    }

    let combinedOutput = String(combinedPersonaOutput || "").trim();

    if (!combinedOutput) {
      try {
        const res = await fetch(
          `/api/personas?projectId=${projectId}&aggregateGenerated=true`
        );
        const data = await res.json();

        if (data?.success) {
          combinedOutput = String(data?.data?.combinedOutput || "").trim();
          if (combinedOutput) {
            setCombinedPersonaOutput(combinedOutput);
          }
        }
      } catch (fetchErr) {
        console.warn("Failed to prefetch combined persona output:", fetchErr);
      }
    }

    const agentRes = await fetch("/api/generate-information-architecture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        combinedPersonaOutput: combinedOutput,
      }),
    });

    const agentData = await agentRes.json();

    if (!agentData?.success) {
      throw new Error(
        agentData?.error || "Information Architecture generation failed"
      );
    }

    setInformationArchitectureData(agentData.information_architecture);

    sessionStorage.setItem(
      "informationArchitectureData",
      JSON.stringify(agentData.information_architecture)
    );

    sessionStorage.setItem(
      "informationArchitecturePrompt",
      agentData?.information_architecture?.PROMPT || ""
    );

    sessionStorage.setItem(
      "informationArchitectureRawResponse",
      agentData?.information_architecture?.RAW_RESPONSE || ""
    );

    router.push(`/information-architecture?projectId=${projectId}`);

  } catch (err) {
    setInformationArchitectureError(
      err.message || "Failed to generate Information Architecture"
    );
  } finally {
    setIsGeneratingIA(false);
  }
};
  const togglePersonaSection = async () => {
    if (showPersonaSection) {
      setShowPersonaSection(false);
      return;
    }

    setCombinedPersonaOutput("");
    setCombinedPersonaOutputError("");
    setShowPersonaSection(true);
    await fetchPersonaCards();
  };

  const handleMarkStageComplete = async (stageId) => {
    if (completedStages.includes(stageId)) return;
    try {
      await fetch(`/api/projects/${projectId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageId, progress: 100 }),
      });
      setCompletedStages((prev) => [...prev, stageId]);
      window.dispatchEvent(new Event("neurox:progress-updated"));
    } catch (err) { console.error("Failed to mark stage complete:", err); }
  };
  const renderUploadButton = (label) => (
    <label className="block w-full cursor-pointer">
      <input type="file" className="hidden" onChange={() => alert("Upload will connect to document API")} />
      <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
        <Upload className="h-4 w-4" />
        {label}
      </span>
    </label>
  );

  const renderEmpathizeTemplateCard = (template, downloadableTemplateId, isCompleted) => {
    const media = EMPATHIZE_CARD_MEDIA[template.id] || EMPATHIZE_CARD_MEDIA["other-files"];
    const workspaceUrl = getWorkspaceUrl(template.name);
    const topActionLabel = "Start";
    const primaryFooterLabel = template.id === "user-persona" ? "Use Basic Template" : "Use Standard Template";
    const uploadLabel = template.id === "empathy-map" ? "Upload Standard Template" : "Upload Templates";
    return (
      <div key={template.id} className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100 ${isCompleted ? "border border-indigo-300 shadow-md shadow-indigo-100 ring-1 ring-indigo-200" : "border border-gray-100 shadow-sm"}`}>
        {isCompleted && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg shadow-indigo-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
            Completed
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ${media.iconColor} group-hover:bg-indigo-100 transition-colors`} dangerouslySetInnerHTML={{ __html: media.icon.replace('width="48" height="48"', 'width="24" height="24"') }} />
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">{media.eyebrow}</p>
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{media.title}</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{media.description}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); if (template.id === "user-persona") { router.push(`/view-persona?projectId=${encodeURIComponent(projectId)}&projectName=${encodeURIComponent(project?.projectName || "")}`); return; } router.push(workspaceUrl); }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
            >
              {topActionLabel} 
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (!downloadableTemplateId) return; window.location.assign(`/api/templates/download/${downloadableTemplateId}`); }}
              disabled={!downloadableTemplateId}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />{primaryFooterLabel}
            </button>
            {renderUploadButton(uploadLabel)}
          </div>
        </div>
      </div>
    );
  };
  const runProgressSteps = async (steps, setProgress) => {
  setProgress([]);

  for (let i = 0; i < steps.length; i++) {
    await new Promise((res) => setTimeout(res, 2000));

    setProgress((prev) => [
      ...prev,
      { label: steps[i], done: i !== steps.length - 1 },
    ]);
  }
};

  const renderDefineTemplateCard = (template, downloadableTemplateId, isCompleted) => {
  const media = DEFINE_CARD_MEDIA[template.id] || DEFINE_CARD_MEDIA["problem-statement"];
  const workspaceUrl = getWorkspaceUrl(template.name);
  return (
    <div key={template.id} className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100 ${isCompleted ? "border border-indigo-300 shadow-md shadow-indigo-100 ring-1 ring-indigo-200" : "border border-gray-100 shadow-sm"}`}>
      {isCompleted && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg shadow-indigo-200">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          Completed
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ${media.iconColor} group-hover:bg-indigo-100 transition-colors`} dangerouslySetInnerHTML={{ __html: media.icon.replace('width="48" height="48"', 'width="24" height="24"') }} />
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">{media.eyebrow}</p>
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{media.title}</h4>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{media.description}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {template.id === "process-flow" ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerateProcessFlow(); }}
                disabled={isGeneratingProcessFlow}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGeneratingProcessFlow ? "Generating..." : "Generate"}
              </button>
              {processFlowError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{processFlowError}</p>}
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/projects/${projectId}/define#problem-definition-card`); }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
            >
              Define 
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (!downloadableTemplateId) return; window.location.assign(`/api/templates/download/${downloadableTemplateId}`); }}
            disabled={!downloadableTemplateId}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />Use Standard Template
          </button>
          {renderUploadButton("Upload Template")}
        </div>
      </div>
    </div>
  );
};

const renderGenericCard = (template, stageId, downloadableTemplateId, link, isCompleted) => {
  const mediaMap = STAGE_MEDIA_MAP[stageId] || {};
  const media = mediaMap[template.id] || { image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=800&fit=crop", eyebrow: stageId, title: template.name, description: "" };
  return (
    <div key={template.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${isCompleted ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200"}`}>
      <div className="relative h-44 overflow-hidden">
        <img src={media.image} alt={template.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/10 to-transparent" />
        {isCompleted && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
            Completed
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{media.eyebrow}</p>
          <h4 className="mt-1 text-base font-semibold">{media.title}</h4>
          {media.description && <p className="mt-0.5 text-xs text-white/80 line-clamp-2">{media.description}</p>}
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        {template.type === "link" && (
          <input type="text" value={link} onChange={(e) => setPrototypeLinks((prev) => ({ ...prev, [`${stageId}-${template.id}`]: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Paste prototype link..." />
        )}
        {template.type === "file" && (
          <label className="block w-full cursor-pointer">
            <input type="file" className="hidden" onChange={() => alert("Upload will connect to document API")} />
            <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Upload className="h-4 w-4" />Upload File</span>
          </label>
        )}
        {downloadableTemplateId && (
          <button onClick={() => window.location.assign(`/api/templates/download/${downloadableTemplateId}`)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
            <Download className="h-4 w-4" />Download Template
          </button>
        )}
      </div>
    </div>
  );
};
const WireframeReviewerCard = () => {
  const [image, setImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [wireframeError, setWireframeError] = useState("");
  const inputRef = useRef(null);
  const media = IDEATE_CARD_MEDIA["wireframe-reviewer"];

  const normalizeWireframeError = (value) => {
    const text = String(value || "").trim();
    if (!text) return "Analysis failed. Please try again.";
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return "Wireframe service returned an unexpected error page. Please try again.";
    }
    return text;
  };

  const handleFile = async (file) => {
    if (!file || isGenerating) return;

    setWireframeError("");
    setIsGenerating(true);
    setImage({ name: file.name, url: URL.createObjectURL(file) });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze-wireframe", { method: "POST", body: formData });
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(normalizeWireframeError(text));
      }

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(normalizeWireframeError(data?.error));
      }

      sessionStorage.setItem("wireframeResult", data.result);
      if (data._fallback) {
        sessionStorage.setItem("wireframeResultFallback", "1");
      } else {
        sessionStorage.removeItem("wireframeResultFallback");
      }
      router.push(`/projects/${projectId}/wireframe-result`);
    } catch (error) {
      console.warn("[WireframeReviewer]", error?.message || error);
      setWireframeError(normalizeWireframeError(error?.message));
      setIsGenerating(false);
    }
  };

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  const handleRemove = () => {
    setImage(null);
    setWireframeError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
   <div className="relative flex flex-col rounded-2xl bg-white border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100">

  {isGenerating && (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/85 backdrop-blur-sm px-4 py-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing wireframe...
      </div>
    </div>
  )}

  <div className="p-5 flex items-start gap-3">
    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
      <FileText className="w-5 h-5 text-indigo-600" />
    </div>

    <div>
      <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase">
        Design Review
      </p>
      <h3 className="text-base font-semibold text-gray-900">
        Wireframe Reviewer
      </h3>
    </div>
  </div>

  <p className="px-5 text-sm text-gray-600">
    Upload a wireframe image for AI-powered review and analysis.
  </p>

  <div className="px-5 mt-3">
    {wireframeError && (
      <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
        <p className="text-xs text-red-700">{wireframeError}</p>
      </div>
    )}

    {!wireframeError && image && (
      <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2">
        <span className="text-xs text-green-700 truncate">
          {image.name}
        </span>

        {!isGenerating && (
          <button
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>
    )}
  </div>

  <div className="mt-auto p-5">
    <button
      onClick={() => inputRef.current?.click()}
      disabled={isGenerating}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        "Upload Image"
      )}
    </button>

    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      disabled={isGenerating}
      onChange={(e) => handleFile(e.target.files[0])}
    />
  </div>
</div>
  );
};
const renderIdeateTemplateCard = (template, isCompleted) => {
  const media = IDEATE_CARD_MEDIA[template.id] || IDEATE_CARD_MEDIA["information-architecture"];

  return (
    <div className={`group relative flex flex-col rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100 ${
      isCompleted ? "border border-indigo-300 ring-1 ring-indigo-200" : "border border-gray-100"
    }`}>

      {isCompleted && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
          </svg>
          Completed
        </div>
      )}

      <div className="p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
      <FileText className="w-5 h-5 text-indigo-600" />
    </div>

        <div>
          <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase">
            {media.eyebrow}
          </p>
          <h3 className="text-base font-semibold text-gray-900">
            {media.title}
          </h3>
        </div>
      </div>

      <p className="px-5 text-sm text-gray-600">
        {media.description}
      </p>

      <div className="mt-auto p-5 space-y-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleGenerateInformationArchitecture();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700"
        >
          Generate IA
        </button>

        {informationArchitectureError && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {informationArchitectureError}
          </p>
        )}
      </div>
    </div>
  );
};

const handleOpenBrdModal = async () => {
  setIsBrdModalOpen(true);
  setBrdProgress([]);
  runProgressSteps(BRD_STEPS, setBrdProgress);

  if (!projectId) {
    setBrdError("Project id is missing.");
    return;
  }

  setBrdLoading(true);
  setBrdError("");
  setBrdCollapsed({});

  try {
    const res = await fetch("/api/generate-brd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(projectId) }),
    });

    const bodyText = await res.text();
    const data = parseApiJson(bodyText);

    if (!data) {
      throw new Error("API returned invalid JSON.");
    }

    if (!res.ok || !data?.success) {
      throw new Error(data?.error?.message || data?.error || "Failed to generate BRD document");
    }

    setBrdData(data?.data?.brd || data?.brd || null);
  } catch (err) {
    setBrdError(err.message || "Failed to generate BRD document");
    setBrdData(null);
  } finally {
    setBrdLoading(false);
  }
};

const handleOpenPrdModal = async () => {
  setIsPrdModalOpen(true);
  setPrdProgress([]);
  runProgressSteps(PRD_STEPS, setPrdProgress);

  if (!projectId) {
    setPrdError("Project id is missing.");
    return;
  }

  setPrdLoading(true);
  setPrdError("");
  setPrdRawResponse("");

  try {
    const res = await fetch("/api/generate-prd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(projectId) }),
    });

    const bodyText = await res.text();
    console.log("Raw response:", bodyText);

    // Parse the main response
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      setPrdError("Invalid JSON response from server");
      setPrdHtml("");
      return;
    }

    setPrdRawResponse(formatApiResponse(data?.agent_response || ""));

    if (!data) {
      setPrdError("API returned invalid data.");
      setPrdHtml("");
      return;
    }

    if (!res.ok || !data?.success) {
      setPrdError(data?.error?.message || data?.error || "Failed to generate PRD document");
      setPrdHtml("");
      return;
    }

    // Extract PRD content
    let prdContent = "";

    // Check data.prd_output (this is where the content is)
    if (data?.prd_output) {
      prdContent = data.prd_output;
    } else if (data?.data?.prd_output) {
      prdContent = data.data.prd_output;
    } else if (data?.final_response?.prd_output) {
      prdContent = data.final_response.prd_output;
    } else if (data?.final_response && typeof data.final_response === 'string') {
      // Try to parse final_response as JSON
      try {
        const parsed = JSON.parse(data.final_response);
        if (parsed?.prd_output) {
          prdContent = parsed.prd_output;
        }
      } catch (e) {
        // Handle Python-repr style: prd_output='<html>...'
        const pyMatch = data.final_response.match(/prd_output\s*=\s*'([\s\S]*)'$/);
        if (pyMatch) {
          prdContent = pyMatch[1];
        } else {
          prdContent = data.final_response;
        }
      }
    }

    console.log("PRD Content before cleaning:", prdContent);

    if (!prdContent) {
      setPrdError("Could not extract PRD content from response.");
      setPrdHtml("");
      return;
    }

    let cleaned = prdContent;

    if (typeof cleaned === 'string' && cleaned.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.prd_output) {
          cleaned = parsed.prd_output;
        }
      } catch (e) {
        const match = cleaned.match(/"prd_output"\s*:\s*"([\s\S]*?)"\s*}$/);
        if (match) cleaned = match[1];
      }
    }

    // Guard: if cleaned still looks like raw JSON, try one more extraction pass
    if (cleaned.trim().startsWith('{') && cleaned.includes('prd_output')) {
      const fallback = extractPrdMarkup(cleaned);
      if (fallback) cleaned = fallback;
    }

    console.log("PRD Content after cleaning:", cleaned);

    if (!cleaned) {
      setPrdError("PRD content is empty after cleaning.");
      setPrdHtml("");
      return;
    }

    // If it doesn't have HTML tags, convert markdown-like content to HTML
    if (!cleaned.includes('<h1') && !cleaned.includes('<h2')) {
      cleaned = convertMarkdownToHtml(cleaned);
    }

    // Final sanitization before rendering
    cleaned = sanitizePrdText(cleaned);
    setPrdHtml(cleaned);
  } catch (err) {
    console.error("PRD Error:", err);
    setPrdError(err.message || "Failed to generate PRD document");
    setPrdHtml("");
  } finally {
    setPrdLoading(false);
  }
};
const handleDownloadPrdDoc = async () => {
  if (!prdHtml || isDownloadingPrd) return;

  setIsDownloadingPrd(true);
  try {
    const parser = new DOMParser();
    const dom = parser.parseFromString(prdHtml, "text/html");
    const children = [];
    let titleAdded = false;

    const elements = dom.body.querySelectorAll("h1, h2, h3, p, li, table");
    elements.forEach((element) => {
      const tag = element.tagName.toLowerCase();
      const text = (element.textContent || "").trim();

      if (tag === "h1") {
        titleAdded = true;
        children.push(
          new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 220 } })
        );
        return;
      }

      if (tag === "h2") {
        children.push(
          new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 120 } })
        );
        return;
      }

      if (tag === "h3") {
        children.push(
          new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 140, after: 100 } })
        );
        return;
      }

      if (tag === "p" && text) {
        children.push(new Paragraph({ text, spacing: { after: 120 } }));
        return;
      }

      if (tag === "li" && text) {
        children.push(new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } }));
        return;
      }

      if (tag === "table") {
        const rows = Array.from(element.querySelectorAll("tr"));
        if (!rows.length) return;

        const maxCols = rows.reduce(
          (max, row) => Math.max(max, row.querySelectorAll("td,th").length),
          0
        );
        if (!maxCols) return;

        const tableRows = rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td,th"));
          const tableCells = [];

          for (let i = 0; i < maxCols; i += 1) {
            const cellText = (cells[i]?.textContent || "").trim();
            tableCells.push(
              new TableCell({
                children: [new Paragraph({ text: cellText || " " })],
              })
            );
          }

          return new TableRow({ children: tableCells });
        });

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          })
        );
      }
    });

    if (!titleAdded) {
      children.unshift(
        new Paragraph({
          text: "Product Requirements Document",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        })
      );
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "product-requirements-document.docx");
  } finally {
    setIsDownloadingPrd(false);
  }
};

const BRD_SECTIONS = [
  { key: "business_problem", num: "01", title: "Business Problem", type: "prose" },
  { key: "objectives_and_outcomes", num: "02", title: "Objectives & Outcomes", type: "prose" },
  { key: "users_and_personas", num: "03", title: "Users & Personas", type: "tags" },
  { key: "business_requirements", num: "04", title: "Business Requirements", type: "requirements" },
  { key: "functional_scope", num: "05", title: "Functional Scope", type: "prose" },
  { key: "non_functional_expectations", num: "06", title: "Non Functional Expectations", type: "prose" },
  { key: "integrations", num: "07", title: "Integrations", type: "tags" },
  { key: "compliance_and_security", num: "08", title: "Compliance & Security", type: "prose" },
  { key: "success_metrics", num: "09", title: "Success Metrics", type: "metrics_table" },
  { key: "key_stakeholders", num: "10", title: "Key Stakeholders", type: "editable" },
  { key: "project_constraints", num: "11", title: "Project Constraints", type: "constraints_table" },
  { key: "cost_benefit_analysis", num: "12", title: "Cost Benefit Analysis", type: "costtable" },
  { key: "document_approval", num: "13", title: "Document Approval", type: "editable" },
  { key: "draft_assumptions", num: "14", title: "Draft Assumptions", type: "tags" },
];

const brdDoc = (() => {
  if (!brdData) return null;
  if (typeof brdData === "object") return brdData;
  try {
    return JSON.parse(brdData);
  } catch {
    return null;
  }
})();

const brdMeta =
  brdDoc?.document_meta && typeof brdDoc.document_meta === "object"
    ? brdDoc.document_meta
    : null;

const brdActiveSections = BRD_SECTIONS.filter((section) => {
  if (!brdDoc) return false;
  const value = brdDoc[section.key];
  return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
});

const toggleBrdSection = (key) =>
  setBrdCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

const getLabelVal = (text, label) => {
  const match = String(text || "").match(new RegExp(`${label}:\\s*([^.]+)`, "i"));
  return match ? match[1].trim() : "";
};

const getConstraintVal = (text, label) => {
  const match = String(text || "").match(
    new RegExp(`${label}:\\s*(.*?)(?=(?:Constraint|Description|Impact|Mitigation):|$)`, "i")
  );
  return match ? match[1].trim() : "";
};

const renderBrdContent = (value, type) => {
  if (type === "prose") {
    return (
      <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
        {String(value || "")}
      </p>
    );
  }

  if (type === "tags") {
    if (!Array.isArray(value)) return null;
    return (
      <ul className="space-y-2">
        {value.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            <span className="text-[14px] leading-7 text-slate-700">{String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "requirements") {
    if (!Array.isArray(value)) return null;
    return (
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px] text-slate-700">
          <thead>
            <tr className="bg-slate-800 text-[11px] uppercase tracking-[0.14em] text-slate-100">
              <th className="px-4 py-2.5">Requirement ID</th>
              <th className="px-4 py-2.5">Requirement Statement</th>
              <th className="px-4 py-2.5">Priority</th>
            </tr>
          </thead>
          <tbody>
        {value.map((line, index) => {
          const parts = String(line || "").split("|").map((part) => part.trim());
          const id = parts[0] || `BR-${String(index + 1).padStart(3, "0")}`;
          const desc = parts[1] || "";
          const pri = (parts[2] || "").replace(/priority:/i, "").trim();
          const priColor =
            pri.toLowerCase() === "high"
              ? "bg-red-100 text-red-700"
              : pri.toLowerCase() === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700";

          return (
            <tr
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              <td className="border-t border-slate-200 px-4 py-3 font-semibold text-slate-800">{id}</td>
              <td className="border-t border-slate-200 px-4 py-3 leading-7">{desc || "-"}</td>
              <td className="border-t border-slate-200 px-4 py-3">
                {pri ? (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${priColor}`}>
                    {pri}
                  </span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          );
        })}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "metrics_table") {
    if (!Array.isArray(value)) return null;
    const cols = ["Metric", "Baseline", "Target", "Measurement", "Review"];
    return (
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px] text-slate-700">
          <thead className="bg-slate-800 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100">
            <tr>
              {cols.map((head) => (
                <th key={head} className="px-4 py-2.5">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((item, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                {cols.map((label) => (
                  <td key={label} className="border-t border-slate-200 px-4 py-3">
                    {getLabelVal(item, label)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "constraints_table") {
    if (!Array.isArray(value)) return null;
    const cols = ["Constraint", "Description", "Impact", "Mitigation"];
    return (
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px] text-slate-700">
          <thead className="bg-slate-800 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100">
            <tr>
              {cols.map((head) => (
                <th key={head} className="px-4 py-2.5">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((item, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                {cols.map((label) => (
                  <td key={label} className="border-t border-slate-200 px-4 py-3">
                    {getConstraintVal(item, label)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "editable") {
    if (!Array.isArray(value)) return null;
    return (
      <div className="space-y-2.5">
        {value.map((item, index) => (
          <p
            key={index}
            className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] leading-7 text-slate-700"
          >
            {String(item || "-")}
          </p>
        ))}
      </div>
    );
  }

  if (type === "costtable") {
    return (
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px] text-slate-700">
          <thead className="bg-slate-800 text-[11px] uppercase tracking-[0.14em] text-slate-100">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Cost</th>
              <th className="px-4 py-2.5 font-semibold">Benefit</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((row) => (
              <tr key={row} className={row % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="border-t border-slate-200 px-4 py-3">-</td>
                <td className="border-t border-slate-200 px-4 py-3">-</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-100">
              <td className="px-4 py-2.5 font-semibold">Total Cost:</td>
              <td className="px-4 py-2.5 font-semibold">Expected ROI:</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
      {String(value || "")}
    </p>
  );
};

const handleDownloadBrdDoc = async () => {
  if (!brdDoc || isDownloadingBrd) return;

  setIsDownloadingBrd(true);
  try {
    const title = String(brdMeta?.project_name || "Business Requirements Document");
    const paragraphs = [
      new Paragraph({
        children: [new TextRun({ text: "Business Requirements Document", bold: true, size: 36 })],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: title, italics: true, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
      }),
    ];

    if (brdMeta) {
      paragraphs.push(
        new Paragraph({ text: "Document Meta", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } })
      );
      Object.entries(brdMeta).forEach(([key, value]) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${formatKeyLabel(key)}: `, bold: true }),
              new TextRun({ text: String(value ?? "") }),
            ],
            spacing: { after: 120 },
          })
        );
      });
    }

    brdActiveSections.forEach((section) => {
      paragraphs.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 220, after: 140 },
        })
      );
      appendWordValue(paragraphs, brdDoc[section.key], 0);
    });

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);

    const safeName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    saveAs(blob, `${safeName || "brd-document"}.docx`);
  } finally {
    setIsDownloadingBrd(false);
  }
};

  if (isLoading) {
    return (
      <div className="bg-[#fafafa]">
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center gap-6">
          <button onClick={() => router.push("/projects")} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
          <div><div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-2" /><div className="h-4 w-96 bg-gray-200 animate-pulse rounded" /></div>
        </div>
        <div className="px-8 py-8 flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff]" /></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-[#fafafa]">
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center gap-6">
          <button onClick={() => router.push("/projects")} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
          <div><h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Project</h1><p className="text-sm text-gray-600">{error}</p></div>
        </div>
        <div className="px-8 py-8"><button onClick={() => router.push("/projects")} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg">Go Back</button></div>
      </div>
    );
  }

  const isProjectCompleted = project.status === "Completed";
  const activePersonaCard =
    personaCards.find((card) => card.personaId === activePersonaCardId) || null;

  return (
    <div className="bg-[#fafafa]">
      <div className="bg-white border-b border-gray-200 px-8 py-6 mt-1">
        <div className="flex items-start gap-6">
          <button onClick={() => router.push("/projects")} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 flex-shrink-0 mt-1"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{project.projectName}</h1>
            <p
  className={`text-sm text-gray-600 leading-relaxed max-w-3xl cursor-pointer ${
    showFullDesc ? "" : "line-clamp-2"
  }`}
  onClick={() => setShowFullDesc(!showFullDesc)}
>
  {project.projectDescription || "No description"}
  {!showFullDesc && "..."}
</p>
            
            <div className="flex items-center justify-start gap-8 mt-4">
              <div className="flex items-center gap-2"><span className="text-xs uppercase tracking-wide text-gray-500 font-medium">Client:</span><span className="text-sm text-gray-900 font-medium">{project.client || "N/A"}</span></div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2"><span className="text-xs uppercase tracking-wide text-gray-400 font-medium">Target Date:</span><span className="text-sm text-gray-900 font-medium">{project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString() : "N/A"}</span></div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input type="checkbox" checked={projectCompleted} onChange={(e) => setProjectCompleted(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#702dff] focus:ring-[#702dff]" />
              <span className="text-sm text-gray-700 font-medium whitespace-nowrap">Mark as Complete</span>
            </label>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        {isLoadingDocs ? (
          <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-12 h-12 text-[#702dff] animate-spin mb-4" /><p className="text-gray-600">Loading documents...</p></div>
        ) : (
          <div className="space-y-4">
            {STAGES.map((stage ,index ) => {
              const isExpanded = expandedStage === stage.id;
              return (
                <div key={stage.id} className={`bg-white rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-sm ${completedStages.includes(stage.id) ? "border-emerald-300 ring-1 ring-emerald-100 shadow-emerald-50" : "border-gray-200"}`}>
                  <div
  className="p-6 cursor-pointer"
  onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
>
  <div className="flex items-center justify-between gap-4">
    
    <div className="flex items-center gap-3 flex-1">
      <div className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
        <ChevronDown className="w-5 h-5 text-gray-600" />
      </div>

      <div className="flex-1">
       <div className="flex items-center gap-3 mb-1">
  <h3 className="text-lg font-semibold text-gray-900">
    {stage.name}
  </h3>

  <span
    className={`text-xs px-2 py-1 rounded ${
      completedStages.includes(stage.id)
        ? "bg-green-100 text-green-700"
        : STAGES.find((s) => !completedStages.includes(s.id))?.id === stage.id
        ? "bg-yellow-100 text-yellow-700"
        : "bg-gray-100 text-gray-600"
    }`}
  >
    {completedStages.includes(stage.id)
      ? "Completed"
      : STAGES.find((s) => !completedStages.includes(s.id))?.id === stage.id
      ? "In Progress"
      : "Not Started"}
  </span>
</div>

        <p className="text-sm text-gray-600">
          {stage.description}
        </p>
      </div>
    </div>

  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {completedStages.includes(stage.id) ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Completed</span>
      ) : (
        <button onClick={() => handleMarkStageComplete(stage.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200">Mark as Complete</button>
      )}
    </div>
  </div>
</div>
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-200 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(STAGE_TEMPLATES[stage.id] || []).map((template) => {
                          const TemplateIcon = template.icon;
                          const link = prototypeLinks[`${stage.id}-${template.id}`] || "";
                          const templateMap = templateDownloadMapByStage[stage.id] || {};
                          const templateKey = `${stage.id}::${String(template.name || "").toLowerCase().trim()}`;
                          const downloadableTemplateId = templateMap[templateKey];

                          if (stage.id === "empathize") {
                            return (
                              <div key={template.id} className="space-y-3">
                                {renderEmpathizeTemplateCard(template, downloadableTemplateId, completedStages.includes(stage.id))}
                                {documents.length > 0 && (
                                  <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    {documents.map((doc) => (
                                      <div key={doc.documentId} className="rounded-lg border border-gray-200 bg-white p-2.5">
                                        <div className="mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /><span className="truncate text-xs text-gray-900">{getFileName(doc.blobPath)}</span></div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500">{doc.status} • {new Date(doc.createdAt).toLocaleDateString()}</span>
                                          <div className="flex items-center gap-2">
                                            <button className="text-blue-600 hover:text-blue-800"><Download className="h-3 w-3" /></button>
                                            <button onClick={async () => { if (window.confirm("Delete this document?")) { try { await api.deleteDocument(doc.documentId); await fetchDocuments(); alert("Document deleted"); } catch (err) { alert("Delete failed: " + err.message); } } }} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          if (stage.id === "define") {
                        return (
                          <div key={template.id} className="space-y-3">
                            {renderDefineTemplateCard(template, downloadableTemplateId, completedStages.includes(stage.id))}
                          </div>
                        );
                      }

                               if (stage.id === "ideate" && template.id === "wireframe-reviewer") {
                        return (
                                  <div key={template.id} className="h-full">
                            <WireframeReviewerCard />
                          </div>
                        );
                      }
                          if (stage.id === "ideate" && template.id === "information-architecture") {
                        return (
                                  <div key={template.id} className="h-full">
                            {renderIdeateTemplateCard(template, completedStages.includes(stage.id))}
                          </div>
                        );
                      }
                      if (template.id === "brd-prd-generator") {
  const media = IDEATE_CARD_MEDIA[template.id] || IDEATE_CARD_MEDIA["information-architecture"];
  return (
    <div key={template.id} className="h-full">
      
      <div className="h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col">

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-500 ">
              Document Generation
            </p>
            <h3 className="text-base font-semibold text-gray-900">
              {template.name}
            </h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {template.description}
        </p>

        <div className="space-y-2 mt-auto">
          
          <button
            onClick={handleOpenBrdModal}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Generate BRD
          </button>

          <button
            onClick={handleOpenPrdModal}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Generate PRD
          </button>

        </div>

      </div>
    </div>
  );
}

                          return renderGenericCard(template, stage.id, downloadableTemplateId, link, completedStages.includes(stage.id));
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPersonaSection && (
        <div className="px-8 pb-10 bg-[#f5f7fa]">
          <div className="border-t border-gray-200 pt-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Empathize Stage</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">User Persona Output</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCombinePersonaOutputs}
                  disabled={isCombiningPersonaOutput}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isCombiningPersonaOutput ? "Combining..." : "Combine All Persona Outputs"}
                </button>
                <button
                  onClick={() => setShowPersonaSection(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  Close
                </button>
              </div>
            </div>
            {finalPersonaCard && (
  <div className="mt-10">
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Final AI Generated Persona
      </h2>
      <p className="text-sm text-gray-600">
        Combined insights from all personas
      </p>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      <div className="border-b pb-4 mb-6">
        <h3 className="text-2xl font-bold text-[#702dff]">
          {finalPersonaCard.name || "Persona"}
        </h3>

        <p className="italic text-gray-600 mt-1">
          {finalPersonaCard.quote || "No quote available"}
        </p>

        <p className="text-sm text-gray-700 mt-3">
          {finalPersonaCard.background || "No description"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Section title="Goals" items={finalPersonaCard.goals} />

        <Section title="Needs" items={finalPersonaCard.needs} />

        <Section title="Pain Points" items={finalPersonaCard.frustrations} />

        <Section title="Motivations" items={finalPersonaCard.motivations} />

        <Section title="Personality" items={finalPersonaCard.personality} />

        <Section title="Behaviours & Habits" items={finalPersonaCard.behaviours} />

        <Section title="Positive Themes" items={finalPersonaCard.positiveThemes} />

        <Section title="Negative Themes" items={finalPersonaCard.negativeThemes} />

      </div>

      <div className="mt-6">
        <h4 className="font-semibold mb-2">Scenario</h4>
        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
          {finalPersonaCard.scenario || "No scenario available"}
        </p>
      </div>

      <div className="mt-6">
  <h4 className="font-semibold mb-2">Demographics</h4>
  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">

    {typeof finalPersonaCard.demographics === "object" ? (
      Object.entries(finalPersonaCard.demographics).map(([key, value]) => (
        <p key={key}>
          <b>{key}:</b> {value}
        </p>
      ))
    ) : (
      <p>{finalPersonaCard.demographics || "No demographics available"}</p>
    )}

  </div>
</div>

<div className="mt-4">
  <h4 className="font-semibold mb-2">Problem Statement</h4>
  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
    {finalPersonaCard.problemStatement || "No problem statement available"}
  </p>
</div>

    </div>
  </div>
)}

{processFlowData && (
  <div className="mt-1">
    <div className="mb-3">
      <h2 className="text-xl font-semibold text-gray-900">
        AI Generated Process Flow
      </h2>

      <p className="text-sm text-gray-600">
        Generated from persona insights
      </p>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <pre className="whitespace-pre-wrap text-sm text-gray-700">
        {JSON.stringify(processFlowData, null, 2)}
      </pre>
    </div>
  </div>
)}

            {isPersonaCardsLoading ? (
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading persona output...</p>
            ) : personaCardsError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{personaCardsError}</p>
            ) : personaCards.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">No personas found for this project.</p>
            ) : (
              <>
                <div className="mb-4 border-b border-gray-200 pb-0 flex gap-2 flex-wrap">
                  {personaCards.map((card) => (
                    <button
                      key={card.personaId}
                      onClick={() => setActivePersonaCardId(card.personaId)}
                      className={`px-4 py-2 rounded-t-md text-sm font-medium transition ${
                        activePersonaCardId === card.personaId
                          ? "bg-indigo-500 text-white shadow"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {card.personaName}
                    </button>
                  ))}
                </div>

                {!activePersonaCard?.hasGeneratedOutput ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    No persona output available for <b>{activePersonaCard?.personaName}</b> yet. Complete the interview transcript in the workspace to generate it.
                  </p>
                ) : (
                  <div className="persona-container">
                    <div className="persona-sidebar">
                      <div className="persona-avatar" />

                      <div className="persona-section-title">Demographics</div>
                      <p><b>Gender:</b> {activePersonaCard.demographics.gender}</p>
                      <p><b>Age:</b> {activePersonaCard.demographics.age}</p>
                      <p><b>Location:</b> {activePersonaCard.demographics.location}</p>
                      <p><b>Relationship Status:</b> {activePersonaCard.demographics.relationshipStatus}</p>
                      <p><b>Title:</b> {activePersonaCard.demographics.title}</p>
                      <p><b>Education:</b> {activePersonaCard.demographics.education}</p>

                      <div className="persona-section-title">Goals</div>
                      <ul>
                        {(activePersonaCard.parsed.goals.length
                          ? activePersonaCard.parsed.goals
                          : ["No goals extracted yet."]
                        ).map((item, idx) => (
                          <li key={`goal-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="persona-main">
                      <div className="persona-header">
                        <h1>Name: {activePersonaCard.parsed.name}</h1>
                        <div className="persona-quote">
                          {activePersonaCard.parsed.quote
                            ? `"${activePersonaCard.parsed.quote}"`
                            : "No quote available."}
                        </div>
                      </div>

                      <div className="persona-content">
                        <div className="persona-block">
                          <h3>Background Description</h3>
                          <p>{activePersonaCard.parsed.background}</p>
                        </div>

                        <div className="persona-grid-2">
  <div className="persona-block">
    <h3>Says</h3>
    <ul>
      {(activePersonaCard.parsed.says.length
        ? activePersonaCard.parsed.says
        : ["No data extracted yet."]
      ).map((item, idx) => (
        <li key={`says-${idx}`}>{item}</li>
      ))}
    </ul>
  </div>

  <div className="persona-block">
    <h3>Thinks</h3>
    <ul>
      {(activePersonaCard.parsed.thinks.length
        ? activePersonaCard.parsed.thinks
        : ["No data extracted yet."]
      ).map((item, idx) => (
        <li key={`thinks-${idx}`}>{item}</li>
      ))}
    </ul>
  </div>
</div>

<div className="persona-grid-2">
  <div className="persona-block">
    <h3>Does</h3>
    <ul>
      {(activePersonaCard.parsed.does.length
        ? activePersonaCard.parsed.does
        : ["No data extracted yet."]
      ).map((item, idx) => (
        <li key={`does-${idx}`}>{item}</li>
      ))}
    </ul>
  </div>

  <div className="persona-block">
    <h3>Feels</h3>
    <ul>
      {(activePersonaCard.parsed.feels.length
        ? activePersonaCard.parsed.feels
        : ["No data extracted yet."]
      ).map((item, idx) => (
        <li key={`feels-${idx}`}>{item}</li>
      ))}
    </ul>
  </div>
</div>

<div className="persona-insight-grid">
  <div className="insight-tile pain-points">
    <div className="insight-head">
      <span className="insight-icon"><AlertTriangle className="w-4 h-4" /></span>
      <h3>Pain Points</h3>
    </div>
    <div className="insight-body">
      {(activePersonaCard.parsed.frustrations.length
        ? activePersonaCard.parsed.frustrations
        : ["No pain points extracted yet."]
      ).map((item, idx) => (
        <span key={`pain-${idx}`} className="insight-chip">{item}</span>
      ))}
    </div>
  </div>

  <div className="insight-tile needs">
    <div className="insight-head">
      <span className="insight-icon"><HandHeart className="w-4 h-4" /></span>
      <h3>Needs</h3>
    </div>
    <div className="insight-body">
      {(activePersonaCard.parsed.needs.length
        ? activePersonaCard.parsed.needs
        : activePersonaCard.parsed.goals.length
          ? activePersonaCard.parsed.goals
          : ["No needs extracted yet."]
      ).map((item, idx) => (
        <span key={`need-${idx}`} className="insight-chip">{item}</span>
      ))}
    </div>
  </div>

  <div className="insight-tile key-insights">
    <div className="insight-head">
      <span className="insight-icon"><Lightbulb className="w-4 h-4" /></span>
      <h3>Key Insights</h3>
    </div>
    <div className="insight-body">
      {(activePersonaCard.parsed.keyInsights.length
        ? activePersonaCard.parsed.keyInsights
        : activePersonaCard.parsed.motivations.length
          ? activePersonaCard.parsed.motivations
          : ["No key insights extracted yet."]
      ).map((item, idx) => (
        <span key={`insight-${idx}`} className="insight-chip">{item}</span>
      ))}
    </div>
  </div>
</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {isBrdModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 pb-10 pt-8"
          onClick={() => setIsBrdModalOpen(false)}
        >
          <div
            className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Generated Document</p>
                <h3 className="text-sm font-semibold text-gray-900">Business Requirements Document</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBrdDoc}
                  disabled={!brdDoc || isDownloadingBrd}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingBrd ? "Preparing..." : "Download Word"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBrdModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
                  aria-label="Close BRD modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[84vh] overflow-y-auto bg-[#e8ebf0] px-6 py-6">
              {brdLoading ? (
                              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700">
                    Generating BRD Document
                  </p>

                  <div className="space-y-3">
                    {brdProgress.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        {step.done ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
                        )}

                        <span className={step.done ? "text-green-700" : "text-slate-600"}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {brdProgress.length < BRD_STEPS.length && (
                    <p className="text-xs text-slate-400">
                      AI is structuring your document...
                    </p>
                  )}
                </div>
                   
              ) : brdError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {brdError}
                </div>
              ) : brdDoc ? (
                <article className="formal-doc mx-auto max-w-[920px] overflow-hidden border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                  <header className="doc-cover border-b border-slate-200 px-12 py-12">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Business Document
                    </p>
                    <h2 className="text-[34px] font-bold leading-tight text-slate-900">
                      Business Requirements Document
                    </h2>
                    <p className="mt-3 text-[18px] text-slate-700">
                      {brdMeta?.project_name || "Untitled Project"}
                    </p>
                    {brdMeta && (
                      <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-slate-500">
                        {brdMeta.date_submitted && (
                          <span>Submitted: {brdMeta.date_submitted}</span>
                        )}
                        {brdMeta.version && <span>Version: {brdMeta.version}</span>}
                        {brdMeta.status && (
                          <span>Status: {brdMeta.status}</span>
                        )}
                      </div>
                    )}
                  </header>

                  {brdMeta && (
                    <section className="border-b border-slate-200 bg-slate-50 px-12 py-7">
                      <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Document Metadata
                      </h4>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          { key: "project_name", label: "Project" },
                          { key: "project_manager", label: "Project Manager" },
                          { key: "date_submitted", label: "Submitted" },
                          { key: "version", label: "Version" },
                          { key: "status", label: "Status" },
                          { key: "department", label: "Department" },
                        ].map((field) => (
                          <div key={field.key} className="rounded-md border border-slate-200 bg-white px-3.5 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                              {field.label}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {String(brdMeta[field.key] || "Not specified")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="divide-y divide-slate-100">
                    {brdActiveSections.length === 0 ? (
                      <p className="px-12 py-10 text-center text-sm text-slate-400">
                        No BRD sections found in the agent response.
                      </p>
                    ) : (
                      brdActiveSections.map((section) => {
                        const collapsed = Boolean(brdCollapsed[section.key]);
                        return (
                          <div key={section.key}>
                            <button
                              type="button"
                              onClick={() => toggleBrdSection(section.key)}
                              className="flex w-full items-center gap-4 px-12 py-5 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                                {section.num}
                              </span>
                              <span className="flex-1 text-[17px] font-semibold tracking-tight text-slate-800">
                                {section.title}
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">
                                {collapsed ? "▶" : "▼"}
                              </span>
                            </button>
                            {!collapsed && (
                              <div className="border-t border-slate-100 bg-white px-12 pb-8 pt-5">
                                {renderBrdContent(brdDoc[section.key], section.type)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 px-12 py-4 text-xs text-slate-500">
                    Document rendered in stakeholder review format.
                  </div>
                </article>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
                  No BRD data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPrdModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8"
          onClick={() => setIsPrdModalOpen(false)}
        >
          <div
            className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Generated Document</p>
                <h3 className="text-base font-semibold text-gray-900">Product Requirements Document</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPrdDoc}
                  disabled={!prdHtml || isDownloadingPrd}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingPrd ? "Preparing..." : "Download Word"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrdModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
                  aria-label="Close PRD modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[84vh] overflow-auto bg-[#e8ebf0] p-5">
              {prdLoading ? (
                 <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-sm">
    <p className="text-sm font-semibold text-slate-700">
      Generating PRD Document
    </p>

    <div className="space-y-3">
      {prdProgress.map((step, index) => (
        <div key={index} className="flex items-center gap-3 text-sm">
          {step.done ? (
            <span className="text-green-600 font-bold">✓</span>
          ) : (
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
          )}

          <span className={step.done ? "text-green-700" : "text-slate-600"}>
            {step.label}
          </span>
        </div>
      ))}
    </div>

    {prdProgress.length < PRD_STEPS.length && (
      <p className="text-xs text-slate-400">
        AI is structuring your product document...
      </p>
    )}
  </div>
              ) : (
                <div className="space-y-4">
                  {prdError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {prdError}
                    </div>
                  )}

                  {prdHtml ? (
                    <article className="formal-doc mx-auto max-w-[920px] overflow-hidden border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                      <header className="doc-cover border-b border-slate-200 px-12 py-12">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Product Document
                        </p>
                        <h2 className="text-[34px] font-bold leading-tight text-slate-900">
                          Product Requirements Document
                        </h2>
                        <p className="mt-3 text-[16px] text-slate-700">
                          Structured output optimized for stakeholder review and publication.
                        </p>
                      </header>
                      <div className="doc-html px-12 py-10">
                        <div dangerouslySetInnerHTML={{ __html: prdHtml }} />
                      </div>
                    </article>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                      No PRD output available.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .persona-container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          display: flex;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .persona-sidebar {
          width: 30%;
          background: #2f5b8c;
          color: white;
          padding: 20px;
        }

        .persona-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #d9d9d9;
          margin: 0 auto 20px;
          position: relative;
        }

        .persona-avatar::after {
          content: "";
          width: 35px;
          height: 35px;
          background: #555;
          border-radius: 50%;
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
        }

        .persona-avatar::before {
          content: "";
          width: 50px;
          height: 25px;
          background: #555;
          border-radius: 25px 25px 0 0;
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
        }

        .persona-section-title {
          margin-top: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          opacity: 0.9;
        }

        .persona-sidebar p {
          font-size: 13px;
          margin-bottom: 6px;
        }

        .persona-sidebar ul {
          margin-top: 10px;
          padding-left: 18px;
        }

        .persona-sidebar li {
          font-size: 13px;
          margin-bottom: 8px;
        }

        .persona-main {
          width: 70%;
        }

        .persona-header {
          background: #1d3f77;
          color: white;
          padding: 20px;
        }

        .persona-header h1 {
          font-size: 22px;
          margin-bottom: 5px;
        }

        .persona-quote {
          font-size: 13px;
          font-style: italic;
          opacity: 0.9;
        }

        .persona-content {
          padding: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .persona-block {
          margin-bottom: 20px;
        }

        .persona-block h3 {
          font-size: 15px;
          margin-bottom: 10px;
          color: #333;
        }

        .persona-block p {
          font-size: 13px;
          color: #555;
        }

        .persona-grid-2 {
          display: flex;
          gap: 20px;
        }

        .persona-grid-2 .persona-block {
          width: 50%;
        }

        .persona-block ul {
          padding-left: 18px;
        }

        .persona-block li {
          font-size: 13px;
          margin-bottom: 8px;
          color: #444;
        }

        .persona-insight-grid {
          margin-top: 8px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .insight-tile {
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 14px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .insight-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        }

        .insight-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .insight-head h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .insight-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .insight-body {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .insight-chip {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          line-height: 1.35;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.7);
        }

        .insight-tile.pain-points {
          background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
          border-color: #fecdd3;
        }

        .insight-tile.pain-points .insight-icon {
          color: #be123c;
          background: rgba(190, 18, 60, 0.12);
        }

        .insight-tile.pain-points .insight-chip {
          color: #9f1239;
          border-color: #fda4af;
        }

        .insight-tile.needs {
          background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
          border-color: #a5f3fc;
        }

        .insight-tile.needs .insight-icon {
          color: #0f766e;
          background: rgba(15, 118, 110, 0.12);
        }

        .insight-tile.needs .insight-chip {
          color: #115e59;
          border-color: #67e8f9;
        }

        .insight-tile.key-insights {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #bfdbfe;
        }

        .insight-tile.key-insights .insight-icon {
          color: #1d4ed8;
          background: rgba(29, 78, 216, 0.12);
        }

        .insight-tile.key-insights .insight-chip {
          color: #1e40af;
          border-color: #93c5fd;
        }

        @media (max-width: 900px) {
          .persona-container {
            flex-direction: column;
          }

          .persona-sidebar,
          .persona-main {
            width: 100%;
          }

          .persona-grid-2 {
            flex-direction: column;
          }

          .persona-insight-grid {
            grid-template-columns: 1fr;
          }

          .persona-grid-2 .persona-block {
            width: 100%;
          }
        }
      `}</style>
      <style jsx global>{`
        .formal-doc {
          font-family: Georgia, "Times New Roman", serif;
          color: #1f2937;
        }

        .doc-cover {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .doc-html {
          counter-reset: section;
          font-family: Georgia, "Times New Roman", serif;
          line-height: 1.9;
          color: #334155;
        }

        .doc-html > :first-child {
          margin-top: 0;
        }

        .doc-html h1 {
          margin: 0 0 20px;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          font-size: 33px;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: #0f172a;
          text-align: center;
          font-weight: 700;
        }

        .doc-html h2 {
          margin: 34px 0 14px;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 7px;
          font-size: 23px;
          line-height: 1.3;
          color: #111827;
          font-weight: 700;
        }

        .doc-html h3 {
          margin: 24px 0 10px;
          font-size: 18px;
          line-height: 1.4;
          color: #1f2937;
          font-weight: 700;
        }

        .doc-html h4 {
          margin: 18px 0 8px;
          font-size: 15px;
          line-height: 1.5;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .doc-html p {
          margin: 0 0 14px;
          font-size: 16px;
          color: #334155;
        }

        .doc-html ul,
        .doc-html ol {
          margin: 8px 0 16px;
          padding-left: 22px;
        }

        .doc-html li {
          margin: 0 0 6px;
          font-size: 15px;
          color: #334155;
        }

        .doc-html table {
          width: 100%;
          border-collapse: collapse;
          margin: 22px 0;
          border: 1px solid #cbd5e1;
          font-size: 14px;
        }

        .doc-html thead {
          background: #0f172a;
          color: #f8fafc;
        }

        .doc-html th,
        .doc-html td {
          border: 1px solid #cbd5e1;
          padding: 10px 12px;
          vertical-align: top;
        }

        .doc-html th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          text-align: left;
        }

        .doc-html blockquote {
          margin: 16px 0;
          border-left: 4px solid #94a3b8;
          background: #f8fafc;
          padding: 10px 14px;
          color: #475569;
        }

        .doc-html hr {
          margin: 22px 0;
          border: none;
          border-top: 1px solid #d1d5db;
        }
      `}</style>
    </div>
  );
}