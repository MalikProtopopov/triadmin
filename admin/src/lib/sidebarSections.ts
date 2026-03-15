/** Fallback mapping role -> sidebar_sections when GET /auth/me is unavailable */

export const ROLE_SIDEBAR_SECTIONS: Record<string, string[]> = {
  admin: [
    "dashboard",
    "doctors",
    "doctors_import",
    "events",
    "payments",
    "content",
    "content_articles",
    "content_themes",
    "content_documents",
    "settings",
    "settings_general",
    "settings_cities",
    "settings_plans",
    "settings_seo",
    "voting",
    "notifications",
    "portal_users",
    "administrators",
  ],
  manager: [
    "dashboard",
    "doctors",
    "events",
    "payments",
    "content",
    "content_articles",
    "content_themes",
    "content_documents",
    "settings",
    "settings_cities",
    "portal_users",
  ],
  accountant: ["payments"],
};

export function getSidebarSectionsForRole(role: string): string[] {
  return ROLE_SIDEBAR_SECTIONS[role] ?? [];
}
