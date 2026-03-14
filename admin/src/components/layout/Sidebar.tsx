"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  FileText,
  Settings,
  Vote,
  Bell,
  UserCog,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: { label: string; href: string; roles?: string[] }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Дашборд", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["admin", "manager"] },
  { label: "Врачи", href: "/admin/doctors", icon: <Users className="h-4 w-4" />, roles: ["admin", "manager"] },
  { label: "Мероприятия", href: "/admin/events", icon: <CalendarDays className="h-4 w-4" />, roles: ["admin", "manager"] },
  { label: "Платежи", href: "/admin/payments", icon: <CreditCard className="h-4 w-4" />, roles: ["admin", "manager", "accountant"] },
  {
    label: "Контент",
    href: "/admin/content",
    icon: <FileText className="h-4 w-4" />,
    roles: ["admin", "manager"],
    children: [
      { label: "Статьи", href: "/admin/content/articles" },
      { label: "Темы статей", href: "/admin/content/article-themes" },
      { label: "Документы", href: "/admin/content/documents" },
    ],
  },
  {
    label: "Настройки",
    href: "/admin/settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["admin"],
    children: [
      { label: "Общие", href: "/admin/settings" },
      { label: "Города", href: "/admin/settings/cities", roles: ["admin", "manager"] },
      { label: "Тарифы", href: "/admin/settings/plans" },
      { label: "SEO", href: "/admin/settings/seo" },
    ],
  },
  { label: "Голосование", href: "/admin/voting", icon: <Vote className="h-4 w-4" />, roles: ["admin", "manager"] },
  { label: "Уведомления", href: "/admin/notifications", icon: <Bell className="h-4 w-4" />, roles: ["admin", "manager"] },
  { label: "Пользователи портала", href: "/admin/portal-users", icon: <Users className="h-4 w-4" />, roles: ["admin", "manager", "accountant"] },
  { label: "Администраторы", href: "/admin/users", icon: <UserCog className="h-4 w-4" />, roles: ["admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasAnyRole } = useRole();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasAnyRole(item.roles));

  return (
    <aside className="hidden xl:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="font-semibold text-sm">Ассоциация трихологов</h1>
        {user && <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>}
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const visibleChildren = item.children?.filter((c) => !c.roles || hasAnyRole(c.roles));

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
                {isActive && visibleChildren && visibleChildren.length > 0 && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {visibleChildren.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block px-3 py-1.5 rounded-md text-sm transition-colors",
                          pathname === child.href
                            ? "text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-2">
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
