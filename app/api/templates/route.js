import { NextResponse } from "next/server";

// GET /api/templates — Fetch all templates, or filter by ?stageId= or ?templateId=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary");

    if (summary === "true") {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
