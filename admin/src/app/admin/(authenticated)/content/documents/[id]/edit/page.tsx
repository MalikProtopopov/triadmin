"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { OrgDocument } from "@/types";
import { DocumentForm } from "@/components/features/content/DocumentForm";
import { FormSkeleton } from "@/components/shared/FormSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function EditDocumentPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery<OrgDocument>({
    queryKey: ["org-document", id],
    queryFn: async () => {
      const res = await api.get("/admin/organization-documents");
      const list: OrgDocument[] = Array.isArray(res.data) ? res.data : res.data.data || res.data;
      const doc = list.find((d) => d.id === id);
      if (!doc) throw new Error("Документ не найден");
      return doc;
    },
  });

  if (isLoading) return <FormSkeleton />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Контент" },
        { label: "Документы организации", href: "/admin/content/documents" },
        { label: data.title },
      ]} />
      <h1 className="text-2xl font-bold">Редактирование документа</h1>
      <DocumentForm document={data} />
    </div>
  );
}
