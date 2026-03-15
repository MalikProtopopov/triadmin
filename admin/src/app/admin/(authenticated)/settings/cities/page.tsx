"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { City } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

export default function CitiesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [inlineEdit, setInlineEdit] = useState<City | null>(null);
  const [inlineName, setInlineName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null);
  const [name, setName] = useState("");

  const { data: cities, isLoading, error, refetch } = useQuery<City[]>({
    queryKey: ["admin-cities"],
    queryFn: () => api.get("/admin/cities").then((r) => r.data.data || r.data),
  });

  const createCity = useMutation({
    mutationFn: () => api.post("/admin/cities", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      toast.success("Город добавлен");
      closeDialog();
    },
  });

  const updateCity = useMutation({
    mutationFn: ({ id, name: n }: { id: string; name: string }) => api.patch(`/admin/cities/${id}`, { name: n }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      toast.success("Город обновлён");
      closeDialog();
      setInlineEdit(null);
    },
  });

  const toggleCity = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/admin/cities/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cities"] }),
  });

  const deleteCity = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      toast.success("Город удалён");
      setDeleteTarget(null);
    },
  });

  function openNew() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(city: City) {
    setEditing(city);
    setName(city.name);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setName("");
  }

  function startInlineEdit(city: City) {
    setInlineEdit(city);
    setInlineName(city.name);
  }

  function saveInlineEdit() {
    if (inlineEdit && inlineName.trim()) {
      updateCity.mutate({ id: inlineEdit.id, name: inlineName.trim() });
    }
  }

  if (isLoading) return <TableSkeleton rows={5} cols={3} />;
  if (error) return <ErrorState onRetry={refetch} />;

  const sorted = [...(cities || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Настройки", href: "/admin/settings" }, { label: "Города" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Города</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Добавить</Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="Нет городов" actionLabel="Добавить город" onAction={openNew} />
      ) : (
        <div className="space-y-2">
          {sorted.map((city) => (
            <Card key={city.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {inlineEdit?.id === city.id ? (
                    <Input
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      onBlur={saveInlineEdit}
                      onKeyDown={(e) => e.key === "Enter" && saveInlineEdit()}
                      className="h-8 font-medium"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span
                        className="font-medium text-sm cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
                        onClick={() => startInlineEdit(city)}
                      >
                        {city.name}
                      </span>
                      {city.slug && (
                        <p className="text-xs text-muted-foreground font-mono">/{city.slug}</p>
                      )}
                      {city.doctors_count != null && (
                        <p className="text-xs text-muted-foreground">Врачей: {city.doctors_count}</p>
                      )}
                    </div>
                  )}
                </div>
                <Switch
                  checked={city.is_active}
                  onCheckedChange={(v) => toggleCity.mutate({ id: city.id, is_active: v })}
                  className="shrink-0"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(city)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(city)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Редактировать город" : "Новый город"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button
              disabled={!name.trim() || createCity.isPending || updateCity.isPending}
              onClick={() => editing ? updateCity.mutate({ id: editing.id, name }) : createCity.mutate()}
            >
              {(createCity.isPending || updateCity.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить город?"
        description={deleteTarget ? `Город «${deleteTarget.name}» будет удалён. Если к нему привязаны врачи, он будет деактивирован вместо удаления.` : ""}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteCity.isPending}
        onConfirm={() => deleteTarget && deleteCity.mutate(deleteTarget.id)}
      />
    </div>
  );
}
