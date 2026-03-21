"use client";

import { useAuth } from "@/hooks/useAuth";
import { getSidebarSectionsForRole } from "@/lib/sidebarSections";
import type { User } from "@/types";

function getEffectiveSidebarSections(user: User | null): string[] {
  if (!user) return [];
  let sections: string[];
  if (user.sidebar_sections && user.sidebar_sections.length > 0) {
    sections = user.sidebar_sections;
  } else {
    const role = user.roles[0];
    sections = role ? getSidebarSectionsForRole(role) : [];
  }
  // Мержим секции из fallback для admin — бэкенд может ещё не возвращать новые (напр. settings_certificates)
  const role = user.roles[0];
  if (role === "admin") {
    const roleSections = getSidebarSectionsForRole(role);
    const missing = roleSections.filter((s) => !sections.includes(s));
    if (missing.length > 0) sections = [...sections, ...missing];
  }
  return sections;
}

export function useSidebarSections(): string[] {
  const user = useAuth((s) => s.user);
  return getEffectiveSidebarSections(user);
}
