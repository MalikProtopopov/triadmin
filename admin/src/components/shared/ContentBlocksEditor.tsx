"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { ContentBlock, ContentBlockType, DeviceType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Plus, Trash2, GripVertical, Pencil, Type, ImageIcon, Video, LayoutGrid, LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  text: "Текст",
  image: "Изображение",
  video: "Видео",
  gallery: "Галерея",
  link: "Ссылка",
};

const BLOCK_TYPE_ICONS: Record<ContentBlockType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  gallery: <LayoutGrid className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  both: "Все устройства",
  mobile: "Мобильные",
  desktop: "Десктоп",
};

interface BlockFormData {
  block_type: ContentBlockType;
  title: string;
  content: string;
  media_url: string;
  thumbnail_url: string;
  link_url: string;
  link_label: string;
  device_type: DeviceType;
}

const EMPTY_FORM: BlockFormData = {
  block_type: "text",
  title: "",
  content: "",
  media_url: "",
  thumbnail_url: "",
  link_url: "",
  link_label: "",
  device_type: "both",
};

function blockPreview(block: ContentBlock): string {
  switch (block.block_type) {
    case "text":
      return block.content ? block.content.replace(/<[^>]+>/g, "").slice(0, 80) : "Пустой текст";
    case "image":
      return block.media_url || "Нет изображения";
    case "video":
      return block.media_url || "Нет видео";
    case "gallery":
      return block.media_url || "Нет медиа";
    case "link":
      return block.link_url || "Нет ссылки";
    default:
      return "";
  }
}

function SortableBlockCard({
  block,
  onEdit,
  onDelete,
}: {
  block: ContentBlock;
  onEdit: (b: ContentBlock) => void;
  onDelete: (b: ContentBlock) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`border rounded-lg p-3 flex items-center gap-3 ${isDragging ? "opacity-50" : ""}`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {BLOCK_TYPE_ICONS[block.block_type]}
        <Badge variant="outline" className="text-xs">{BLOCK_TYPE_LABELS[block.block_type]}</Badge>
      </div>
      <div className="flex-1 min-w-0">
        {block.title && <p className="text-sm font-medium truncate">{block.title}</p>}
        <p className="text-xs text-muted-foreground truncate">{blockPreview(block)}</p>
      </div>
      {block.device_type !== "both" && (
        <Badge variant="secondary" className="text-xs shrink-0">{DEVICE_LABELS[block.device_type]}</Badge>
      )}
      <div className="flex gap-1 shrink-0">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(block)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(block)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface ContentBlocksEditorProps {
  entityType: string;
  entityId: string;
  initialBlocks?: ContentBlock[];
}

export function ContentBlocksEditor({ entityType, entityId, initialBlocks }: ContentBlocksEditorProps) {
  const queryClient = useQueryClient();
  const queryKey = ["content-blocks", entityType, entityId];
  const hasInitialData = initialBlocks !== undefined;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [form, setForm] = useState<BlockFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ContentBlock | null>(null);

  const { data: blocks = [] } = useQuery<ContentBlock[]>({
    queryKey,
    queryFn: () =>
      api.get(`/admin/content-blocks?entity_type=${entityType}&entity_id=${entityId}&locale=ru`).then((r) => r.data.data || r.data),
    enabled: !hasInitialData,
    initialData: hasInitialData ? initialBlocks : undefined,
  });

  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  const createBlock = useMutation({
    mutationFn: (data: Partial<ContentBlock>) =>
      api.post("/admin/content-blocks", { ...data, entity_type: entityType, entity_id: entityId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (hasInitialData) queryClient.refetchQueries({ queryKey });
      toast.success("Блок добавлен");
      setModalOpen(false);
    },
  });

  const updateBlock = useMutation({
    mutationFn: ({ id, ...data }: Partial<ContentBlock> & { id: string }) =>
      api.patch(`/admin/content-blocks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (hasInitialData) queryClient.refetchQueries({ queryKey });
      toast.success("Блок обновлён");
      setModalOpen(false);
      setEditingBlock(null);
    },
  });

  const deleteBlock = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/content-blocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (hasInitialData) queryClient.refetchQueries({ queryKey });
      toast.success("Блок удалён");
      setDeleteTarget(null);
    },
  });

  const reorderBlocks = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      api.post("/admin/content-blocks/reorder", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (hasInitialData) queryClient.refetchQueries({ queryKey });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id);
    const newIndex = sortedBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sortedBlocks, oldIndex, newIndex);
    reorderBlocks.mutate(reordered.map((b, i) => ({ id: b.id, sort_order: i })));
  }

  function openCreate(type: ContentBlockType) {
    setEditingBlock(null);
    setForm({ ...EMPTY_FORM, block_type: type });
    setModalOpen(true);
  }

  function openEdit(block: ContentBlock) {
    setEditingBlock(block);
    setForm({
      block_type: block.block_type,
      title: block.title || "",
      content: block.content || "",
      media_url: block.media_url || "",
      thumbnail_url: block.thumbnail_url || "",
      link_url: block.link_url || "",
      link_label: block.link_label || "",
      device_type: block.device_type,
    });
    setModalOpen(true);
  }

  function handleSave() {
    const payload: Partial<ContentBlock> = {
      block_type: form.block_type,
      title: form.title || null,
      content: form.content || null,
      media_url: form.media_url || null,
      thumbnail_url: form.thumbnail_url || null,
      link_url: form.link_url || null,
      link_label: form.link_label || null,
      device_type: form.device_type,
    };

    if (editingBlock) {
      updateBlock.mutate({ id: editingBlock.id, ...payload });
    } else {
      createBlock.mutate({ ...payload, sort_order: blocks.length });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Контентные блоки</CardTitle>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(BLOCK_TYPE_LABELS) as ContentBlockType[]).map((type) => (
            <Button key={type} type="button" variant="outline" size="sm" onClick={() => openCreate(type)}>
              <Plus className="mr-1 h-3 w-3" /> {BLOCK_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {sortedBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет контентных блоков. Добавьте первый, используя кнопки выше.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedBlocks.map((block) => (
                  <SortableBlockCard key={block.id} block={block} onEdit={openEdit} onDelete={setDeleteTarget} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setEditingBlock(null); } setModalOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? `Редактировать: ${BLOCK_TYPE_LABELS[form.block_type]}` : `Новый блок: ${BLOCK_TYPE_LABELS[form.block_type]}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Необязательно" />
            </div>

            <div className="space-y-2">
              <Label>Устройства</Label>
              <Select value={form.device_type} onValueChange={(v) => setForm((p) => ({ ...p, device_type: v as DeviceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Все устройства</SelectItem>
                  <SelectItem value="mobile">Мобильные</SelectItem>
                  <SelectItem value="desktop">Десктоп</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.block_type === "text" && (
              <div className="space-y-2">
                <Label>Содержимое</Label>
                <RichTextEditor content={form.content} onChange={(html) => setForm((p) => ({ ...p, content: html }))} />
              </div>
            )}

            {form.block_type === "image" && (
              <>
                <div className="space-y-2">
                  <Label>URL изображения</Label>
                  <Input value={form.media_url} onChange={(e) => setForm((p) => ({ ...p, media_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Alt-текст</Label>
                  <Input value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Описание изображения" />
                </div>
              </>
            )}

            {form.block_type === "video" && (
              <>
                <div className="space-y-2">
                  <Label>URL видео</Label>
                  <Input value={form.media_url} onChange={(e) => setForm((p) => ({ ...p, media_url: e.target.value }))} placeholder="https://youtube.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>URL превью</Label>
                  <Input value={form.thumbnail_url} onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))} placeholder="https://..." />
                </div>
              </>
            )}

            {form.block_type === "gallery" && (
              <div className="space-y-2">
                <Label>URL медиа</Label>
                <Input value={form.media_url} onChange={(e) => setForm((p) => ({ ...p, media_url: e.target.value }))} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">Множественная загрузка будет доступна после реализации API</p>
              </div>
            )}

            {form.block_type === "link" && (
              <>
                <div className="space-y-2">
                  <Label>URL ссылки</Label>
                  <Input value={form.link_url} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Текст ссылки</Label>
                  <Input value={form.link_label} onChange={(e) => setForm((p) => ({ ...p, link_label: e.target.value }))} placeholder="Перейти" />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={2} placeholder="Краткое описание ссылки" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={createBlock.isPending || updateBlock.isPending}>
              {(createBlock.isPending || updateBlock.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBlock ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить блок?"
        description={`Блок «${BLOCK_TYPE_LABELS[deleteTarget?.block_type || "text"]}» будет удалён.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteBlock.isPending}
        onConfirm={() => deleteTarget && deleteBlock.mutate(deleteTarget.id)}
      />
    </Card>
  );
}
