"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { EventTariff } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface TariffFormData {
  name: string;
  description: string;
  conditions: string;
  details: string;
  price: number | "";
  member_price: number | "";
  benefits: string[];
  seats_limit: number | null;
  sort_order: number | "";
  is_active: boolean;
}

const EMPTY_TARIFF: TariffFormData = {
  name: "", description: "", conditions: "", details: "",
  price: "", member_price: "", benefits: [], seats_limit: null, sort_order: "",
  is_active: true,
};

interface TariffSectionProps {
  eventId: string;
  tariffs: EventTariff[];
  isEditing: boolean;
}

export function TariffSection({ eventId, tariffs, isEditing }: TariffSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TariffFormData>(EMPTY_TARIFF);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventTariff | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_TARIFF);
    setModalOpen(true);
  }

  function openEdit(t: EventTariff) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || "",
      conditions: t.conditions ?? "",
      details: t.details ?? "",
      price: t.price,
      member_price: t.member_price,
      benefits: t.benefits,
      seats_limit: t.seats_limit,
      sort_order: t.sort_order ?? 0,
      is_active: t.is_active !== false,
    });
    setModalOpen(true);
  }

  async function save() {
    if (form.price === "" || form.member_price === "") {
      toast.error("Укажите цену и цену для резидентов");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        conditions: form.conditions || null,
        details: form.details || null,
        price: form.price,
        member_price: form.member_price,
        benefits: form.benefits.filter(Boolean),
        seats_limit: form.seats_limit,
        sort_order: form.sort_order === "" ? 0 : form.sort_order,
      };
      if (editingId) {
        payload.is_active = form.is_active;
        await api.patch(`/admin/events/${eventId}/tariffs/${editingId}`, payload);
        toast.success("Тариф обновлён");
      } else {
        await api.post(`/admin/events/${eventId}/tariffs`, payload);
        toast.success("Тариф создан");
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    } catch { /* handled by interceptor */ }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/events/${eventId}/tariffs/${deleteTarget.id}`);
      toast.success("Тариф удалён");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    } catch { /* handled by interceptor */ }
    finally { setDeleting(false); }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Тарифы</CardTitle>
          {isEditing && (
            <Button type="button" variant="outline" size="sm" onClick={openNew}>
              <Plus className="mr-1 h-3 w-3" /> Добавить тариф
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <p className="text-sm text-muted-foreground">Сохраните мероприятие, чтобы добавить тарифы</p>
          ) : tariffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Добавьте хотя бы один тариф для платного мероприятия</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Для резидентов</TableHead>
                  <TableHead>Мест</TableHead>
                  <TableHead>Активен</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tariffs.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.price.toLocaleString("ru-RU")} ₽</TableCell>
                    <TableCell>{t.member_price.toLocaleString("ru-RU")} ₽</TableCell>
                    <TableCell>{t.seats_limit ? `${t.seats_taken}/${t.seats_limit}` : "∞"}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.is_active !== false ? "active" : "inactive"} label={t.is_active !== false ? "Да" : "Нет"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setForm(EMPTY_TARIFF); setModalOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать тариф" : "Новый тариф"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Стандарт, VIP, Онлайн..." />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Условия</Label>
              <Textarea value={form.conditions} onChange={(e) => setForm((p) => ({ ...p, conditions: e.target.value }))} rows={2} placeholder="Для членов ассоциации, студентов..." />
            </div>
            <div className="space-y-2">
              <Label>Доп. детали</Label>
              <Textarea value={form.details} onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))} rows={2} placeholder="Запись включена, без питания..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Цена, ₽ *</Label>
                <Input type="number" min={0} placeholder="0" value={form.price === "" ? "" : form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Цена для резидентов, ₽ *</Label>
                <Input type="number" min={0} placeholder="0" value={form.member_price === "" ? "" : form.member_price} onChange={(e) => setForm((p) => ({ ...p, member_price: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Лимит мест</Label>
                <Input type="number" placeholder="Без ограничений" value={form.seats_limit ?? ""} onChange={(e) => setForm((p) => ({ ...p, seats_limit: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input type="number" placeholder="0" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
            </div>
            {editingId && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tariff-is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked === true }))}
                />
                <Label htmlFor="tariff-is_active" className="text-sm font-normal">Тариф активен (доступен для покупки)</Label>
              </div>
            )}
            <div className="space-y-2">
              <Label>Преимущества</Label>
              <div className="space-y-2">
                {form.benefits.map((b, bi) => (
                  <div key={bi} className="flex gap-2">
                    <Input
                      value={b}
                      onChange={(e) => {
                        const newBenefits = [...form.benefits];
                        newBenefits[bi] = e.target.value;
                        setForm((p) => ({ ...p, benefits: newBenefits }));
                      }}
                      placeholder="Пункт преимущества"
                    />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setForm((p) => ({ ...p, benefits: p.benefits.filter((_, idx) => idx !== bi) }))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, benefits: [...p.benefits, ""] }))}>
                  <Plus className="mr-1 h-3 w-3" /> Добавить пункт
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button type="button" disabled={saving || !form.name.trim()} onClick={save}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить тариф?"
        description={`Тариф «${deleteTarget?.name}» будет удалён. Это действие нельзя отменить.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
