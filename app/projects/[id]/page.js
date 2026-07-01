"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Upload, Download, Share2, Trash2, FileText, Link as LinkIcon, Loader2, AlertTriangle, HandHeart, Lightbulb, X } from "lucide-react";
import { api } from "@/services/api";
import { useProgressSteps } from "@/hooks/useProgressSteps";
import { generatePersonaCard } from "@/services/personaService";
import { generateProcessFlow } from "@/services/processFlowService";
import { generateInformationArchitecture } from "@/services/informationArchitectureService";
import { generateBrd } from "@/services/brdService";
import { generatePrd as generatePrdDocument, getExistingPrd } from "@/services/prdService";
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
import ProjectHeader from "./components/ProjectHeader";
import DocumentActionBar from "./components/DocumentActionBar";
import PersonaSectionPanel from "./components/PersonaSectionPanel";
import StageAccordion from "./components/StageAccordion";

const STAGES = [
  { id: "empathize", name: "Empathize", description: "Understand your users through observation and engagement." },
  { id: "define", name: "Define", description: "Define the problem statement and user needs." },
  { id: "ideate", name: "Ideate", description: "Generate creative ideas and solutions." },
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
  const { runProgressSteps } = useProgressSteps();

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
const [isOpeningPrd, setIsOpeningPrd] = useState(false);
const [businessOwner, setBusinessOwner] = useState("");
const [productOwner, setProductOwner] = useState("");
const [engineeringLead, setEngineeringLead] = useState("");
const [complianceOwner, setComplianceOwner] = useState("");
const [endUsers, setEndUsers] = useState("");
const [budgetRange, setBudgetRange] = useState("");
const [expectedTimeline, setExpectedTimeline] = useState("");
const [regulatoryRequirements, setRegulatoryRequirements] = useState("");
const [isBrdInputModalOpen, setIsBrdInputModalOpen] = useState(false);

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

    if (typeof window !== "undefined") {
      try {
        const storedIa = window.sessionStorage.getItem("informationArchitectureData");
        if (storedIa) {
          const parsedIa = JSON.parse(storedIa);
          if (parsedIa) {
            setInformationArchitectureData(parsedIa);
          }
        }
      } catch {
        // Ignore parse errors and keep the buttons disabled.
      }
    }
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
    const { data: agentData } = await generateProcessFlow({ projectId });

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

    const { data: agentData } = await generateInformationArchitecture({
      projectId,
      combinedPersonaOutput: combinedOutput,
    });

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
    const topActionLabel = template.id === "empathy-map"
      ? "Get Started"
      : template.id === "other-files"
      ? "Upload"
      : "Generate Empathy Map";
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
  onClick={() => router.push(`/projects/${projectId}/wireframe-analyzer`)}
  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
>
  Get Started
</button>

    
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
  disabled={isGeneratingIA}
  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
>
  {isGeneratingIA ? (
    <>
      <svg
        className="h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          className="opacity-75"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      Generating...
    </>
  ) : (
    "Generate IA"
  )}
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
    const { res, data } = await generateBrd({
      projectId,
      businessOwner,
      productOwner,
      engineeringLead,
      complianceOwner,
      endUsers,
      budgetRange,
      expectedTimeline,
      regulatoryRequirements,
    });

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

const generatePrdDocumentHandler = async (forceRegenerate = false) => {
    console.log("🔥 GENERATE PRD CALLED");

  if (!projectId) {
    setPrdError("Project id is missing.");
    return;
  }

  setPrdLoading(true);
  setPrdError("");
  setPrdRawResponse("");

  try {
    const { res, data } = await generatePrdDocument({
      projectId,
      forceRegenerate,
    });
    console.log("POST Response:", data);

    setPrdRawResponse(formatApiResponse(data?.agent_response || ""));

    if (!data) {
      setPrdError("API returned invalid JSON.");
      setPrdHtml("");
      return;
    }

    if (!res.ok || !data?.success) {
      setPrdError(
        data?.error?.message ||
        data?.error ||
        "Failed to generate PRD document"
      );
      setPrdHtml("");
      return;
    }

    const nextHtml = cleanPrdHtml(
      data?.data?.prd_output ||
      data?.prd_output ||
      extractPrdMarkup(data?.raw_response || "")
    );

    if (!nextHtml) {
      setPrdError("PRD output is empty.");
      setPrdHtml("");
      return;
    }

    setPrdHtml(nextHtml);
  } catch (err) {
    setPrdError(err.message || "Failed to generate PRD document");
    setPrdHtml("");
  } finally {
    setPrdLoading(false);
  }
};



const handleRegeneratePrd = async () => {
  setPrdHtml("");
  setPrdError("");
  setPrdProgress([]);

runProgressSteps(PRD_STEPS, setPrdProgress);

try {
    await generatePrdDocumentHandler(true);
} catch (err) {
    console.error(err);
}
};

const handleOpenPrdModal = async () => {
  setIsPrdModalOpen(true);

  // Start loader (same as BRD)
  setPrdProgress([]);
  runProgressSteps(PRD_STEPS, setPrdProgress);

  setPrdHtml("");
  setPrdError("");

  if (!projectId) {
    setPrdError("Project id is missing.");
    return;
  }

  try {
    const { data: existingData } = await getExistingPrd({ projectId });

    // Existing PRD found
    if (existingData?.prd_content) {
      setPrdHtml(existingData.prd_content);
      return;
    }

    // Generate new PRD
    await generatePrdDocumentHandler();
  } catch (err) {
    console.error("Failed to fetch existing PRD", err);
    setPrdError(err.message || "Failed to load PRD");
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
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 220 },
            })
          );
          return;
        }

        if (tag === "h2") {
          children.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 180, after: 120 },
            })
          );
          return;
        }

        if (tag === "h3") {
          children.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 140, after: 100 },
            })
          );
          return;
        }

        if (tag === "p") {
          if (text) {
            children.push(new Paragraph({ text, spacing: { after: 120 } }));
          }
          return;
        }

        if (tag === "li") {
          if (text) {
            children.push(new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } }));
          }
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
          children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
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
  const str = String(text || "");
  
  // Try different patterns based on the data format
  const patterns = [
    new RegExp(`${label}:\\s*([^\\n.]+)(?:\\.|\\n|$)`, "i"),
    new RegExp(`${label}\\s*:\\s*([^\\n.]+)`, "i"),
    new RegExp(`${label}\\s+([^\\n.]+)`, "i"),
  ];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const value = match[1].trim();
      // If it contains other labels, stop at the next label
      const nextLabelMatch = value.match(/\s+(?:Metric|Baseline|Target|Measurement|Review):/i);
      if (nextLabelMatch) {
        return value.substring(0, nextLabelMatch.index).trim();
      }
      return value;
    }
  }
  return "";
};

const getConstraintVal = (text, label) => {
  const str = String(text || "");
  const pattern = new RegExp(`${label}:\\s*(.*?)(?=(?:Constraint|Description|Impact|Mitigation):|$)`, "i");
  const match = str.match(pattern);
  if (match) {
    let value = match[1].trim();
    // Remove trailing dot if it's not part of a sentence
    if (value.endsWith('.') && !value.includes(' ')) {
      value = value.slice(0, -1);
    }
    return value;
  }
  return "";
};
const renderBrdContent = (value, type) => {
  if (type === "prose") {
    const text = String(value || "");
    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
            {paragraph.trim()}
          </p>
        ))}
      </div>
    );
  }

  if (type === "tags") {
    if (!Array.isArray(value)) return null;
    return (
      <ul className="space-y-2">
        {value.map((item, index) => {
          let displayText = String(item);
          // If it's an object with name and description
          if (typeof item === 'object' && item !== null) {
            if (item.name && item.description) {
              displayText = `${item.name}: ${item.description}`;
            } else if (item.name) {
              displayText = item.name;
            } else if (item.description) {
              displayText = item.description;
            } else {
              displayText = JSON.stringify(item);
            }
          }
          return (
            <li
              key={index}
              className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
              <span className="text-[14px] leading-7 text-slate-700">{displayText}</span>
            </li>
          );
        })}
      </ul>
    );
  }

 if (type === "requirements") {
  if (!Array.isArray(value)) return null;
  
  // Transform the data if it's in object format
  const formattedData = value.map(item => {
    if (typeof item === 'object' && item !== null) {
      // If it has id, statement, priority fields
      if (item.id && item.statement) {
        return `${item.id} | ${item.statement} | Priority: ${item.priority || ''}`;
      }
      // If it has requirement_id, requirement_statement, priority
      if (item.requirement_id && item.requirement_statement) {
        return `${item.requirement_id} | ${item.requirement_statement} | Priority: ${item.priority || ''}`;
      }
    }
    return item; // Keep as is for string format
  });

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
          {formattedData.map((line, index) => {
            // Handle the pipe-separated format
            let id = `BR-${String(index + 1).padStart(3, "0")}`;
            let desc = String(line || "");
            let pri = "";
            
            // Check if it's pipe-separated
            if (typeof line === 'string' && line.includes('|')) {
              const parts = line.split('|').map(p => p.trim());
              id = parts[0] || id;
              desc = parts[1] || desc;
              pri = (parts[2] || "").replace(/priority:/i, "").trim();
            }
            
            const priColor =
              pri.toLowerCase() === "critical" || pri.toLowerCase() === "high"
                ? "bg-red-100 text-red-700"
                : pri.toLowerCase() === "medium"
                  ? "bg-amber-100 text-amber-700"
                  : pri.toLowerCase() === "low"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-700";

            return (
              <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
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
  
  // Parse each metric item
  const parsedData = value.map(item => {
    const str = String(item || "");
    const result = {};
    cols.forEach(label => {
      const match = str.match(new RegExp(`${label}:\\s*([^\\n.]+)`, "i"));
      result[label] = match ? match[1].trim() : "";
    });
    return result;
  });
  
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
          {parsedData.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
              {cols.map((label) => (
                <td key={label} className="border-t border-slate-200 px-4 py-3">
                  {row[label] || "-"}
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
  
  // Parse each constraint item
  const parsedData = value.map(item => {
    const str = String(item || "");
    const result = {};
    cols.forEach(label => {
      const match = str.match(new RegExp(`${label}:\\s*([^\\n.]+)`, "i"));
      result[label] = match ? match[1].trim() : "";
    });
    return result;
  });
  
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
          {parsedData.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
              {cols.map((label) => (
                <td key={label} className="border-t border-slate-200 px-4 py-3">
                  {row[label] || "-"}
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
      {value.map((item, index) => {
        let displayText = String(item || "-");
        // Try to extract name and role if it's in the format "Name: X. Role: Y."
        const nameMatch = displayText.match(/Name:\s*([^.]+)\./i);
        const roleMatch = displayText.match(/Role:\s*([^.]+)\./i);
        if (nameMatch && roleMatch) {
          displayText = `${nameMatch[1].trim()} — ${roleMatch[1].trim()}`;
        } else if (nameMatch) {
          displayText = nameMatch[1].trim();
        }
        return (
          <p
            key={index}
            className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] leading-7 text-slate-700"
          >
            {displayText}
          </p>
        );
      })}
    </div>
  );
}
  if (type === "costtable") {
  if (!Array.isArray(value)) return null;
  
  // Parse cost-benefit items
  const costItems = value.filter(item => 
    typeof item === 'string' && item.includes('Cost:') && item.includes('Benefit:') &&
    !item.toLowerCase().includes('total cost') && !item.toLowerCase().includes('expected roi')
  );
  
  // Find total cost and ROI
  const totalCost = value.find(item => 
    typeof item === 'string' && 
    (item.toLowerCase().includes('total cost') || item.toLowerCase().includes('expected roi'))
  );
  
  if (costItems.length === 0 && !totalCost) {
    // Fallback: try to parse all items
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
            {value.map((item, rowIndex) => {
              if (typeof item === 'string') {
                const parts = item.split('|').map(p => p.trim());
                const cost = parts.find(p => p.toLowerCase().includes('cost'))?.replace(/cost:/i, '').trim() || "-";
                const benefit = parts.find(p => p.toLowerCase().includes('benefit'))?.replace(/benefit:/i, '').trim() || "-";
                return (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="border-t border-slate-200 px-4 py-3">{cost}</td>
                    <td className="border-t border-slate-200 px-4 py-3">{benefit}</td>
                  </tr>
                );
              }
              return null;
            }).filter(Boolean)}
          </tbody>
        </table>
      </div>
    );
  }
  
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
          {costItems.map((item, rowIndex) => {
            const cost = item.match(/Cost:\s*([^|]+)/)?.[1]?.trim() || "-";
            const benefit = item.match(/Benefit:\s*([^|]+)/)?.[1]?.trim() || "-";
            return (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="border-t border-slate-200 px-4 py-3">{cost}</td>
                <td className="border-t border-slate-200 px-4 py-3">{benefit}</td>
              </tr>
            );
          })}
          {totalCost && (
            <tr className="border-t border-slate-200 bg-slate-100">
              <td className="px-4 py-2.5 font-semibold">
                {totalCost.match(/Total Cost:\s*([^|]+)/i)?.[1]?.trim() || 
                 totalCost.match(/Cost:\s*([^|]+)/i)?.[1]?.trim() || "-"}
              </td>
              <td className="px-4 py-2.5 font-semibold">
                {totalCost.match(/Expected ROI:\s*([^|]+)/i)?.[1]?.trim() || 
                 totalCost.match(/Benefit:\s*([^|]+)/i)?.[1]?.trim() || "-"}
              </td>
            </tr>
          )}
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
  const canGenerateDocuments = Boolean(informationArchitectureData);

  return (
    <div className="bg-[#fafafa] px-3 py-3 pb-40 md:pb-48">
      <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[32px] bg-white shadow-sm">
          <ProjectHeader
          project={project}
          showFullDesc={showFullDesc}
          setShowFullDesc={setShowFullDesc}
          projectCompleted={projectCompleted}
          setProjectCompleted={setProjectCompleted}
          onBack={() => router.push("/projects")}
        />

        <div className="px-6 py-6 md:px-8 md:py-8">
          {isLoadingDocs ? (
            <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-12 h-12 text-[#702dff] animate-spin mb-4" /><p className="text-gray-600">Loading documents...</p></div>
          ) : (
            <div className="space-y-4">
              {STAGES.map((stage) => {
                const isExpanded = expandedStage === stage.id;
                const isCompleted = completedStages.includes(stage.id);

                return (
                  <StageAccordion
                    key={stage.id}
                    stage={stage}
                    isExpanded={isExpanded}
                    isCompleted={isCompleted}
                    onToggle={() => setExpandedStage(isExpanded ? null : stage.id)}
                    onMarkComplete={() => handleMarkStageComplete(stage.id)}
                    renderContent={() => (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {(STAGE_TEMPLATES[stage.id] || []).map((template) => {
                          const link = prototypeLinks[`${stage.id}-${template.id}`] || "";
                          const templateMap = templateDownloadMapByStage[stage.id] || {};
                          const templateKey = `${stage.id}::${String(template.name || "").toLowerCase().trim()}`;
                          const downloadableTemplateId = templateMap[templateKey];

                          if (stage.id === "empathize") {
                            return (
                              <div key={template.id} className="space-y-3">
                                {renderEmpathizeTemplateCard(template, downloadableTemplateId, isCompleted)}
                                {documents.length > 0 && (
                                  <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    {documents.map((doc) => (
                                      <div key={doc.documentId} className="rounded-lg border border-gray-200 bg-white p-2.5">
                                        <div className="mb-1 flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-blue-500" />
                                          <span className="truncate text-xs text-gray-900">{getFileName(doc.blobPath)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500">
                                            {doc.status} • {new Date(doc.createdAt).toLocaleDateString()}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button className="text-blue-600 hover:text-blue-800">
                                              <Download className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (window.confirm("Delete this document?")) {
                                                  try {
                                                    await api.deleteDocument(doc.documentId);
                                                    await fetchDocuments();
                                                    alert("Document deleted");
                                                  } catch (err) {
                                                    alert("Delete failed: " + err.message);
                                                  }
                                                }
                                              }}
                                              className="text-red-500 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
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
                                {renderDefineTemplateCard(template, downloadableTemplateId, isCompleted)}
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
                                {renderIdeateTemplateCard(template, isCompleted)}
                              </div>
                            );
                          }
                          if (template.id === "brd-prd-generator") {
                            return null;
                          }

                          return renderGenericCard(template, stage.id, downloadableTemplateId, link, isCompleted);
                        })}
                      </div>
                    )}
                  />
                );
              })}
          </div>
        )}
      </div>

      <DocumentActionBar
        canGenerateDocuments={canGenerateDocuments}
        isOpeningPrd={isOpeningPrd}
        onGenerateBrd={() => setIsBrdInputModalOpen(true)}
        onGeneratePrd={async () => {
          setIsOpeningPrd(true);
          try {
            await handleOpenPrdModal();
          } finally {
            setIsOpeningPrd(false);
          }
        }}
      />

      {showPersonaSection && (
        <PersonaSectionPanel
          finalPersonaCard={finalPersonaCard}
          processFlowData={processFlowData}
          personaCards={personaCards}
          activePersonaCardId={activePersonaCardId}
          activePersonaCard={activePersonaCard}
          isPersonaCardsLoading={isPersonaCardsLoading}
          personaCardsError={personaCardsError}
          isCombiningPersonaOutput={isCombiningPersonaOutput}
          onCombinePersonaOutputs={handleCombinePersonaOutputs}
          onClose={() => setShowPersonaSection(false)}
          onSelectPersonaCard={(id) => setActivePersonaCardId(id)}
        />
      )}

     {isBrdInputModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">

      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">
          BRD Additional Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Provide additional business and project information to improve the
          generated Business Requirements Document.
        </p>
      </div>

      {/* Form Body */}
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Business Owner
            </label>
            <input
              value={businessOwner}
              onChange={(e) => setBusinessOwner(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="Enter business owner"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Product Owner
            </label>
            <input
              value={productOwner}
              onChange={(e) => setProductOwner(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="Enter product owner"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Engineering Lead
            </label>
            <input
              value={engineeringLead}
              onChange={(e) => setEngineeringLead(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="Enter engineering lead"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Compliance Owner
            </label>
            <input
              value={complianceOwner}
              onChange={(e) => setComplianceOwner(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="Enter compliance owner"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              End Users
            </label>
            <textarea
              value={endUsers}
              onChange={(e) => setEndUsers(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="Describe target users"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Budget Range
            </label>
            <input
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="₹10,00,000 - ₹20,00,000"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expected Timeline
            </label>
            <input
              value={expectedTimeline}
              onChange={(e) => setExpectedTimeline(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="6 Months"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Regulatory Requirements
            </label>
            <textarea
              value={regulatoryRequirements}
              onChange={(e) => setRegulatoryRequirements(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 p-2.5"
              placeholder="Enter compliance, legal, security or regulatory requirements"
            />
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t px-6 py-4">
        <button
          type="button"
          onClick={() => setIsBrdInputModalOpen(false)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
            setIsBrdInputModalOpen(false);
            handleOpenBrdModal();
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Generate BRD
        </button>
      </div>

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
  <div className="relative flex h-5 w-5 items-center justify-center">
    <div className="absolute h-5 w-5 animate-ping rounded-full bg-indigo-200 opacity-50" />
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
  </div>
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
                        onClick={handleRegeneratePrd}
                        disabled={prdLoading}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Regenerate
                      </button>
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
  </div>
  );
}