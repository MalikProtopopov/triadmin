"use client";

import { useState } from "react";
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
import Link from "next/link";
import api from "@/lib/api";
import type { OrgDocument } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, GripVertical, FileText } from "lucide-react";
import { toast } from "sonner";

function SortableDocCard({
  doc,
  onDelete,
  onToggle,
}: {
  doc: OrgDocument;
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
            <p className="text-xs text-muted-foreground font-mono">{doc.slug}</p>
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
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/admin/content/documents/${doc.id}/edit`}>
            <Pencil className="h-3 w-3" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(doc)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OrgDocumentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<OrgDocument | null>(null);

  const { data: docs, isLoading, error, refetch } = useQuery<OrgDocument[]>({
    queryKey: ["org-documents"],
    queryFn: () => api.get("/admin/organization-documents").then((r) => r.data.data || r.data),
  });

  const toggleDoc = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
      const fd = new FormData();
      fd.append("is_active", String(is_active));
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

  if (isLoading) return <TableSkeleton rows={5} cols={3} />;
  if (error) return <ErrorState onRetry={refetch} />;

  const sorted = [...(docs || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Контент" }, { label: "Документы организации" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Документы организации</h1>
        <Button asChild>
          <Link href="/admin/content/documents/new">
            <Plus className="mr-2 h-4 w-4" /> Создать
          </Link>
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="Нет документов" actionLabel="Создать документ" onAction={() => router.push("/admin/content/documents/new")} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sorted.map((doc) => (
                <SortableDocCard
                  key={doc.id}
                  doc={doc}
                  onDelete={setDeleteTarget}
                  onToggle={(id, v) => toggleDoc.mutate({ id, is_active: v })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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
