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
  // Добавляем settings_certificates и settings_telegram при доступе к настройкам — бэкенд может ещё не возвращать
  const hasSettingsAccess = sections.some(
    (s) => s === "settings" || s.startsWith("settings_")
  );
  const toMerge = ["settings_certificates", "settings_telegram"];
  for (const sec of toMerge) {
    if (hasSettingsAccess && !sections.includes(sec)) sections = [...sections, sec];
  }
  return sections;
}

export function useSidebarSections(): string[] {
  const user = useAuth((s) => s.user);
  return getEffectiveSidebarSections(user);
}
