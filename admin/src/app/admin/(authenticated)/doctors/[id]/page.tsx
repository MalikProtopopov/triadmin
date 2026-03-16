"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import type { DoctorDetail } from "@/types";
import { DetailSkeleton } from "@/components/shared/DetailSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { DoctorProfileCard } from "@/components/features/doctors/DoctorProfileCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: doctor, isLoading, error, refetch } = useQuery<DoctorDetail>({
    queryKey: ["doctor", id],
    queryFn: () => api.get(`/admin/doctors/${id}`).then((r) => r.data),
  });

  if (isLoading) return <DetailSkeleton />;
  if (error || !doctor) return <ErrorState onRetry={refetch} />;

  const fullName = `${doctor.last_name} ${doctor.first_name} ${doctor.middle_name || ""}`.trim();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Врачи", href: "/admin/doctors" }, { label: fullName }]} />

      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/doctors"><ArrowLeft className="mr-1 h-4 w-4" /> Назад к списку</Link>
      </Button>

      <DoctorProfileCard
        doctor={doctor}
        onInvalidate={() => {
          queryClient.invalidateQueries({ queryKey: ["doctor", id] });
          queryClient.invalidateQueries({ queryKey: ["doctors"] });
        }}
      />
    </div>
  );
}
