import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import path from "path";
import fs from "fs/promises";


export const GET = withAuth(async (request, _ctx, user) => {
  try {
    const { searchParams } = new URL(request.url);

    const pageId = Number(searchParams.get("pageId"));
    const projectId = Number(searchParams.get("projectId"));

    const pool = await getPool();

    // ==================================================
    // GET SINGLE PAGE ANALYSIS
    // /api/wireframe-pages?pageId=1
    // ==================================================
    if (pageId) {
      const result = await pool
        .request()
        .input("pageId", sql.Int, pageId)
        .input("userId", sql.Int, Number(user.userId))
        .query(`
          SELECT
            w.page_id,
            w.project_id,
            w.page_name,
            w.image_url,
            w.analysis_output,
            w.status,
            w.created_at,
            w.updated_at
          FROM WireframeAnalysisPages w
          INNER JOIN projectss p
            ON p.project_id = w.project_id
          WHERE w.page_id = @pageId
          AND p.created_by = @userId
        `);

      if (result.recordset.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Page not found",
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.recordset[0],
      });
    }

    // ==================================================
    // GET ALL PAGES FOR A PROJECT
    // /api/wireframe-pages?projectId=1
    // ==================================================

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

    const result = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query(`
        SELECT
          page_id,
          page_name,
          image_url,
          status,
          created_at,
          updated_at
        FROM WireframeAnalysisPages
        WHERE project_id = @projectId
        ORDER BY created_at DESC
      `);

    return NextResponse.json({
      success: true,
      pages: result.recordset,
    });
  } catch (error) {
    console.error("GET /api/wireframe-pages error:", error);

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

export async function POST(req) {
  try {
    const formData = await req.formData();

    const projectId = Number(
      formData.get("projectId")
    );

    const pageName = String(
      formData.get("pageName") || ""
    ).trim();

    const image = formData.get("image");

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: "Project id is required",
      });
    }

    if (!pageName) {
      return NextResponse.json({
        success: false,
        error: "Page name is required",
      });
    }

    if (!image) {
      return NextResponse.json({
        success: false,
        error: "Image is required",
      });
    }

    const pool = await getPool();

    // ---------------------------------
    // UNIQUE PAGE NAME CHECK
    // ---------------------------------

    const existing =
      await pool
        .request()
        .input("projectId", projectId)
        .input("pageName", pageName)
        .query(`
          SELECT page_id
          FROM WireframeAnalysisPages
          WHERE project_id = @projectId
          AND page_name = @pageName
        `);

    if (existing.recordset.length > 0) {
      return NextResponse.json({
        success: false,
        error:
          "Page name already exists. Please choose another name.",
      });
    }

    // ---------------------------------
    // SAVE IMAGE
    // ---------------------------------

    const bytes =
      await image.arrayBuffer();

    const buffer =
      Buffer.from(bytes);

    const fileName =
      `${Date.now()}-${image.name}`;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "wireframes"
    );

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    const filePath = path.join(
      uploadDir,
      fileName
    );

    await fs.writeFile(
      filePath,
      buffer
    );

    const imageUrl =
      `/uploads/wireframes/${fileName}`;

    // ---------------------------------
    // CALL EXISTING AGENT API
    // ---------------------------------

    const agentFormData =
      new FormData();

    agentFormData.append(
      "image",
      image
    );

    const agentResponse = await fetch(
  "http://localhost:3000/api/analyze-wireframe",
  {
    method: "POST",
    body: agentFormData,
  }
);

    const agentData =
      await agentResponse.json();

    if (
      !agentData.success
    ) {
      return NextResponse.json({
        success: false,
        error:
          agentData.error ||
          "Agent failed",
      });
    }

    const analysisOutput =
      agentData.result;

    // ---------------------------------
    // SAVE DATABASE
    // ---------------------------------

    const saved =
      await pool
        .request()
        .input(
          "projectId",
          projectId
        )
        .input(
          "pageName",
          pageName
        )
        .input(
          "imageUrl",
          imageUrl
        )
        .input(
          "analysisOutput",
          analysisOutput
        )
        .input(
          "createdBy",
          1
        ) // replace later with JWT user id
        .query(`
          INSERT INTO WireframeAnalysisPages
          (
            project_id,
            page_name,
            image_url,
            analysis_output,
            created_by
          )
          OUTPUT INSERTED.page_id
          VALUES
          (
            @projectId,
            @pageName,
            @imageUrl,
            @analysisOutput,
            @createdBy
          )
        `);

    return NextResponse.json({
      success: true,
      pageId:
        saved.recordset[0]
          .page_id,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}