"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { OrgDocument } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { FileUpload } from "@/components/shared/FileUpload";
import { ContentBlocksEditor } from "@/components/shared/ContentBlocksEditor";
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
  slug: z.string().regex(/^[a-z0-9-]*$/, "Только a-z, 0-9, дефис").max(255).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface DocumentFormProps {
  document?: OrgDocument;
}

export function DocumentForm({ document }: DocumentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!document;

  const [content, setContent] = useState(document?.content || "");
  const [file, setFile] = useState<File | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: document
      ? {
          title: document.title,
          slug: document.slug || "",
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

  const isFormDirty = isDirty || content !== (document?.content || "") || !!file;
  useUnsavedChangesGuard(isFormDirty);

  const formRef = useRef<HTMLFormElement>(null);
  useKeyboardShortcuts({
    onSave: () => formRef.current?.requestSubmit(),
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const fd = new FormData();
      fd.append("title", data.title);
      if (data.slug) fd.append("slug", data.slug);
      if (content) fd.append("content", content);
      if (file) fd.append("file", file);

      const headers = { "Content-Type": undefined as unknown as string };

      if (isEditing) {
        return api.patch(`/admin/organization-documents/${document.id}`, fd, { headers });
      }
      fd.append("is_active", "true");
      return api.post("/admin/organization-documents", fd, { headers });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["org-documents"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ["org-document", document.id] });
        toast.success("Документ обновлён");
      } else {
        toast.success("Документ создан");
        router.push(`/admin/content/documents/${res.data.id}/edit`);
      }
    },
  });

  return (
    <form
      ref={formRef}
      onSubmit={(e) => { e.preventDefault(); handleSubmit((d) => mutation.mutate(d))(); }}
      className="space-y-6"
    >
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Содержимое</CardTitle></CardHeader>
        <CardContent>
          <RichTextEditor content={content} onChange={setContent} />
        </CardContent>
      </Card>

      {isEditing && document && (
        <ContentBlocksEditor entityType="organization_document" entityId={document.id} />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">PDF-файл</CardTitle></CardHeader>
        <CardContent>
          <FileUpload
            accept={{ "application/pdf": [".pdf"] }}
            maxSize={20 * 1024 * 1024}
            value={file}
            onChange={(f) => setFile(f as File | null)}
            hint="PDF, до 20 МБ"
          />
          {document?.file_url && !file && (
            <p className="mt-2 text-xs text-muted-foreground">
              PDF уже загружен. Выберите новый файл для замены.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Сохранить" : "Создать"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isFormDirty && !window.confirm("У вас есть несохранённые изменения. Покинуть страницу?")) return;
            router.push("/admin/content/documents");
          }}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
