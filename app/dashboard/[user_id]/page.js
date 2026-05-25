import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/auth";

export default async function DashboardUserPage({ params }) {
  const sessionUser = await getUserFromCookies();

  if (!sessionUser?.userId) {
    redirect("/login");
  }

  const routeUserId = Number(params?.user_id);
  const sessionUserId = Number(sessionUser.userId);

  if (!Number.isFinite(routeUserId) || routeUserId !== sessionUserId) {
    redirect("/login");
  }

  redirect("/dashboard");
}
