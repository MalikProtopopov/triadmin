"use client";

import { useAuth } from "@/hooks/useAuth";
import { hasAdminAccess, hasRole } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { isPathAllowedForAccountant } from "@/lib/accountantRoutes";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const isLoading = useAuth((s) => s.isLoading);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !hasAdminAccess(user)) {
      router.replace("/admin/login");
      return;
    }
    if (!isLoading && user && hasRole(user, "accountant") && !isPathAllowedForAccountant(pathname)) {
      router.replace("/admin/payments");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !hasAdminAccess(user)) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
