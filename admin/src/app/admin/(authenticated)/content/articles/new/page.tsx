"use client";

import { ArticleForm } from "@/components/features/content/ArticleForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Контент" }, { label: "Статьи", href: "/admin/content/articles" }, { label: "Новая статья" }]} />
      <h1 className="text-2xl font-bold">Новая статья</h1>
      <ArticleForm />
    </div>
  );
}
