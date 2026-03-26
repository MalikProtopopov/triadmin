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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileUpload } from "@/components/shared/FileUpload";
import { ContentBlocksEditor } from "@/components/shared/ContentBlocksEditor";
import { Loader2, FileText, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { slugify, sanitizeSlugInput } from "@/lib/slugify";

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
  const [deleteFileOpen, setDeleteFileOpen] = useState(false);
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
    const val = sanitizeSlugInput(e.target.value);
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

  const removeFileMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("remove_file", "true");
      return api.patch(`/admin/organization-documents/${document!.id}`, fd, {
        headers: { "Content-Type": undefined as unknown as string },
      });
    },
    onSuccess: () => {
      setDeleteFileOpen(false);
      queryClient.invalidateQueries({ queryKey: ["org-documents"] });
      queryClient.invalidateQueries({ queryKey: ["org-document", document!.id] });
      toast.success("Файл удалён");
    },
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
        <ContentBlocksEditor entityType="organization_document" entityId={document.id} initialBlocks={document?.content_blocks} />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">PDF-файл</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <FileUpload
            accept={{ "application/pdf": [".pdf"] }}
            maxSize={20 * 1024 * 1024}
            value={file}
            onChange={(f) => setFile(f as File | null)}
            hint="PDF, до 20 МБ"
          />
          {document?.file_url && !file && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Загруженный файл</p>
                <p className="text-xs text-muted-foreground truncate">PDF-документ</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Просмотреть
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteFileOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Удалить
                </Button>
              </div>
            </div>
          )}
          {document?.file_url && file && (
            <p className="text-xs text-muted-foreground">
              Будет загружен новый файл взамен текущего.
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

      <ConfirmDialog
        open={deleteFileOpen}
        onOpenChange={setDeleteFileOpen}
        title="Удалить прикреплённый файл?"
        description="Файл будет удалён безвозвратно. Это действие можно отменить, загрузив новый файл."
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={removeFileMutation.isPending}
        onConfirm={() => removeFileMutation.mutate()}
      />
    </form>
  );
}
