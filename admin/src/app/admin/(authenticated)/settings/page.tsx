"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import type { SiteSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<SiteSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/admin/settings").then((r) => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<SiteSettings>();

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  useUnsavedChangesGuard(isDirty);

  const formRef = useRef<HTMLFormElement>(null);
  useKeyboardShortcuts({ onSave: () => formRef.current?.requestSubmit() });

  const mutation = useMutation({
    mutationFn: (payload: SiteSettings) => api.patch("/admin/settings", { data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Настройки сохранены");
    },
  });

  if (isLoading) return <TableSkeleton rows={8} cols={4} />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <form ref={formRef} onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      <Breadcrumbs items={[{ label: "Настройки" }, { label: "Общие" }]} />
      <h1 className="text-2xl font-bold">Общие настройки</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Контакты для врачей</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register("contacts_for_doctors.email")} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input {...register("contacts_for_doctors.phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адрес</Label>
            <Input {...register("contacts_for_doctors.address")} placeholder="Адрес" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Контакты для посетителей</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register("contacts_for_visitors.email")} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input {...register("contacts_for_visitors.phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адрес</Label>
            <Input {...register("contacts_for_visitors.address")} placeholder="Адрес" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Telegram</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Ссылка на бот</Label>
            <Input {...register("telegram_bot_link")} placeholder="https://t.me/..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Hero-блок главной страницы</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Заголовок</Label>
            <Input {...register("home_hero.title")} />
          </div>
          <div className="space-y-2">
            <Label>Текст</Label>
            <Textarea {...register("home_hero.text")} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>URL изображения</Label>
            <Input {...register("home_hero.image_url")} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Блок «Миссия»</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Текст</Label>
            <Textarea {...register("home_mission.text")} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Сохранить
      </Button>
    </form>
  );
}
