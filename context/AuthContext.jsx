"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/services/api";

/**
 * Auth Context — single source of truth for the logged-in user.
 *
 * Fetches /api/auth/me exactly once on mount (and on pathname change to
 * auth pages). All components that need the current user should call
 * useAuth() instead of making their own /api/auth/me requests.
 *
 * Shape of `user`:
 *   { userId, name, email, role, createdAt }
 */
const AuthContext = createContext(null);

const PUBLIC_PATHS = ["/login", "/signup"];

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);         // null = not loaded yet
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const isAuthPage = PUBLIC_PATHS.includes(pathname);

  // ─── Bootstrap session once on mount ──────────────────────────────────────
  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getSessionUser();
      if (response?.success && response?.data?.userId) {
        const u = response.data;
        setUser({
          userId:    String(u.userId),
          name:      u.name      || "User",
          email:     u.email     || "",
          role:      String(u.role || "designer").toLowerCase(),
          createdAt: u.createdAt || "",
        });
      } else {
        setUser(null);
        if (!isAuthPage) router.push("/login");
      }
    } catch {
      setUser(null);
      if (!isAuthPage) router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthPage, router]);

  useEffect(() => {
    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally runs once — middleware + the logout handler manage navigation.

  // ─── Update profile ────────────────────────────────────────────────────────
  const updateUser = useCallback(async (updatedData) => {
    if (!user?.userId) return { success: false, error: "Not authenticated" };

    setIsUpdating(true);
    try {
      const response = await api.updateUser(updatedData);
      if (response?.success && response?.data) {
        const u = response.data;
        setUser((prev) => ({
          ...prev,
          name:  u.name  ?? prev.name,
          email: u.email ?? prev.email,
          role:  String(u.role || prev.role).toLowerCase(),
        }));
        return { success: true, data: response.data };
      }
      throw new Error(response?.error?.message || "Failed to update user");
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsUpdating(false);
    }
  }, [user?.userId]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const value = {
    user,           // { userId, name, email, role, createdAt } | null
    isLoading,      // true while the initial /api/auth/me fetch is in-flight
    isUpdating,     // true while a profile update is in-flight
    updateUser,     // (data) => Promise<{ success, data?, error? }>
    logout,         // () => void
    refetch: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — consume the auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
