"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Plan, PlanType } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { ExportXlsxButton } from "@/components/shared/ExportXlsxButton";
import type { ExportQueryValue } from "@/lib/exportDownload";

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formPrice, setFormPrice] = useState<number | "">(0);
  const [formDuration, setFormDuration] = useState<number | "">(12);
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState<number | "">(0);
  const [formPlanType, setFormPlanType] = useState<PlanType>("subscription");
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [subscriptionsExportRange, setSubscriptionsExportRange] = useState<DateRange | undefined>();

  const { data: plans, isLoading, error, refetch } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => api.get("/admin/plans").then((r) => r.data.data || r.data),
  });

  const createPlan = useMutation({
    mutationFn: () => {
      if (formPrice === "" || (typeof formPrice === "number" && formPrice <= 0)) {
        toast.error("Укажите цену больше 0");
        return Promise.reject(new Error("validation"));
      }
      return api.post("/admin/plans", {
        code: formCode,
        name: formName,
        price: formPrice,
        duration_months: formDuration === "" || (typeof formDuration === "number" && formDuration < 1) ? 12 : formDuration,
        description: formDescription || null,
        is_active: formActive,
        sort_order: formSortOrder === "" ? 0 : formSortOrder,
        plan_type: formPlanType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Тариф добавлен");
      setAddOpen(false);
      resetPlanForm();
    },
  });

  const updatePlan = useMutation({
    mutationFn: (id: string) => {
      if (formPrice === "" || (typeof formPrice === "number" && formPrice <= 0)) {
        toast.error("Укажите цену больше 0");
        return Promise.reject(new Error("validation"));
      }
      return api.patch(`/admin/plans/${id}`, {
        name: formName,
        price: formPrice,
        duration_months: formDuration === "" || (typeof formDuration === "number" && formDuration < 1) ? 12 : formDuration,
        description: formDescription || null,
        is_active: formActive,
        sort_order: formSortOrder === "" ? 0 : formSortOrder,
        plan_type: formPlanType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Тариф обновлён");
      setEditPlan(null);
    },
  });

  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Тариф удалён");
      setDeleteTarget(null);
    },
  });

  function resetPlanForm() {
    setFormName("");
    setFormCode("");
    setFormPrice(0);
    setFormDuration(12);
    setFormDescription("");
    setFormActive(true);
    setFormSortOrder(0);
    setFormPlanType("subscription");
  }

  function openEdit(plan: Plan) {
    setFormName(plan.name);
    setFormPrice(plan.price);
    setFormDuration(plan.duration_months);
    setFormDescription(plan.description || "");
    setFormActive(plan.is_active);
    setFormSortOrder(plan.sort_order);
    setFormPlanType(plan.plan_type || "subscription");
    setEditPlan(plan);
  }

  function openAdd() {
    resetPlanForm();
    setAddOpen(true);
  }

  if (isLoading) return <TableSkeleton rows={4} cols={5} />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Настройки", href: "/admin/settings" }, { label: "Тарифы" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Тарифы подписки</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Добавить тариф</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <span className="text-sm text-muted-foreground">Выгрузка подписок и взносов (XLSX):</span>
        <DateRangePicker
          value={subscriptionsExportRange}
          onChange={setSubscriptionsExportRange}
          placeholder="Период (необязательно)"
        />
        <ExportXlsxButton
          exportPath="/exports/subscriptions"
          label="Скачать XLSX"
          buildParams={() => {
            const p: Record<string, ExportQueryValue> = {};
            if (subscriptionsExportRange?.from) p.date_from = format(subscriptionsExportRange.from, "yyyy-MM-dd");
            if (subscriptionsExportRange?.to) p.date_to = format(subscriptionsExportRange.to, "yyyy-MM-dd");
            return p;
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(plans || []).map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{plan.name}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {plan.is_active ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(plan)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground cursor-not-allowed">
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Тариф уже деактивирован — его нельзя удалить</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold">{plan.price.toLocaleString("ru-RU")} ₽</p>
              <p className="text-sm text-muted-foreground">{plan.duration_months} мес.</p>
              <p className="text-xs text-muted-foreground">Код: {plan.code}</p>
              <div className="flex gap-1.5 flex-wrap">
                <StatusBadge status={plan.plan_type || "subscription"} />
                <StatusBadge status={plan.is_active ? "active" : "deactivated"} />
              </div>
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {plans && plans.filter((p) => p.plan_type === "entry_fee" && p.is_active).length !== 1 && (
        <p className="text-sm text-amber-600 font-medium">Должен быть ровно один активный план со вступительным взносом.</p>
      )}

      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать тариф</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Код</Label>
                <Input value={editPlan?.code || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Тип плана</Label>
                <Select value={formPlanType} onValueChange={(v) => setFormPlanType(v as PlanType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Подписка</SelectItem>
                    <SelectItem value="entry_fee">Вступительный взнос</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Цена, ₽</Label>
                <Input
                  type="number"
                  min={0}
                  value={formPrice === "" ? "" : formPrice}
                  onChange={(e) => setFormPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Срок, мес.</Label>
                <Input
                  type="number"
                  min={1}
                  value={formDuration === "" ? "" : formDuration}
                  onChange={(e) => setFormDuration(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input type="number" placeholder="0" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch id="edit-plan-active" checked={formActive} onCheckedChange={setFormActive} className="shrink-0" />
                <Label htmlFor="edit-plan-active" className="cursor-pointer">Активен</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Отмена</Button>
            <Button disabled={!formName || updatePlan.isPending} onClick={() => editPlan && updatePlan.mutate(editPlan.id)}>
              {updatePlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить тариф</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Код</Label>
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="annual" />
              </div>
              <div className="space-y-2">
                <Label>Тип плана</Label>
                <Select value={formPlanType} onValueChange={(v) => setFormPlanType(v as PlanType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Подписка</SelectItem>
                    <SelectItem value="entry_fee">Вступительный взнос</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Цена, ₽</Label>
                <Input
                  type="number"
                  min={0}
                  value={formPrice === "" ? "" : formPrice}
                  onChange={(e) => setFormPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Срок, мес.</Label>
                <Input
                  type="number"
                  min={1}
                  value={formDuration === "" ? "" : formDuration}
                  onChange={(e) => setFormDuration(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input type="number" placeholder="0" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch id="add-plan-active" checked={formActive} onCheckedChange={setFormActive} className="shrink-0" />
                <Label htmlFor="add-plan-active" className="cursor-pointer">Активен</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button disabled={!formName || !formCode || createPlan.isPending} onClick={() => createPlan.mutate()}>
              {createPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить тариф?"
        description={`Тариф «${deleteTarget?.name}» будет удалён.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deletePlan.isPending}
        onConfirm={() => deleteTarget && deletePlan.mutate(deleteTarget.id)}
      />
    </div>
  );
}
