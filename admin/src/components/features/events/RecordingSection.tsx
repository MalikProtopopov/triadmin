"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { EventRecording } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FileUpload } from "@/components/shared/FileUpload";
import { Loader2, Plus, Pencil, Video, Upload } from "lucide-react";
import { toast } from "sonner";

interface RecordingFormData {
  title: string;
  video_source: "uploaded" | "external";
  video_url: string;
  video_file: File | null;
  access_level: string;
  recording_status: string;
  duration_seconds: number | null;
}

const EMPTY_RECORDING: RecordingFormData = {
  title: "", video_source: "external", video_url: "", video_file: null,
  access_level: "public", recording_status: "hidden", duration_seconds: null,
};

interface RecordingSectionProps {
  eventId: string;
  recordings: EventRecording[];
}

export function RecordingSection({ eventId, recordings }: RecordingSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RecordingFormData>(EMPTY_RECORDING);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_RECORDING);
    setModalOpen(true);
  }

  function openEdit(r: EventRecording) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      video_source: r.video_source as "uploaded" | "external",
      video_url: r.video_url || "",
      video_file: null,
      access_level: r.access_level,
      recording_status: r.status,
      duration_seconds: r.duration_seconds ?? null,
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/events/${eventId}/recordings/${editingId}`, {
          title: form.title,
          video_source: form.video_source,
          video_url: form.video_source === "external" ? form.video_url : undefined,
          duration_seconds: form.duration_seconds,
          access_level: form.access_level,
          status: form.recording_status,
        });
        toast.success("Запись обновлена");
      } else {
        const fd = new FormData();
        fd.append("title", form.title || "Запись");
        fd.append("video_source", form.video_source);
        fd.append("access_level", form.access_level);
        fd.append("recording_status", form.recording_status);
        if (form.video_source === "external" && form.video_url) {
          fd.append("video_url", form.video_url);
        }
        if (form.video_source === "uploaded" && form.video_file) {
          fd.append("video_file", form.video_file);
        }
        if (form.duration_seconds != null) {
          fd.append("duration_seconds", String(form.duration_seconds));
        }
        await api.post(`/admin/events/${eventId}/recordings`, fd);
        toast.success("Запись добавлена");
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    } catch { /* handled by interceptor */ }
    finally { setSaving(false); }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Записи конференции</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openNew}>
            <Plus className="mr-1 h-3 w-3" /> Добавить запись
          </Button>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет записей</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Доступ</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-16">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      {r.video_source === "external" ? (
                        <span className="inline-flex items-center gap-1 text-xs"><Video className="h-3 w-3" /> Внешнее</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs"><Upload className="h-3 w-3" /> Загружено</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.duration_seconds ? `${Math.floor(r.duration_seconds / 60)}:${String(r.duration_seconds % 60).padStart(2, "0")}` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.access_level} label={r.access_level === "public" ? "Всем" : r.access_level === "members_only" ? "Членам" : "Участникам"} />
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setForm(EMPTY_RECORDING); setModalOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Редактировать запись" : "Добавить запись"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Доклад: ..." />
            </div>
            <div className="space-y-2">
              <Label>Источник видео</Label>
              <Select value={form.video_source} onValueChange={(v: "uploaded" | "external") => setForm((p) => ({ ...p, video_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">Внешняя ссылка</SelectItem>
                  <SelectItem value="uploaded">Загрузить видео</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.video_source === "uploaded" && !editingId ? (
              <FileUpload
                accept={{ "video/*": [".mp4", ".webm", ".mov"] }}
                maxSize={2 * 1024 * 1024 * 1024}
                value={form.video_file}
                onChange={(f) => setForm((p) => ({ ...p, video_file: f as File | null }))}
                hint="MP4, WebM, MOV, до 2 ГБ"
              />
            ) : form.video_source === "external" ? (
              <div className="space-y-2">
                <Label>URL видео</Label>
                <Input value={form.video_url} onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://..." />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Уровень доступа</Label>
                <Select value={form.access_level} onValueChange={(v) => setForm((p) => ({ ...p, access_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Всем</SelectItem>
                    <SelectItem value="members_only">Членам</SelectItem>
                    <SelectItem value="participants_only">Участникам</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={form.recording_status} onValueChange={(v) => setForm((p) => ({ ...p, recording_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hidden">Скрыта</SelectItem>
                    <SelectItem value="published">Опубликована</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Длительность (секунды)</Label>
              <Input type="number" min={0} value={form.duration_seconds ?? ""} onChange={(e) => setForm((p) => ({ ...p, duration_seconds: e.target.value ? Number(e.target.value) : null }))} placeholder="3600" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button
              type="button"
              disabled={saving || !form.title.trim() || (form.video_source === "external" && !editingId && !form.video_url.trim())}
              onClick={save}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
