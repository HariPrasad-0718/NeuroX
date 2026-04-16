import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/experts — Fetch all experts with their skills
export async function GET() {
  try {
    const pool = await getPool();

    // Fetch experts
    const expertsResult = await pool
      .request()
      .query("SELECT * FROM experts ORDER BY name");

    // Fetch skills for all experts (join expert_skills + skills)
    const skillsResult = await pool.request().query(
      `SELECT es.expert_id, s.skill_name
       FROM expert_skills es
       JOIN skills s ON es.skill_id = s.skill_id`
    );

    // Group skills by expert_id
    const skillsByExpert = {};
    for (const row of skillsResult.recordset) {
      if (!skillsByExpert[row.expert_id]) {
        skillsByExpert[row.expert_id] = [];
      }
      skillsByExpert[row.expert_id].push(row.skill_name);
    }

    // Combine experts with their skills
    const experts = expertsResult.recordset.map((expert) => ({
      expertId: expert.expert_id,
      name: expert.name,
      description: expert.description,
      email: expert.email,
      yearsOfExperience: expert.years_of_experience,
      skills: skillsByExpert[expert.expert_id] || [],
    }));

    return NextResponse.json({ success: true, data: experts });
  } catch (error) {
    console.error("GET /api/experts error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
