import { NextResponse } from "next/server";

// GET /api/documents — Fetch documents, optionally filtered by userId or projectId
export async function GET(request) {
  try {
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/documents — Create a new document record
export async function POST(request) {
  try {
    return NextResponse.json(
      { success: false, error: { message: "Documents feature is unavailable for current database schema" } },
      { status: 501 }
    );
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// DELETE /api/documents — Delete a document
export async function DELETE(request) {
  try {
    return NextResponse.json(
      { success: false, error: { message: "Documents feature is unavailable for current database schema" } },
      { status: 501 }
    );
  } catch (error) {
    console.error("DELETE /api/documents error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
