"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ArticleDetail } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { FileUpload } from "@/components/shared/FileUpload";
import { ContentBlocksEditor } from "@/components/shared/ContentBlocksEditor";
import { Loader2, X } from "lucide-react";
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
  excerpt: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ArticleFormProps {
  article?: ArticleDetail;
}

interface ThemeOption {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
}

export function ArticleForm({ article }: ArticleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!article;

  const [content, setContent] = useState(article?.content || "");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>(
    article?.themes?.map((t) => t.id) || []
  );

  const { data: themesData } = useQuery<{ data: ThemeOption[] }>({
    queryKey: ["article-themes-active"],
    queryFn: () => api.get("/admin/article-themes?is_active=true&limit=100&offset=0").then((r) => r.data),
  });
  const activeThemes = themesData?.data || [];

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: article
      ? {
          title: article.title,
          slug: article.slug || "",
          excerpt: article.excerpt || "",
          seo_title: article.seo_title || "",
          seo_description: article.seo_description || "",
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

  const isFormDirty = isDirty || content !== (article?.content || "");
  useUnsavedChangesGuard(isFormDirty);

  const formRef = useRef<HTMLFormElement>(null);
  useKeyboardShortcuts({
    onSave: () => formRef.current?.requestSubmit(),
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: async (params: { data: FormData; status: string }) => {
      const fd = new FormData();
      fd.append("title", params.data.title);
      fd.append("content", content);
      fd.append("status", params.status);
      if (params.data.slug) fd.append("slug", params.data.slug);
      if (params.data.excerpt) fd.append("excerpt", params.data.excerpt);
      if (params.data.seo_title) fd.append("seo_title", params.data.seo_title);
      if (params.data.seo_description) fd.append("seo_description", params.data.seo_description);
      if (selectedThemeIds.length > 0) fd.append("theme_ids", JSON.stringify(selectedThemeIds));
      if (coverImage) fd.append("cover_image", coverImage);

      const headers = { "Content-Type": undefined as unknown as string };

      if (isEditing) {
        return api.patch(`/admin/articles/${article.id}`, fd, { headers });
      }
      return api.post("/admin/articles", fd, { headers });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ["article", article.id] });
        toast.success("Статья обновлена");
      } else {
        toast.success("Статья создана");
        router.push(`/admin/content/articles/${res.data.id}/edit`);
      }
    },
  });

  function submitWithStatus(status: string) {
    handleSubmit((d) => mutation.mutate({ data: d, status }))();
  }

  function toggleTheme(themeId: string) {
    setSelectedThemeIds((prev) =>
      prev.includes(themeId) ? prev.filter((id) => id !== themeId) : [...prev, themeId]
    );
  }

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submitWithStatus("draft"); }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Заголовок *</Label>
              <Input {...register("title", { onChange: handleTitleChange })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input value={watch("slug") || ""} onChange={handleSlugChange} placeholder="Генерируется из заголовка" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              <p className="text-xs text-muted-foreground">Допустимы: a-z, 0-9, дефис</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Краткое описание</Label>
            <Textarea {...register("excerpt")} rows={2} placeholder="Краткое описание для превью" />
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
            {article?.cover_image_url && !coverImage && (
              <p className="text-xs text-muted-foreground">Текущая обложка загружена. Выберите новый файл для замены.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Содержимое</CardTitle></CardHeader>
        <CardContent>
          <RichTextEditor content={content} onChange={setContent} />
        </CardContent>
      </Card>

      {/* Themes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Темы</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {activeThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных тем. Создайте темы в разделе «Темы статей».</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeThemes.map((theme) => {
                const selected = selectedThemeIds.includes(theme.id);
                return (
                  <Badge
                    key={theme.id}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleTheme(theme.id)}
                  >
                    {theme.title}
                    {selected && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
              {article?.themes?.filter((t) => !activeThemes.some((at) => at.id === t.id)).map((theme) => {
                const selected = selectedThemeIds.includes(theme.id);
                return (
                  <Badge
                    key={theme.id}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer select-none opacity-60"
                    onClick={() => toggleTheme(theme.id)}
                    title="Тема неактивна"
                  >
                    {theme.title}
                    {selected && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isEditing && article && (
        <ContentBlocksEditor entityType="article" entityId={article.id} initialBlocks={article?.content_blocks} />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>SEO Title</Label>
            <Input {...register("seo_title")} placeholder="Заголовок для поисковых систем" />
          </div>
          <div className="space-y-2">
            <Label>SEO Description</Label>
            <Input {...register("seo_description")} placeholder="Описание для поисковых систем" />
          </div>
        </CardContent>
      </Card>

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
            if (isFormDirty && !window.confirm("У вас есть несохранённые изменения. Покинуть страницу?")) return;
            router.back();
          }}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
