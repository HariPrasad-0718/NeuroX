import { NextResponse } from "next/server";

const WEBHOOK_URL =
  "https://agent5idev.c5ailabs.com/api/recipes/webhook/agent/";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const image = formData.get("image");

    if (!image) {
      return NextResponse.json({
        success: false,
        error: "No image uploaded",
      });
    }

    // Convert image â†’ buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64
    const base64Image = buffer.toString("base64");

    // Multipart form data for agent
    const agentFormData = new FormData();

    agentFormData.append(
      "name",
      "Wireframe Analyzer Agent"
    );

    agentFormData.append(
      "username",
      "yarramachu.sunaini@c5i.ai"
    );

    agentFormData.append(
      "password",
      "Subbareddy@9014"
    );

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
      const text = await response.text();

      return NextResponse.json({
        success: false,
        error: text,
      });
    }

    const data = await response.json();

    const rawMessage = data.message || "";

    if (!rawMessage) {
      return NextResponse.json({
        success: false,
        error: "No response from agent",
      });
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
    console.error(error);

    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}