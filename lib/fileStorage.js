import { getPool, sql } from "@/lib/db";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const containerName =
  process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER || "documents";

/**
 * Upload a file to Azure Blob Storage
 * and save its metadata in ProjectFiles table.
 */
export async function saveProjectFile({
  projectId,
  fileName,
  buffer,
  contentType,
  uploadedBy,
}) {
  if (!accountName || !accountKey) {
    throw new Error("Azure Storage credentials are missing");
  }

  // -----------------------------
  // Create Blob Client
  // -----------------------------
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

  // -----------------------------
  // Generate unique blob name
  // -----------------------------
  const blobName = `projects/${projectId}/${Date.now()}-${fileName}`;

  const blockBlobClient =
    containerClient.getBlockBlobClient(blobName);

  // -----------------------------
  // Upload to Azure Blob
  // -----------------------------
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType:
        contentType || "application/octet-stream",
    },
  });

  const blobUrl = blockBlobClient.url;

  // -----------------------------
  // Save metadata into SQL
  // -----------------------------
  const pool = await getPool();

  await pool
    .request()
    .input("projectId", sql.Int, projectId)
    .input("fileName", sql.NVarChar, fileName)
    .input("blobName", sql.NVarChar, blobName)
    .input("blobUrl", sql.NVarChar, blobUrl)
    .input("fileType", sql.NVarChar, contentType)
    .input("fileSize", sql.BigInt, buffer.length)
    .input("uploadedBy", sql.Int, uploadedBy)
    .query(`
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

  // -----------------------------
  // Return saved file info
  // -----------------------------
  return {
    fileName,
    blobName,
    blobUrl,
    contentType,
    fileSize: buffer.length,
  };
}