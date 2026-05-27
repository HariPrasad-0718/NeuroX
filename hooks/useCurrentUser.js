"use client";

/**
 * useCurrentUser — thin wrapper around AuthContext.
 *
 * Kept for backwards compatibility with components that already import it.
 * New code should prefer `useAuth()` from "@/context/AuthContext" directly.
 *
 * Returns the same shape as before so no call sites need to change:
 *   { userData, isLoading, error, isUpdating, updateUser, refetch }
 */
import { useAuth } from "@/context/AuthContext";

export function useCurrentUser() {
  const { user, isLoading, isUpdating, updateUser, refetch } = useAuth();

  return {
    userData:   user,       // { userId, name, email, role, createdAt } | null
    isLoading,
    isUpdating,
    updateUser,
    refetch,
    error: null,            // errors now trigger redirect via AuthContext
  };
}
