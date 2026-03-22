"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  FileText,
  FileStack,
  Tags,
  Settings,
  MapPin,
  Search,
  Send,
  Award,
  Vote,
  Bell,
  UserCog,
  LogOut,
  ChevronDown,
  ChevronRight,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarSections } from "@/hooks/useSidebarSections";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const iconCls = "h-4 w-4 shrink-0";

interface NavChild {
  label: string;
  href: string;
  section: string;
  icon: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Дашборд", href: "/admin/dashboard", icon: <LayoutDashboard className={iconCls} />, section: "dashboard" },
  { label: "Врачи", href: "/admin/doctors", icon: <Users className={iconCls} />, section: "doctors" },
  { label: "Мероприятия", href: "/admin/events", icon: <CalendarDays className={iconCls} />, section: "events" },
  { label: "Платежи", href: "/admin/payments", icon: <CreditCard className={iconCls} />, section: "payments" },
  {
    label: "Контент",
    href: "/admin/content",
    icon: <FileText className={iconCls} />,
    section: "content",
    children: [
      { label: "Статьи", href: "/admin/content/articles", section: "content_articles", icon: <FileText className={iconCls} /> },
      { label: "Темы статей", href: "/admin/content/article-themes", section: "content_themes", icon: <Tags className={iconCls} /> },
      { label: "Документы", href: "/admin/content/documents", section: "content_documents", icon: <FileStack className={iconCls} /> },
    ],
  },
  {
    label: "Настройки",
    href: "/admin/settings",
    icon: <Settings className={iconCls} />,
    section: "settings",
    children: [
      { label: "Общие", href: "/admin/settings", section: "settings_general", icon: <Settings className={iconCls} /> },
      { label: "Города", href: "/admin/settings/cities", section: "settings_cities", icon: <MapPin className={iconCls} /> },
      { label: "Тарифы", href: "/admin/settings/plans", section: "settings_plans", icon: <CreditCard className={iconCls} /> },
      { label: "SEO", href: "/admin/settings/seo", section: "settings_seo", icon: <Search className={iconCls} /> },
      { label: "Telegram", href: "/admin/settings/telegram", section: "settings_telegram", icon: <Send className={iconCls} /> },
      { label: "Сертификаты", href: "/admin/settings/certificates", section: "settings_certificates", icon: <Award className={iconCls} /> },
    ],
  },
  { label: "Голосование", href: "/admin/voting", icon: <Vote className={iconCls} />, section: "voting" },
  { label: "Уведомления", href: "/admin/notifications", icon: <Bell className={iconCls} />, section: "notifications" },
  {
    label: "Пользователи портала",
    href: "/admin/portal-users",
    icon: <Users className={iconCls} />,
    section: "portal_users",
    children: [
      { label: "Пользователи", href: "/admin/portal-users", section: "portal_users", icon: <Users className={iconCls} /> },
      { label: "Импорт пользователей", href: "/admin/portal-users/import", section: "doctors_import", icon: <Upload className={iconCls} /> },
    ],
  },
  { label: "Администраторы", href: "/admin/users", icon: <UserCog className={iconCls} />, section: "administrators" },
];

function isSectionVisible(sections: string[], section: string): boolean {
  return sections.includes(section);
}

function isNavItemVisible(item: NavItem, sections: string[]): boolean {
  if (isSectionVisible(sections, item.section)) return true;
  if (item.children) {
    return item.children.some((c) => isSectionVisible(sections, c.section));
  }
  return false;
}

function getActiveSection(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"))) {
      return item.section;
    }
  }
  return null;
}

export function Sidebar({ mobile }: { mobile?: boolean } = {}) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const sections = useSidebarSections();
  const activeSection = getActiveSection(pathname);

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    activeSection ? new Set([activeSection]) : new Set<string>()
  );

  useEffect(() => {
    if (activeSection) setExpanded((prev) => new Set(prev).add(activeSection));
  }, [activeSection]);

  const toggleExpanded = (section: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const visibleItems = NAV_ITEMS.filter((item) => isNavItemVisible(item, sections));

  return (
    <aside
      className={cn(
        "flex flex-col w-64 border-r bg-card min-h-0",
        mobile ? "h-full" : "hidden xl:flex h-screen sticky top-0"
      )}
    >
      <div className="shrink-0 p-4 border-b">
        <h1 className="font-semibold text-sm">Ассоциация трихологов</h1>
        {user && <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>}
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-auto">
        <nav className="space-y-0.5 px-2 py-2 pb-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const visibleChildren = item.children?.filter((c) => isSectionVisible(sections, c.section));
            const hasChildren = visibleChildren && visibleChildren.length > 0;
            const isExpanded = hasChildren && expanded.has(item.section);

            return (
              <div key={item.href} className="space-y-0.5">
                {hasChildren ? (
                  <div>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-md",
                        isActive || isExpanded
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.section)}
                        className="p-2 -m-1 rounded hover:bg-muted transition-colors"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Свернуть" : "Развернуть"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex flex-1 items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                          isActive || isExpanded
                            ? "font-medium"
                            : "hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </div>
                    {isExpanded && (
                      <div className="ml-7 mt-0.5 space-y-0.5">
                        {visibleChildren!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                              pathname === child.href
                                ? "text-primary font-medium bg-primary/5"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {child.icon}
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="w-4" />
                    {item.icon}
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="shrink-0" />
      <div className="shrink-0 p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => {
            logout();
            window.location.href = "/admin/login";
          }}
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </div>
    </aside>
  );
}
