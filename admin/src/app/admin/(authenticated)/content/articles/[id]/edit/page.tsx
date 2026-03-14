"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { ArticleDetail } from "@/types";
import { ArticleForm } from "@/components/features/content/ArticleForm";
import { FormSkeleton } from "@/components/shared/FormSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery<ArticleDetail>({
    queryKey: ["article", id],
    queryFn: () => api.get(`/admin/articles/${id}`).then((r) => r.data),
  });

  if (isLoading) return <FormSkeleton />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Контент" },
        { label: "Статьи", href: "/admin/content/articles" },
        { label: data.title },
      ]} />
      <h1 className="text-2xl font-bold">Редактирование статьи</h1>
      <ArticleForm article={data} />
    </div>
  );
}
