"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { AdminLogoMark } from "@/components/layout/AdminLogoMark";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4 xl:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>
      <div className="ml-3 flex min-w-0 flex-1 items-center gap-2">
        <AdminLogoMark height={28} className="shrink-0" />
        <span className="truncate font-semibold text-sm">Ассоциация трихологов</span>
      </div>
    </header>
  );
}
