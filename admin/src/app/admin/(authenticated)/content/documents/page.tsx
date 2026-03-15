"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "@/lib/api";
import type { OrgDocument } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { FileUpload } from "@/components/shared/FileUpload";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Pencil, Trash2, GripVertical, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

function SortableDocCard({
  doc,
  onEdit,
  onDelete,
  onToggle,
}: {
  doc: OrgDocument;
  onEdit: (d: OrgDocument) => void;
  onDelete: (d: OrgDocument) => void;
  onToggle: (id: string, v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <CardContent className="py-3 flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{doc.title}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{doc.slug}</p>
            {doc.file_url && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" /> PDF
              </span>
            )}
          </div>
        </div>
        <Switch
          checked={doc.is_active}
          onCheckedChange={(v) => onToggle(doc.id, v)}
          className="shrink-0"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(doc)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(doc)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OrgDocumentsPage() {
  const queryClient = useQueryClient();
  const [editDoc, setEditDoc] = useState<OrgDocument | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrgDocument | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const initialTitleRef = useRef("");
  const initialContentRef = useRef("");

  const { data: docs, isLoading, error, refetch } = useQuery<OrgDocument[]>({
    queryKey: ["org-documents"],
    queryFn: () => api.get("/admin/organization-documents").then((r) => r.data.data || r.data),
  });

  function buildFormData(jsonBody: Record<string, unknown>, file: File | null): globalThis.FormData {
    const fd = new globalThis.FormData();
    fd.append("body", new Blob([JSON.stringify(jsonBody)], { type: "application/json" }));
    if (file) fd.append("file", file);
    return fd;
  }

  const createDoc = useMutation({
    mutationFn: () => {
      const fd = buildFormData(
        { title: formTitle, ...(formSlug.trim() ? { slug: formSlug.trim() } : {}), content: formContent || null, is_active: true },
        formFile
      );
      return api.post("/admin/organization-documents", fd, {
        headers: { "Content-Type": undefined },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-documents"] });
      toast.success("Документ создан");
      setNewOpen(false);
      resetForm();
    },
  });

  const updateDoc = useMutation({
    mutationFn: (id: string) => {
      const fd = buildFormData(
        { title: formTitle, ...(formSlug.trim() ? { slug: formSlug.trim() } : {}), content: formContent || null },
        formFile
      );
      return api.patch(`/admin/organization-documents/${id}`, fd, {
        headers: { "Content-Type": undefined },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-documents"] });
      toast.success("Документ обновлён");
      setEditDoc(null);
      resetForm();
    },
  });

  const toggleDoc = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
      const fd = buildFormData({ is_active }, null);
      return api.patch(`/admin/organization-documents/${id}`, fd, {
        headers: { "Content-Type": undefined },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-documents"] }),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/organization-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-documents"] });
      toast.success("Документ удалён");
      setDeleteTarget(null);
    },
  });

  const reorderDocs = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      api.patch("/admin/organization-documents/reorder", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-documents"] });
      toast.success("Порядок обновлён");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !docs) return;
    const sortedDocs = [...docs].sort((a, b) => a.sort_order - b.sort_order);
    const oldIndex = sortedDocs.findIndex((d) => d.id === active.id);
    const newIndex = sortedDocs.findIndex((d) => d.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sortedDocs, oldIndex, newIndex);
    reorderDocs.mutate(reordered.map((d, i) => ({ id: d.id, sort_order: i })));
  }

  function resetForm() {
    setFormTitle("");
    setFormSlug("");
    setFormContent("");
    setFormFile(null);
  }

  function isModalDirty() {
    return formTitle !== initialTitleRef.current || formContent !== initialContentRef.current || !!formFile;
  }

  function handleModalClose() {
    if (isModalDirty()) {
      if (!window.confirm("У вас есть несохранённые изменения. Закрыть без сохранения?")) return;
    }
    setNewOpen(false);
    setEditDoc(null);
  }

  function openEdit(doc: OrgDocument) {
    setFormTitle(doc.title);
    setFormSlug(doc.slug || "");
    setFormContent(doc.content || "");
    setFormFile(null);
    initialTitleRef.current = doc.title;
    initialContentRef.current = doc.content || "";
    setEditDoc(doc);
  }

  function openNew() {
    resetForm();
    initialTitleRef.current = "";
    initialContentRef.current = "";
    setNewOpen(true);
  }

  if (isLoading) return <TableSkeleton rows={5} cols={3} />;
  if (error) return <ErrorState onRetry={refetch} />;

  const sorted = [...(docs || [])].sort((a, b) => a.sort_order - b.sort_order);

  const hasContentOrFile = !!formContent.trim() || !!formFile || !!(editDoc?.file_url);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Контент" }, { label: "Документы организации" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Документы организации</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Создать</Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="Нет документов" actionLabel="Создать документ" onAction={openNew} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sorted.map((doc) => (
                <SortableDocCard
                  key={doc.id}
                  doc={doc}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={(id, v) => toggleDoc.mutate({ id, is_active: v })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* New/Edit dialog */}
      <Dialog open={newOpen || !!editDoc} onOpenChange={(o) => { if (!o) handleModalClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDoc ? "Редактировать документ" : "Новый документ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="Оставьте пустым для автогенерации"
                />
                <p className="text-xs text-muted-foreground">Допустимы: a-z, 0-9, дефис</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Содержимое</Label>
              <RichTextEditor content={formContent} onChange={setFormContent} />
            </div>
            <div className="space-y-2">
              <Label>PDF файл</Label>
              <FileUpload
                accept={{ "application/pdf": [".pdf"] }}
                maxSize={20 * 1024 * 1024}
                value={formFile}
                onChange={(f) => setFormFile(f as File | null)}
                hint="PDF, до 20 МБ"
              />
              {editDoc?.file_url && !formFile && (
                <p className="text-xs text-muted-foreground">PDF уже загружен. Выберите новый файл для замены.</p>
              )}
            </div>
            {!hasContentOrFile && (
              <p className="text-xs text-destructive">Укажите содержимое или загрузите PDF файл</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>Отмена</Button>
            <Button
              disabled={!formTitle.trim() || !hasContentOrFile || createDoc.isPending || updateDoc.isPending}
              onClick={() => editDoc ? updateDoc.mutate(editDoc.id) : createDoc.mutate()}
            >
              {(createDoc.isPending || updateDoc.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editDoc ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить документ?"
        description={`Документ «${deleteTarget?.title}» будет удалён безвозвратно.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteDoc.isPending}
        onConfirm={() => deleteTarget && deleteDoc.mutate(deleteTarget.id)}
      />
    </div>
  );
}
