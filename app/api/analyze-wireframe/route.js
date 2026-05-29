import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import logger from "@/lib/logger";
import { aiLightLimiter, rateLimitedResponse } from "@/lib/rateLimit";

const WEBHOOK_URL =
  process.env.AGENT5I_WEBHOOK_URL || "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

const toPythonModuleName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

const CONFIGURED_WIREFRAME_AGENT_NAME =
  process.env.AGENT5I_WIREFRAME_AGENT_MODULE ||
  process.env.AGENT5I_WIREFRAME_AGENT_NAME ||
  "wireframe_analyzer_agent";

const WIREFRAME_AGENT_NAME =
  toPythonModuleName(CONFIGURED_WIREFRAME_AGENT_NAME) || "wireframe_analyzer_agent";

const FALLBACK_RESULT =
  "WIREFRAME SUMMARY\n" +
  "The wireframe agent is temporarily unavailable. " +
  "The analysis below is a placeholder — upload your image again once the agent service is restored.\n\n" +
  "UI/UX ENHANCEMENTS\n" +
  "1. Layout Clarity\n" +
  "Ensure primary actions are placed above the fold and visually distinct from secondary controls.\n\n" +
  "2. Visual Hierarchy\n" +
  "Use consistent heading sizes and spacing to guide the user's eye through the screen flow.\n\n" +
  "3. Navigation Consistency\n" +
  "Keep navigation elements in the same position across all screens to reduce cognitive load.\n\n" +
  "4. Touch Target Sizing\n" +
  "Interactive elements should meet a minimum 44×44 px tap area for accessibility compliance.\n\n" +
  "5. Whitespace Usage\n" +
  "Add breathing room between card sections to improve readability and reduce visual clutter.";

const parseUpstreamError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  const text = String(raw || "").trim();

  if (!text) {
    return `Upstream wireframe agent failed with status ${response.status}`;
  }

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(text);
      return (
        parsed?.error ||
        parsed?.message ||
        `Upstream wireframe agent failed with status ${response.status}`
      );
    } catch (_) {
      // Fall through to plain text parsing.
    }
  }

  if (contentType.includes("text/html") || /<!doctype html>|<html/i.test(text)) {
    return "Wireframe agent returned an HTML error page. Please verify the configured agent module name and server logs.";
  }

  return text.slice(0, 600);
};

export const POST = withAuth(async (request, _ctx, user) => {
  const { limited, retryAfterSec } = aiLightLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  try {
    const username = process.env.AGENT5I_USERNAME || process.env.AGENT_USERNAME || "";
    const password = process.env.AGENT5I_PASSWORD || process.env.AGENT_PASSWORD || "";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Agent credentials are not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!image) {
      return NextResponse.json({
        success: false,
        error: "No image uploaded",
      });
    }

    // Convert image → buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64
    const base64Image = buffer.toString("base64");

    // Multipart form data for agent
    const agentFormData = new FormData();

    agentFormData.append("name", WIREFRAME_AGENT_NAME);
    agentFormData.append("username", username);
    agentFormData.append("password", password);

    agentFormData.append(
      "user_input",
      `data:${image.type};base64,${base64Image}`
    );

    // Attach file
    const blob = new Blob([buffer], {
      type: image.type,
    });

    agentFormData.append(
      "file",
      blob,
      image.name
    );

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      body: agentFormData,
    });

    if (!response.ok) {
      const upstreamError = await parseUpstreamError(response);
      logger.error("POST /api/analyze-wireframe upstream failure — using fallback", {
        agentName: WIREFRAME_AGENT_NAME,
        upstreamError,
      });
      return NextResponse.json({ success: true, result: FALLBACK_RESULT, _fallback: true });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const raw = await response.text();
      logger.error("POST /api/analyze-wireframe unexpected upstream content type — using fallback", {
        agentName: WIREFRAME_AGENT_NAME,
        contentType,
        preview: String(raw || "").slice(0, 300),
      });
      return NextResponse.json({ success: true, result: FALLBACK_RESULT, _fallback: true });
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      logger.error("POST /api/analyze-wireframe invalid JSON from upstream — using fallback", {
        agentName: WIREFRAME_AGENT_NAME,
      });
      return NextResponse.json({ success: true, result: FALLBACK_RESULT, _fallback: true });
    }

    const rawMessage = String(data?.message || data?.result || "");

    if (!rawMessage) {
      logger.error("POST /api/analyze-wireframe empty agent response — using fallback", {
        agentName: WIREFRAME_AGENT_NAME,
      });
      return NextResponse.json({ success: true, result: FALLBACK_RESULT, _fallback: true });
    }

    // Agent returns {"WIREFRAME SUMMARY": "...", "UI/UX ENHANCEMENTS": "1.\n2...."}
    let cleaned = rawMessage.trim().replace(/```/g, "");

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        const summaryKey = keys.find(k => /wireframe\s+summary/i.test(k));
        const enhKey = keys.find(k => /ui\s*\/\s*ux\s+enhancements/i.test(k));
        const summaryText = summaryKey ? String(parsed[summaryKey]).trim() : "";
        const enhText = enhKey ? String(parsed[enhKey]).trim() : "";
        const parts = [];
        if (summaryText) parts.push(`WIREFRAME SUMMARY\n${summaryText}`);
        if (enhText) parts.push(`UI/UX ENHANCEMENTS\n${enhText.replace(/\\n/g, "\n")}`);
        cleaned = parts.join("\n\n");
      } else if (typeof parsed === "string") {
        cleaned = parsed;
      } else if (Array.isArray(parsed)) {
        cleaned = parsed.join("\n");
      }
    } catch (_) {
      cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, "").trim();
    }

    return NextResponse.json({
      success: true,
      result: cleaned,
    });
   
  } catch (error) {
    logger.error("POST /api/analyze-wireframe error", { error });

    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
});
