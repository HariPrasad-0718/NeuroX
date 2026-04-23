import { NextResponse } from "next/server";

// POST /api/auth/logout — Simple logout (client clears localStorage)
export async function POST() {
  return NextResponse.json({ success: true });
}
