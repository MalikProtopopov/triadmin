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
import { useState, useRef, useCallback } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
        з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
        п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
        ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[ch] || ch;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const schema = z.object({
  title: z.string().min(3, "Минимум 3 символа"),
  slug: z.string().regex(/^[a-z0-9-]*$/, "Только a-z, 0-9, дефис").max(500).optional().or(z.literal("")),
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
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event
      ? {
          title: event.title,
          slug: event.slug || "",
          description: event.description || "",
          event_date: event.event_date.slice(0, 16),
          event_end_date: event.event_end_date?.slice(0, 16) || "",
          location: event.location || "",
        }
      : {},
  });

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("title", val, { shouldDirty: true });
    if (!slugManuallyEdited) {
      setValue("slug", slugify(val), { shouldDirty: true });
    }
  }, [slugManuallyEdited, setValue]);

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setValue("slug", val, { shouldDirty: true });
    if (val) setSlugManuallyEdited(true);
    else setSlugManuallyEdited(false);
  }, [setValue]);

  const mutation = useMutation({
    mutationFn: async (params: { data: FormData; status: string }) => {
      const fd = new FormData();
      fd.append("title", params.data.title);
      fd.append("event_date", new Date(params.data.event_date).toISOString());
      fd.append("status", params.status);
      if (params.data.slug) fd.append("slug", params.data.slug);
      if (params.data.description) fd.append("description", params.data.description);
      if (params.data.event_end_date) fd.append("event_end_date", new Date(params.data.event_end_date).toISOString());
      if (params.data.location) fd.append("location", params.data.location);
      if (coverImage) fd.append("cover_image", coverImage);

      const headers = { "Content-Type": undefined as unknown as string };

      if (isEditing) {
        return api.patch(`/admin/events/${event.id}`, fd, { headers });
      }
      return api.post("/admin/events", fd, { headers });
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
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submitWithStatus("upcoming"); }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input {...register("title", { onChange: handleTitleChange })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input value={watch("slug") || ""} onChange={handleSlugChange} placeholder="Генерируется из названия" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              <p className="text-xs text-muted-foreground">Допустимы: a-z, 0-9, дефис</p>
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
        <ContentBlocksEditor entityType="event" entityId={event.id} initialBlocks={event?.content_blocks} />
      )}

      <Separator />

      <div className="flex gap-3">
        <Button type="button" onClick={() => submitWithStatus("upcoming")} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
        <Button type="button" onClick={() => submitWithStatus("ongoing")} variant="outline" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Отметить как «Идёт»
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
