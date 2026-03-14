"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { EventDetail } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/shared/FileUpload";
import { ContentBlocksEditor } from "@/components/shared/ContentBlocksEditor";
import { TariffSection } from "./TariffSection";
import { GallerySection } from "./GallerySection";
import { RecordingSection } from "./RecordingSection";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const schema = z.object({
  title: z.string().min(3, "Минимум 3 символа"),
  description: z.string().optional(),
  event_date: z.string().min(1, "Укажите дату"),
  event_end_date: z.string().optional(),
  location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EventFormProps {
  event?: EventDetail;
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!event;
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description || "",
          event_date: event.event_date.slice(0, 16),
          event_end_date: event.event_end_date?.slice(0, 16) || "",
          location: event.location || "",
        }
      : {},
  });

  const mutation = useMutation({
    mutationFn: async (params: { data: FormData; status: string }) => {
      const fd = new FormData();
      fd.append("title", params.data.title);
      fd.append("event_date", new Date(params.data.event_date).toISOString());
      if (params.data.description) fd.append("description", params.data.description);
      if (params.data.event_end_date) fd.append("event_end_date", new Date(params.data.event_end_date).toISOString());
      if (params.data.location) fd.append("location", params.data.location);
      fd.append("status", params.status);
      if (coverImage) fd.append("cover_image", coverImage);

      if (isEditing) {
        return api.patch(`/admin/events/${event.id}`, fd);
      }
      return api.post("/admin/events", fd);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ["event", event.id] });
        toast.success("Мероприятие обновлено");
      } else {
        toast.success("Мероприятие создано");
        router.push(`/admin/events/${res.data.id}/edit`);
      }
    },
  });

  useUnsavedChangesGuard(isDirty);

  const formRef = useRef<HTMLFormElement>(null);
  useKeyboardShortcuts({
    onSave: () => formRef.current?.requestSubmit(),
    enabled: true,
  });

  function submitWithStatus(status: string) {
    handleSubmit((d) => mutation.mutate({ data: d, status }))();
  }

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submitWithStatus("draft"); }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea {...register("description")} rows={5} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Дата начала *</Label>
              <Input type="datetime-local" {...register("event_date")} />
              {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Дата окончания</Label>
              <Input type="datetime-local" {...register("event_end_date")} />
            </div>
            <div className="space-y-2">
              <Label>Место</Label>
              <Input {...register("location")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Обложка</Label>
            <FileUpload
              accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
              maxSize={5 * 1024 * 1024}
              value={coverImage}
              onChange={(f) => setCoverImage(f as File | null)}
              hint="JPG, PNG, WebP, до 5 МБ"
            />
            {event?.cover_image_url && !coverImage && (
              <p className="text-xs text-muted-foreground">Текущая обложка загружена. Выберите новый файл для замены.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <TariffSection eventId={event?.id ?? ""} tariffs={event?.tariffs ?? []} isEditing={isEditing} />

      {isEditing && event && (
        <GallerySection eventId={event.id} galleries={event.galleries ?? []} />
      )}

      {isEditing && event && (
        <RecordingSection eventId={event.id} recordings={event.recordings ?? []} />
      )}

      {isEditing && event && (
        <ContentBlocksEditor entityType="event" entityId={event.id} />
      )}

      <Separator />

      <div className="flex gap-3">
        <Button type="button" onClick={() => submitWithStatus("draft")} variant="outline" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить черновик
        </Button>
        <Button type="button" onClick={() => submitWithStatus("published")} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Опубликовать
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isDirty && !window.confirm("У вас есть несохранённые изменения. Покинуть страницу?")) return;
            router.back();
          }}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
