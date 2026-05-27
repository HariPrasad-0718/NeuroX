import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "de-ux-governance";
const sasExpiryMinutes = Number(process.env.AZURE_STORAGE_SAS_EXPIRY_MINUTES || "5");

function getBlobNameFromUrl(fileUrl) {
  const parsed = new URL(fileUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) {
    throw new Error("Invalid template file_url");
  }

  if (pathParts[0].toLowerCase() === containerName.toLowerCase()) {
    return pathParts.slice(1).join("/");
  }

  return pathParts[pathParts.length - 1];
}

export const GET = withAuth(async (request, { params }) => {
  try {
    if (!accountName || !accountKey) {
      return NextResponse.json(
        { success: false, error: { message: "Azure storage credentials are not configured" } },
        { status: 500 }
      );
    }

    const resolvedParams = await params;
    const templateId = Number(resolvedParams.template_id);
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid template id" } },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("templateId", sql.Int, templateId)
      .query(`
        SELECT file_url
        FROM templatess
        WHERE template_id = @templateId
      `);

    if (!result.recordset.length) {
      return NextResponse.json(
        { success: false, error: { message: "Template not found" } },
        { status: 404 }
      );
    }

    const fileUrl = result.recordset[0].file_url;
    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: { message: "Template file URL is missing" } },
        { status: 400 }
      );
    }

    const blobName = getBlobNameFromUrl(fileUrl);

    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const expiresOn = new Date(Date.now() + sasExpiryMinutes * 60 * 1000);
    const sasUrl = await blobClient.generateSasUrl({
      permissions: "r",
      expiresOn,
    });

    return NextResponse.redirect(sasUrl);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to generate download link" } },
      { status: 500 }
    );
  }
});
