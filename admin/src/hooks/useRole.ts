"use client";

import { useAuth } from "@/hooks/useAuth";
import { hasRole, hasAnyRole } from "@/lib/auth";

export function useRole() {
  const user = useAuth((s) => s.user);

  return {
    isAdmin: hasRole(user, "admin"),
    isManager: hasRole(user, "manager"),
    isAccountant: hasRole(user, "accountant"),
    hasRole: (role: string) => hasRole(user, role),
    hasAnyRole: (roles: string[]) => hasAnyRole(user, roles),
  };
}
