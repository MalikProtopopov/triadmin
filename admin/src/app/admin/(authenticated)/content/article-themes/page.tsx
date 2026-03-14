"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ArticleTheme } from "@/types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ThemeFormData {
  title: string;
  slug: string;
  is_active: boolean;
  sort_order: number | "";
}

const EMPTY_FORM: ThemeFormData = { title: "", slug: "", is_active: true, sort_order: "" };

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

export default function ArticleThemesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ThemeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArticleTheme | null>(null);

  const { data, isLoading, error, refetch } = useQuery<{ data: ArticleTheme[] }>({
    queryKey: ["article-themes"],
    queryFn: () => api.get("/admin/article-themes").then((r) => r.data),
  });

  const themes = data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/article-themes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-themes"] });
      toast.success("Тема удалена");
      setDeleteTarget(null);
    },
  });

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(theme: ArticleTheme) {
    setEditingId(theme.id);
    setForm({
      title: theme.title,
      slug: theme.slug,
      is_active: theme.is_active,
      sort_order: theme.sort_order,
    });
    setModalOpen(true);
  }

  function handleTitleChange(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      slug: editingId ? prev.slug : slugify(title),
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Укажите название темы");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/article-themes/${editingId}`, {
          title: form.title,
          slug: form.slug || null,
          is_active: form.is_active,
          sort_order: form.sort_order === "" ? 0 : form.sort_order,
        });
        toast.success("Тема обновлена");
      } else {
        await api.post("/admin/article-themes", {
          title: form.title,
          slug: form.slug || null,
          is_active: form.is_active,
          sort_order: form.sort_order === "" ? 0 : form.sort_order,
        });
        toast.success("Тема создана");
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["article-themes"] });
    } catch { /* handled by interceptor */ }
    finally { setSaving(false); }
  }

  if (isLoading) return <TableSkeleton rows={5} cols={5} />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Контент" }, { label: "Темы статей" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Темы статей</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Создать тему</Button>
      </div>

      {themes.length === 0 ? (
        <EmptyState title="Нет тем" description="Создайте первую тему для статей" actionLabel="Создать тему" onAction={openNew} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Активна</TableHead>
              <TableHead>Порядок</TableHead>
              <TableHead>Статей</TableHead>
              <TableHead className="w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {themes.map((theme) => (
              <TableRow key={theme.id}>
                <TableCell className="font-medium">{theme.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{theme.slug}</TableCell>
                <TableCell>
                  <Switch
                    checked={theme.is_active}
                    onCheckedChange={async (v) => {
                      try {
                        await api.patch(`/admin/article-themes/${theme.id}`, { is_active: v });
                        queryClient.invalidateQueries({ queryKey: ["article-themes"] });
                      } catch { /* handled by interceptor */ }
                    }}
                  />
                </TableCell>
                <TableCell>{theme.sort_order}</TableCell>
                <TableCell>{theme.articles_count ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(theme)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(theme)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setForm(EMPTY_FORM); setModalOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать тему" : "Новая тема"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Трихология, Дерматоскопия..." />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-generated" />
              <p className="text-xs text-muted-foreground">Оставьте пустым для автогенерации</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input type="number" placeholder="0" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                <Label>Активна</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button disabled={saving || !form.title.trim()} onClick={handleSave}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить тему?"
        description={`Тема «${deleteTarget?.title}» будет удалена. Статьи, привязанные к этой теме, не будут удалены.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
