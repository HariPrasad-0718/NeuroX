import { NextResponse } from "next/server";

const WEBHOOK_URL =
  "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/";

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

    const toObject = (value) => {
      if (!value) return null;
      if (typeof value === "object") return value;
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "string") return toObject(parsed);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    };

    const asObject = toObject(rawMessage);
    let normalized = asObject;

    if (asObject?.result) {
      normalized = toObject(asObject.result) || asObject;
    }

    if (normalized?.wireframe_summary && typeof normalized.wireframe_summary === "string") {
      const nestedSummary = toObject(normalized.wireframe_summary);
      if (nestedSummary) {
        normalized = {
          ...normalized,
          ...nestedSummary,
        };
      }
    }

    let cleaned = "";
    if (normalized && typeof normalized === "object") {
      cleaned = JSON.stringify(normalized);
    } else {
      cleaned = String(rawMessage || "")
        .trim()
        .replace(/```/g, "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .trim();
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