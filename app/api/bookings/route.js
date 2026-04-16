import { getPool, sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/bookings — Fetch bookings, optionally filtered by expertId or userId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get("expertId");
    const userId = searchParams.get("userId");

    const pool = await getPool();
    let query = "SELECT * FROM bookings WHERE 1=1";
    const req = pool.request();

    if (expertId) {
      query += " AND expert_id = @expertId";
      req.input("expertId", sql.NVarChar, expertId);
    }

    if (userId) {
      query += " AND user_id = @userId";
      req.input("userId", sql.NVarChar, userId);
    }

    query += " ORDER BY booking_datetime DESC";

    const result = await req.query(query);

    const bookings = result.recordset.map((b) => ({
      bookingId: b.booking_id,
      expertId: b.expert_id,
      userId: b.user_id,
      bookingDatetime: b.booking_datetime,
      description: b.description,
      status: b.status,
      createdAt: b.created_at,
    }));

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/bookings — Create a new booking
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const body = await request.json();

    const { expertId, bookingDateTime, description } = body;

    if (!expertId || !bookingDateTime) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "expertId and bookingDateTime are required" },
        },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Generate a simple booking ID
    const bookingId = `bk_${Date.now()}`;

    await pool
      .request()
      .input("bookingId", sql.NVarChar, bookingId)
      .input("expertId", sql.NVarChar, expertId)
      .input("userId", sql.NVarChar, userId)
      .input("bookingDatetime", sql.DateTime, new Date(bookingDateTime))
      .input("description", sql.NVarChar, description || "")
      .input("status", sql.NVarChar, "confirmed")
      .query(
        `INSERT INTO bookings
           (booking_id, expert_id, user_id, booking_datetime, description, status, created_at)
         VALUES
           (@bookingId, @expertId, @userId, @bookingDatetime, @description, @status, GETDATE())`
      );

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        expertId,
        userId,
        bookingDatetime: bookingDateTime,
        description,
        status: "confirmed",
      },
    });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
