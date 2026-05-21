import { NextResponse } from "next/server";

// GET /api/experts — Fetch all experts with their skills
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("GET /api/experts error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
