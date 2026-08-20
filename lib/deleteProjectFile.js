import { getPool, sql } from "@/lib/db";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const containerName =
  process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER || "documents";

export async function deleteProjectFile(projectId, fileName) {
  if (!accountName || !accountKey) {
    throw new Error("Azure Storage credentials are missing");
  }

  const pool = await getPool();

  //----------------------------------------------------
  // Find file
  //----------------------------------------------------

  const result = await pool
    .request()
    .input("projectId", sql.Int, projectId)
    .input("fileName", sql.NVarChar, fileName)
    .query(`
      SELECT TOP 1
        FileId,
        BlobName
      FROM ProjectFiles
      WHERE ProjectId = @projectId
      AND FileName = @fileName
    `);

  if (result.recordset.length === 0) {
    return;
  }

  const file = result.recordset[0];

  //----------------------------------------------------
  // Azure
  //----------------------------------------------------

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

  //----------------------------------------------------
  // Delete blob
  //----------------------------------------------------

  await containerClient
    .getBlockBlobClient(file.BlobName)
    .deleteIfExists();

  //----------------------------------------------------
  // Delete DB entry
  //----------------------------------------------------

  await pool
    .request()
    .input("fileId", sql.UniqueIdentifier, file.FileId)
    .query(`
      DELETE
      FROM ProjectFiles
      WHERE FileId=@fileId
    `);
}