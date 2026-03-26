"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Логотип из `public/logo.png` — фиксированная высота, ширина по пропорции. */
export function AdminLogoMark({
  className,
  height = 40,
}: {
  className?: string;
  /** Высота в px */
  height?: number;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Ассоциация трихологов"
      width={240}
      height={height}
      className={cn("w-auto max-w-full object-contain object-left", className)}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
