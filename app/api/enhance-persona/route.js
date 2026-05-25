import { NextResponse } from "next/server";
import { enhancePersonaDescription } from "@/lib/agent5i";

export async function POST(request) {
  try {
    const body = await request.json();

    const projectDescription = (body?.project_description || "").trim();
    const personaTitle = (body?.persona_title || "").trim();
    const personaDescription = (body?.persona_description || "").trim();

    if (!projectDescription) {
      return NextResponse.json(
        { success: false, error: { message: "project_description is required" } },
        { status: 400 }
      );
    }

    if (!personaTitle) {
      return NextResponse.json(
        { success: false, error: { message: "persona_title is required" } },
        { status: 400 }
      );
    }

    const enhanced = await enhancePersonaDescription({
      projectDescription,
      personaTitle,
      personaDescription,
    });

    return NextResponse.json({
      success: true,
      data: {
        persona_title: personaTitle,
        persona_description: enhanced,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Unexpected server error" } },
      { status: 500 }
    );
  }
}
