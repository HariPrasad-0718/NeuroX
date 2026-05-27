import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import logger from "@/lib/logger";

// GET /api/stages — Fetch all design thinking stages
export const GET = withAuth(async () => {
  try {
    const stages = [
      { stageId: "empathize",  stageName: "Empathize",  sequenceOrder: 1 },
      { stageId: "define",     stageName: "Define",     sequenceOrder: 2 },
      { stageId: "ideate",     stageName: "Ideate",     sequenceOrder: 3 },
      { stageId: "prototype",  stageName: "Prototype",  sequenceOrder: 4 },
      { stageId: "test",       stageName: "Test",       sequenceOrder: 5 },
      { stageId: "implement",  stageName: "Implement",  sequenceOrder: 6 },
      { stageId: "adopt",      stageName: "Adopt",      sequenceOrder: 7 },
    ];

    return NextResponse.json({ success: true, data: stages });
  } catch (error) {
    logger.error("GET /api/stages error", { error });
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
});
