import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/documents — Fetch documents, optionally filtered by userId or projectId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const projectId = searchParams.get("projectId");

    const pool = await getPool();
    let query = "SELECT * FROM documents WHERE 1=1";
    const req = pool.request();

    if (userId) {
      query += " AND user_id = @userId";
      req.input("userId", sql.NVarChar, userId);
    }

    if (projectId) {
      query += " AND project_id = @projectId";
      req.input("projectId", sql.NVarChar, projectId);
    }

    query += " ORDER BY created_at DESC";

    const result = await req.query(query);

    const documents = result.recordset.map((doc) => ({
      documentId: doc.document_id,
      userId: doc.user_id,
      templateId: doc.template_id,
      blobPath: doc.blob_path,
      status: doc.status,
      stageId: doc.stage_id,
      projectId: doc.project_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return NextResponse.json({ success: true, data: documents });
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
    const body = await request.json();
    const { documentId, userId, templateId, blobPath, status, stageId, projectId } = body;

    if (!userId || !templateId) {
      return NextResponse.json(
        { success: false, error: { message: "userId and templateId are required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("documentId", sql.NVarChar, documentId)
      .input("userId", sql.NVarChar, userId)
      .input("templateId", sql.NVarChar, templateId)
      .input("blobPath", sql.NVarChar, blobPath || "")
      .input("status", sql.NVarChar, status || "DRAFT")
      .input("stageId", sql.NVarChar, stageId || "")
      .input("projectId", sql.NVarChar, projectId || "")
      .query(
        `INSERT INTO documents
           (document_id, user_id, template_id, blob_path, status, stage_id, project_id, created_at, updated_at)
         VALUES
           (@documentId, @userId, @templateId, @blobPath, @status, @stageId, @projectId, GETDATE(), GETDATE())`
      );

    return NextResponse.json({
      success: true,
      data: { documentId, userId, templateId, status: status || "DRAFT" },
    });
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
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: { message: "documentId is required" } },
        { status: 400 }
      );
    }

    const pool = await getPool();

    await pool
      .request()
      .input("documentId", sql.NVarChar, documentId)
      .query("DELETE FROM documents WHERE document_id = @documentId");

    return NextResponse.json({ success: true, data: { documentId } });
  } catch (error) {
    console.error("DELETE /api/documents error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
