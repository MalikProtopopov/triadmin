/** Fallback mapping role -> sidebar_sections when GET /auth/me is unavailable */

export const ROLE_SIDEBAR_SECTIONS: Record<string, string[]> = {
  admin: [
    "dashboard",
    "arrears",
    "doctors",
    "protocol_history",
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
    "settings_telegram",
    "settings_certificates",
    "voting",
    "notifications",
    "portal_users",
    "administrators",
  ],
  manager: [
    "dashboard",
    "doctors",
    "protocol_history",
    "events",
    "payments",
    "content",
    "content_articles",
    "content_themes",
    "content_documents",
    "settings",
    "settings_cities",
    "settings_telegram",
    "settings_certificates",
    "portal_users",
  ],
  accountant: ["arrears", "doctors", "payments"],
};

export function getSidebarSectionsForRole(role: string): string[] {
  return ROLE_SIDEBAR_SECTIONS[role] ?? [];
}

/** Порядок секций для редиректа на первый доступный раздел */
const DEFAULT_REDIRECT_ORDER: { section: string; href: string }[] = [
  { section: "dashboard", href: "/admin/dashboard" },
  { section: "arrears", href: "/admin/arrears" },
  { section: "doctors", href: "/admin/doctors" },
  { section: "protocol_history", href: "/admin/protocol-history" },
  { section: "doctors_import", href: "/admin/portal-users/import" },
  { section: "events", href: "/admin/events" },
  { section: "payments", href: "/admin/payments" },
  { section: "content", href: "/admin/content" },
  { section: "content_articles", href: "/admin/content/articles" },
  { section: "content_themes", href: "/admin/content/article-themes" },
  { section: "content_documents", href: "/admin/content/documents" },
  { section: "settings", href: "/admin/settings" },
  { section: "settings_general", href: "/admin/settings" },
  { section: "settings_cities", href: "/admin/settings/cities" },
  { section: "settings_plans", href: "/admin/settings/plans" },
  { section: "settings_seo", href: "/admin/settings/seo" },
  { section: "settings_telegram", href: "/admin/settings/telegram" },
  { section: "settings_certificates", href: "/admin/settings/certificates" },
  { section: "voting", href: "/admin/voting" },
  { section: "notifications", href: "/admin/notifications" },
  { section: "portal_users", href: "/admin/portal-users" },
  { section: "administrators", href: "/admin/users" },
];

/** Возвращает URL первого доступного раздела для редиректа после входа */
export function getDefaultAdminUrl(sections: string[]): string {
  for (const { section, href } of DEFAULT_REDIRECT_ORDER) {
    if (sections.includes(section)) return href;
  }
  return "/admin/dashboard";
}
