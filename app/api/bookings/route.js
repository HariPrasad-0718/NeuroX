import { NextResponse } from "next/server";

// GET /api/bookings — Fetch bookings, optionally filtered by expertId or userId
export async function GET(request) {
  try {
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    return NextResponse.json(
      { success: false, error: { message: "Bookings feature is unavailable for current database schema" } },
      { status: 501 }
    );
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
