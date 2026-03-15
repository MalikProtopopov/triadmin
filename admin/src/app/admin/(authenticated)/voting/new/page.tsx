"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DoctorListItem, PaginatedResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ErrorState } from "@/components/shared/ErrorState";
import { FormSkeleton } from "@/components/shared/FormSkeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(3, "Минимум 3 символа"),
  description: z.string().optional(),
  starts_at: z.string().min(1, "Укажите дату начала"),
  ends_at: z.string().min(1, "Укажите дату окончания"),
});

type FormData = z.infer<typeof schema>;

export default function NewVotingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [candidateDescriptions, setCandidateDescriptions] = useState<Record<string, string>>({});

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: doctors, error: doctorsError, isLoading: doctorsLoading, refetch: doctorsRefetch } = useQuery<PaginatedResponse<DoctorListItem>>({
    queryKey: ["approved-doctors"],
    queryFn: () => api.get("/admin/doctors?status=approved&limit=100").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post("/admin/voting", {
        title: data.title,
        description: data.description || null,
        starts_at: new Date(data.starts_at).toISOString(),
        ends_at: new Date(data.ends_at).toISOString(),
        candidates: selectedCandidates.map((id) => ({
          doctor_profile_id: id,
          description: candidateDescriptions[id] || null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-sessions"] });
      toast.success("Сессия голосования создана");
      router.push("/admin/voting");
    },
  });

  if (doctorsLoading) return <FormSkeleton />;
  if (doctorsError) return <ErrorState message="Не удалось загрузить список врачей" onRetry={doctorsRefetch} />;

  function toggleCandidate(id: string) {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      <Breadcrumbs items={[{ label: "Голосование", href: "/admin/voting" }, { label: "Новая сессия" }]} />
      <h1 className="text-2xl font-bold">Новая сессия голосования</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea {...register("description")} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата начала *</Label>
              <Input type="datetime-local" {...register("starts_at")} />
              {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Дата окончания *</Label>
              <Input type="datetime-local" {...register("ends_at")} />
              {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Кандидаты ({selectedCandidates.length} выбрано)</CardTitle></CardHeader>
        <CardContent>
          {!doctors?.data?.length ? (
            <p className="text-sm text-muted-foreground">Нет одобренных врачей для выбора</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
              {doctors.data.map((doc) => {
                const fullName = `${doc.last_name} ${doc.first_name} ${doc.middle_name || ""}`.trim();
                const isSelected = selectedCandidates.includes(doc.id);
                return (
                  <div key={doc.id} className="space-y-2 p-2 rounded border">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors -m-2 p-2 rounded">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCandidate(doc.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialization || doc.email}</p>
                      </div>
                    </label>
                    {isSelected && (
                      <div className="pl-6">
                        <Textarea
                          placeholder="Описание кандидата (опционально)"
                          value={candidateDescriptions[doc.id] || ""}
                          onChange={(e) =>
                            setCandidateDescriptions((prev) => ({
                              ...prev,
                              [doc.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending || selectedCandidates.length === 0}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Создать сессию
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Отмена</Button>
      </div>
    </form>
  );
}
