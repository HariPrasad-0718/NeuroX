import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const containerName =
  process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER || "documents";

export const GET = withAuth(async (req, _ctx, user) => {
  try {
    // ---------------------------------------
    // Get fileId
    // ---------------------------------------
    const { searchParams } = new URL(req.url);

    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: "fileId is required",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // Verify ownership & get blob info
    // ---------------------------------------
    const pool = await getPool();

    const result = await pool
      .request()
      .input("fileId", sql.UniqueIdentifier, fileId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT
          pf.FileName,
          pf.BlobName,
          pf.FileType
        FROM ProjectFiles pf
        INNER JOIN projectss p
          ON pf.ProjectId = p.project_id
        WHERE pf.FileId = @fileId
          AND p.created_by = @userId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
        },
        { status: 404 }
      );
    }

    const file = result.recordset[0];

    // ---------------------------------------
    // Azure Blob Storage
    // ---------------------------------------
    const credential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );

    const containerClient =
      blobServiceClient.getContainerClient(containerName);

    const blockBlobClient =
      containerClient.getBlockBlobClient(file.BlobName);

    // ---------------------------------------
    // Download blob
    // ---------------------------------------
    const downloadResponse = await blockBlobClient.download();

    if (!downloadResponse.readableStreamBody) {
      throw new Error("Unable to read blob.");
    }

    // ---------------------------------------
    // Convert stream to buffer
    // ---------------------------------------
    const chunks = [];

    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // ---------------------------------------
    // Return file
    // ---------------------------------------
    return new NextResponse(buffer, {
  headers: {
    "Content-Type":
      file.FileType || "application/octet-stream",
    "Content-Disposition": `inline; filename="${file.FileName}"`,
  },
});

  } catch (error) {
    console.error("Download API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
});