"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

export interface BreadcrumbItem2 {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem2[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin/dashboard">Дашборд</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {idx === items.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href || "#"}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
