import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import logger from "@/lib/logger";

// GET /api/documents — Fetch documents, optionally filtered by userId or projectId
export const GET = withAuth(async () => {
  try {
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    logger.error("GET /api/documents error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// POST /api/documents — Create a new document record
export const POST = withAuth(async () => {
  try {
    return NextResponse.json(
      { success: false, error: { message: "Documents feature is unavailable for current database schema" } },
      { status: 501 }
    );
  } catch (error) {
    logger.error("POST /api/documents error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});

// DELETE /api/documents — Delete a document
export const DELETE = withAuth(async () => {
  try {
    return NextResponse.json(
      { success: false, error: { message: "Documents feature is unavailable for current database schema" } },
      { status: 501 }
    );
  } catch (error) {
    logger.error("DELETE /api/documents error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
