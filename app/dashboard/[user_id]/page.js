import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getPool, sql } from "@/lib/db";

export default async function DashboardUserPage({ params }) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);

  if (!payload?.userId) {
    redirect("/login");
  }

  const routeUserId = Number(params?.user_id);
  const sessionUserId = Number(payload.userId);

  if (!Number.isFinite(routeUserId) || routeUserId !== sessionUserId) {
    redirect("/login");
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.Int, sessionUserId)
    .query("SELECT user_id, name, email, role, created_at FROM userss WHERE user_id = @userId");

  if (result.recordset.length === 0) {
    redirect("/login");
  }

  const user = result.recordset[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1f2937]">Dashboard</h1>
        <p className="text-sm text-[#6b7280] mt-1">Welcome back, {user.name}</p>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6">
        <h2 className="text-lg font-semibold text-[#1f2937] mb-4">Account Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#6b7280]">User ID</p>
            <p className="text-[#111827] font-medium">{user.user_id}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Role</p>
            <p className="text-[#111827] font-medium capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Email</p>
            <p className="text-[#111827] font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Created At</p>
            <p className="text-[#111827] font-medium">
              {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
