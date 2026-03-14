"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { EventDetail } from "@/types";
import { EventForm } from "@/components/features/events/EventForm";
import { FormSkeleton } from "@/components/shared/FormSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery<EventDetail>({
    queryKey: ["event", id],
    queryFn: () => api.get(`/admin/events/${id}`).then((r) => r.data),
  });

  if (isLoading) return <FormSkeleton />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Мероприятия", href: "/admin/events" }, { label: data.title, href: `/admin/events/${id}` }, { label: "Редактирование" }]} />
      <h1 className="text-2xl font-bold">Редактирование мероприятия</h1>
      <EventForm event={data} />
    </div>
  );
}
