import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  const sessionUser = await getUserFromCookies();

  if (!sessionUser?.userId) {
    redirect("/login");
  }

  return children;
}
