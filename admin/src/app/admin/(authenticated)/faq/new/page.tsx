"use client";

import { FaqForm } from "@/components/features/faq/FaqForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function NewFaqPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Вопросы и ответы", href: "/admin/faq" }, { label: "Новый вопрос" }]} />
      <h1 className="text-2xl font-bold">Новый вопрос</h1>
      <FaqForm />
    </div>
  );
}
