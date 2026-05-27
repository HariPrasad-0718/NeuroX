import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { enhancePersonaDescription } from "@/lib/agent5i";
import { aiLightLimiter, rateLimitedResponse } from "@/lib/rateLimit";
import { validateBody } from "@/lib/validate";
import { enhancePersonaSchema } from "@/lib/schemas";

export const POST = withAuth(async (request, _ctx, user) => {
  const { data, error } = await validateBody(request, enhancePersonaSchema);
  if (error) return error;

  const { limited, retryAfterSec } = aiLightLimiter.check(String(user.userId));
  if (limited) return rateLimitedResponse(retryAfterSec);

  const { project_description: projectDescription, persona_title: personaTitle, persona_description: personaDescription } = data;

  try {
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
});
