"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { FaqAdminItem } from "@/types";
import { FaqForm } from "@/components/features/faq/FaqForm";
import { FormSkeleton } from "@/components/shared/FormSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function EditFaqPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery<FaqAdminItem>({
    queryKey: ["faq", id],
    queryFn: () => api.get(`/admin/faq/${id}`).then((r) => r.data),
  });

  if (isLoading) return <FormSkeleton />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Вопросы и ответы", href: "/admin/faq" },
        { label: data.question_title },
      ]} />
      <h1 className="text-2xl font-bold">Редактирование вопроса</h1>
      <FaqForm faq={data} />
    </div>
  );
}
