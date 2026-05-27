import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import logger from "@/lib/logger";

// GET /api/bookings — Fetch bookings, optionally filtered by expertId or userId
export const GET = withAuth(async () => {
  try {
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    logger.error("GET /api/bookings error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async () => {
  try {
    return NextResponse.json(
      { success: false, error: { message: "Bookings feature is unavailable for current database schema" } },
      { status: 501 }
    );
  } catch (error) {
    logger.error("POST /api/bookings error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
