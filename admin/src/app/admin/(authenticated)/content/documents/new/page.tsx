"use client";

import { DocumentForm } from "@/components/features/content/DocumentForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function NewDocumentPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Контент" },
        { label: "Документы организации", href: "/admin/content/documents" },
        { label: "Новый документ" },
      ]} />
      <h1 className="text-2xl font-bold">Новый документ</h1>
      <DocumentForm />
    </div>
  );
}
