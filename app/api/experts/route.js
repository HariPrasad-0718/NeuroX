import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import logger from "@/lib/logger";

// GET /api/experts — Fetch all experts with their skills
export const GET = withAuth(async () => {
  try {
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    logger.error("GET /api/experts error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
