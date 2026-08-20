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


export const GET = withAuth(async (request, _ctx, user) => {
  try {
    const { searchParams } = new URL(request.url);

    const projectId = Number(searchParams.get("projectId"));

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "projectId is required",
          },
        },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Verify the project belongs to the logged-in user
    const projectResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT project_id
        FROM projectss
        WHERE project_id = @projectId
        AND created_by = @userId
      `);

    if (projectResult.recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Project not found",
          },
        },
        { status: 404 }
      );
    }

    // Fetch all files for this project
    const result = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT
    pf.FileId,
    pf.ProjectId,
    pf.FileName,
    pf.BlobName,
    pf.BlobUrl,
    pf.FileType,
    pf.FileSize,
    u.name AS UploadedBy,
    pf.UploadedAt
FROM ProjectFiles pf
INNER JOIN userss u
    ON pf.UploadedBy = u.user_id
WHERE pf.ProjectId = @projectId
ORDER BY pf.UploadedAt DESC
      `);

    return NextResponse.json({
  success: true,
  files: result.recordset.map((file) => ({
    id: file.FileId,
    projectId: file.ProjectId,
    fileName: file.FileName,
    blobName: file.BlobName,
    blobUrl: file.BlobUrl,
    fileType: file.FileType,
    fileSize: Number(file.FileSize),
    uploadedBy: file.UploadedBy,
    uploadedAt: file.UploadedAt,
  })),
});
  } catch (error) {
    console.error("GET /api/project-files error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || "Internal server error",
        },
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req, _ctx, user) => {
  try {
    const formData = await req.formData();

    const projectId = Number(formData.get("projectId"));
    const file = formData.get("file");
    console.log("Project ID:", projectId);
console.log("File:", file?.name);

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID is required",
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "File is required",
        },
        { status: 400 }
      );
    }

    if (!accountName || !accountKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Azure Storage credentials are missing",
        },
        { status: 500 }
      );
    }

    const pool = await getPool();

    // Check project exists
    const projectResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT project_id
        FROM projectss
        WHERE project_id = @projectId
      `);

    if (projectResult.recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Blob name
    const blobName = `projects/${projectId}/${Date.now()}-${file.name}`;

    // Azure Blob Client
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
      containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });
    console.log("Blob uploaded successfully");

    const blobUrl = blockBlobClient.url;

    console.log("Blob URL:", blobUrl);


    // Save metadata
    await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .input("fileName", sql.NVarChar, file.name)
      .input("blobName", sql.NVarChar, blobName)
      .input("blobUrl", sql.NVarChar, blobUrl)
      .input("fileType", sql.NVarChar, file.type)
      .input("fileSize", sql.BigInt, file.size)
      .input("uploadedBy", sql.Int, Number(user.userId))      .query(`
        INSERT INTO ProjectFiles
        (
          ProjectId,
          FileName,
          BlobName,
          BlobUrl,
          FileType,
          FileSize,
          UploadedBy
        )
        VALUES
        (
          @projectId,
          @fileName,
          @blobName,
          @blobUrl,
          @fileType,
          @fileSize,
          @uploadedBy
        )
      `);
      console.log("Metadata saved to ProjectFiles");

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        fileName: file.name,
        blobUrl,
        fileType: file.type,
        fileSize: file.size,
      },
    });
  } catch (error) {
    console.error("POST /api/project-files error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req, _ctx, user) => {
  try {
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

    const pool = await getPool();

    // Verify file belongs to the logged-in user
    const result = await pool
      .request()
      .input("fileId", sql.UniqueIdentifier, fileId)
      .input("userId", sql.Int, Number(user.userId))
      .query(`
        SELECT
          pf.BlobName,
          pf.ProjectId
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

    const blobName = result.recordset[0].BlobName;

    // Delete blob from Azure Storage
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
      containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();

    // Delete database record
    await pool
      .request()
      .input("fileId", sql.UniqueIdentifier, fileId)
      .query(`
        DELETE FROM ProjectFiles
        WHERE FileId = @fileId
      `);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });

  } catch (error) {
    console.error("DELETE /api/project-files:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
});