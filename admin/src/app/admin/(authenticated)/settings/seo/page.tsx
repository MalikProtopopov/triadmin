"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PageSeo, PaginatedResponse } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { totalPages } from "@/lib/pagination";
import { toast } from "sonner";

interface SeoFormData {
  slug: string;
  title: string;
  description: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  og_url: string;
  og_type: string;
  twitter_card: string;
  canonical_url: string;
}

const EMPTY_FORM: SeoFormData = {
  slug: "", title: "", description: "", og_title: "", og_description: "",
  og_image_url: "", og_url: "", og_type: "", twitter_card: "", canonical_url: "",
};

export default function SeoSettingsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<SeoFormData>(EMPTY_FORM);
  const initialFormRef = useRef<SeoFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PageSeo | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<PageSeo>>({
    queryKey: ["seo-pages", params.toString()],
    queryFn: () => api.get(`/admin/seo-pages?${params}`).then((r) => r.data),
  });

  const pages = data?.data || [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title || null,
        description: form.description || null,
        og_title: form.og_title || null,
        og_description: form.og_description || null,
        og_image_url: form.og_image_url || null,
        og_url: form.og_url || null,
        og_type: form.og_type || null,
        twitter_card: form.twitter_card || null,
        canonical_url: form.canonical_url || null,
      };
      if (editingSlug) {
        return api.patch(`/admin/seo-pages/${editingSlug}`, payload);
      }
      return api.post("/admin/seo-pages", { slug: form.slug, ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-pages"] });
      toast.success(editingSlug ? "SEO настройки сохранены" : "SEO страница создана");
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => api.delete(`/admin/seo-pages/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-pages"] });
      toast.success("SEO страница удалена");
      setDeleteTarget(null);
    },
  });

  function isModalDirty() {
    return JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
  }

  function handleModalClose(open: boolean) {
    if (!open && isModalDirty()) {
      if (!window.confirm("У вас есть несохранённые изменения. Закрыть без сохранения?")) return;
    }
    if (!open) setForm(EMPTY_FORM);
    setModalOpen(open);
  }

  function openNew() {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    initialFormRef.current = EMPTY_FORM;
    setModalOpen(true);
  }

  function openEdit(seoPage: PageSeo) {
    setEditingSlug(seoPage.slug);
    const formData: SeoFormData = {
      slug: seoPage.slug,
      title: seoPage.title || "",
      description: seoPage.description || "",
      og_title: seoPage.og_title || "",
      og_description: seoPage.og_description || "",
      og_image_url: seoPage.og_image_url || "",
      og_url: seoPage.og_url || "",
      og_type: seoPage.og_type || "",
      twitter_card: seoPage.twitter_card || "",
      canonical_url: seoPage.canonical_url || "",
    };
    setForm(formData);
    initialFormRef.current = formData;
    setModalOpen(true);
  }

  function updateField(field: keyof SeoFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (isLoading) return <TableSkeleton rows={5} cols={4} />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Настройки", href: "/admin/settings" }, { label: "SEO" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SEO настройки</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Добавить страницу</Button>
      </div>

      {pages.length === 0 ? (
        <EmptyState title="Нет SEO страниц" actionLabel="Добавить страницу" onAction={openNew} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p) => (
                <TableRow key={p.slug}>
                  <TableCell className="font-medium">{p.slug}</TableCell>
                  <TableCell className="max-w-48 truncate">{p.title || "—"}</TableCell>
                  <TableCell className="max-w-64 truncate">{p.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(data?.total ?? 0) > perPage && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
          <span className="text-sm text-muted-foreground py-2">Стр. {page} из {totalPages(data?.total ?? 0, perPage)}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages(data?.total ?? 0, perPage)} onClick={() => setPage((p) => p + 1)}>Вперёд</Button>
        </div>
      )}

      {/* Create/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlug ? `SEO — ${editingSlug}` : "Новая SEO страница"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingSlug && (
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="home, about, contacts..." />
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>OG Title</Label>
              <Input value={form.og_title} onChange={(e) => updateField("og_title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>OG Description</Label>
              <Textarea value={form.og_description} onChange={(e) => updateField("og_description", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input value={form.og_image_url} onChange={(e) => updateField("og_image_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>OG URL</Label>
                <Input value={form.og_url} onChange={(e) => updateField("og_url", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>OG Type</Label>
                <Input value={form.og_type} onChange={(e) => updateField("og_type", e.target.value)} placeholder="website" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Twitter Card</Label>
                <Input value={form.twitter_card} onChange={(e) => updateField("twitter_card", e.target.value)} placeholder="summary_large_image" />
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input value={form.canonical_url} onChange={(e) => updateField("canonical_url", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleModalClose(false)}>Отмена</Button>
            <Button
              disabled={saveMutation.isPending || (!editingSlug && !form.slug.trim())}
              onClick={() => saveMutation.mutate()}
            >
              {editingSlug ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить SEO страницу?"
        description={`SEO настройки для «${deleteTarget?.slug}» будут удалены.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
      />
    </div>
  );
}
