"use client";

import { useAuth } from "@/hooks/useAuth";
import { getSidebarSectionsForRole } from "@/lib/sidebarSections";
import type { User } from "@/types";

function getEffectiveSidebarSections(user: User | null): string[] {
  if (!user) return [];
  if (user.sidebar_sections && user.sidebar_sections.length > 0) {
    return user.sidebar_sections;
  }
  const role = user.roles[0];
  return role ? getSidebarSectionsForRole(role) : [];
}

export function useSidebarSections(): string[] {
  const user = useAuth((s) => s.user);
  return getEffectiveSidebarSections(user);
}
