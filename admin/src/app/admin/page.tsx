"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminAccess } from "@/lib/auth";
import { getDefaultAdminUrl, getSidebarSectionsForRole } from "@/lib/sidebarSections";

export default function AdminPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const isLoading = useAuth((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;
    if (!hasAdminAccess(user)) {
      router.replace("/admin/login");
      return;
    }
    const sections = user?.sidebar_sections?.length
      ? user.sidebar_sections
      : getSidebarSectionsForRole(user?.roles[0] ?? "");
    router.replace(getDefaultAdminUrl(sections));
  }, [user, isLoading, router]);

  return null;
}
