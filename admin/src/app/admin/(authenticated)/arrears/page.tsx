"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { ArrearItem, ArrearsSummary, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CreateArrearDialog,
  EditArrearDialog,
  WaiveArrearDialog,
  ConfirmArrearDialog,
} from "@/components/features/arrears/ArrearDialogs";
import { format } from "date-fns";
import { toast } from "sonner";
import { totalPages } from "@/lib/pagination";
import { Plus, X } from "lucide-react";

function parseSummary(raw: unknown): ArrearsSummary | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  return (inner != null && typeof inner === "object" ? inner : o) as ArrearsSummary;
}

export default function ArrearsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  /** Когда статус «все»: true = include_inactive (все строки), false = только open */
  const [includeAllStatuses, setIncludeAllStatuses] = useState(true);
  const [year, setYear] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterUserSearch, setFilterUserSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editArrear, setEditArrear] = useState<ArrearItem | null>(null);
  const [waiveArrear, setWaiveArrear] = useState<ArrearItem | null>(null);
  const [confirmState, setConfirmState] = useState<{
    kind: "cancel" | "markPaid";
    arrear: ArrearItem;
  } | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(perPage));
    p.set("offset", String((page - 1) * perPage));
    if (statusFilter !== "all") {
      p.set("status", statusFilter);
    } else if (!includeAllStatuses) {
      p.set("include_inactive", "false");
    }
    if (year.trim()) {
      const y = parseInt(year.trim(), 10);
      if (Number.isFinite(y) && y >= 2000 && y <= 2100) {
        p.set("year", String(y));
      }
    }
    if (filterUserId) p.set("user_id", filterUserId);
    return p.toString();
  }, [page, perPage, statusFilter, includeAllStatuses, year, filterUserId]);

  const { data: userHints } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["portal-users-arrears", filterUserSearch],
    queryFn: () =>
      api.get(`/admin/portal-users?search=${encodeURIComponent(filterUserSearch)}&limit=10`).then((r) => r.data),
    enabled: filterUserSearch.length >= 2 && !filterUserId,
  });

  const { data: listRaw, isLoading, error, refetch } = useQuery({
    queryKey: ["arrears", params],
    queryFn: () => api.get(`/admin/arrears?${params}`).then((r) => r.data),
  });

  const listData = listRaw as PaginatedResponse<ArrearItem> | undefined;

  const { data: summaryRaw } = useQuery({
    queryKey: ["arrears-summary"],
    queryFn: () => api.get("/admin/arrears/summary").then((r) => r.data),
  });

  const summary = parseSummary(summaryRaw);

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/arrears/${id}/cancel`),
    onSuccess: () => {
      toast.success("Начисление отменено");
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["arrears-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmState(null);
    },
  });

  const markPaidMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/arrears/${id}/mark-paid`),
    onSuccess: () => {
      toast.success("Отмечено как оплачено");
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["arrears-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmState(null);
    },
  });

  const columns = useMemo<ColumnDef<ArrearItem>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Создано",
        cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy HH:mm"),
      },
      {
        id: "user",
        header: "Пользователь",
        cell: ({ row }) => {
          const u = row.original.user;
          if (!u) return <span className="text-muted-foreground">—</span>;
          return (
            <div>
              <p className="font-medium text-sm">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "year",
        header: "Год",
        cell: ({ row }) => row.original.year ?? "—",
      },
      {
        accessorKey: "amount",
        header: "Сумма",
        cell: ({ row }) => `${row.original.amount.toLocaleString("ru-RU")} ₽`,
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "source",
        header: "Источник",
        cell: ({ row }) => row.original.source || "—",
      },
      {
        id: "audit",
        header: "Прощение",
        cell: ({ row }) => {
          const a = row.original;
          if (a.status !== "waived") return "—";
          return (
            <div className="text-xs max-w-[200px]">
              {a.waived_at && <p>{format(new Date(a.waived_at), "dd.MM.yyyy HH:mm")}</p>}
              {a.waived_by && <p className="text-muted-foreground">{a.waived_by}</p>}
              {a.waive_reason && <p className="truncate" title={a.waive_reason}>{a.waive_reason}</p>}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Действия",
        cell: ({ row }) => {
          const a = row.original;
          if (a.status !== "open") return null;
          return (
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditArrear(a)}>
                Изменить
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setConfirmState({ kind: "markPaid", arrear: a })}>
                Оплачено
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setWaiveArrear(a)}>
                Прощение
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive"
                onClick={() => setConfirmState({ kind: "cancel", arrear: a })}
              >
                Отменить
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const hasFilters =
    statusFilter !== "all" || !includeAllStatuses || !!year.trim() || !!filterUserId;

  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setIncludeAllStatuses(true);
    setYear("");
    setFilterUserId("");
    setFilterUserSearch("");
    setPage(1);
  }, []);

  if (error) return <ErrorState message="Не удалось загрузить задолженности" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Задолженности" }]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Задолженности</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать долг
        </Button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Открыто (сумма)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{(summary.open_total ?? 0).toLocaleString("ru-RU")} ₽</p>
              <p className="text-xs text-muted-foreground">{summary.open_count ?? 0} шт.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Погашено</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{(summary.paid_total ?? 0).toLocaleString("ru-RU")} ₽</p>
              <p className="text-xs text-muted-foreground">{summary.paid_count ?? 0} шт.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Прощено</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{(summary.waived_total ?? 0).toLocaleString("ru-RU")} ₽</p>
              <p className="text-xs text-muted-foreground">{summary.waived_count ?? 0} шт.</p>
            </CardContent>
          </Card>
          {(summary.cancelled_count ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Отменено</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{(summary.cancelled_total ?? 0).toLocaleString("ru-RU")} ₽</p>
                <p className="text-xs text-muted-foreground">{summary.cancelled_count} шт.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label>Статус</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="open">Открыт</SelectItem>
              <SelectItem value="paid">Погашен</SelectItem>
              <SelectItem value="waived">Прощён</SelectItem>
              <SelectItem value="cancelled">Отменён</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {statusFilter === "all" && (
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="inc-all"
              checked={includeAllStatuses}
              onCheckedChange={(c) => {
                setIncludeAllStatuses(c === true);
                setPage(1);
              }}
            />
            <Label htmlFor="inc-all" className="text-sm font-normal cursor-pointer">
              Показать все статусы (иначе только очередь «open»)
            </Label>
          </div>
        )}
        <div className="space-y-2">
          <Label>Год</Label>
          <Input
            className="w-24"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
            placeholder="2000–2100"
          />
        </div>
        <div className="space-y-2 relative">
          <Label>Пользователь</Label>
          <Input
            className="w-56"
            placeholder="Поиск…"
            value={filterUserSearch}
            onChange={(e) => {
              setFilterUserSearch(e.target.value);
              if (filterUserId) {
                setFilterUserId("");
                setPage(1);
              }
            }}
          />
          {(userHints?.data?.length ?? 0) > 0 && !filterUserId && (
            <div className="absolute z-10 mt-1 w-full border rounded-md bg-background shadow-md max-h-40 overflow-auto">
              {userHints!.data.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setFilterUserId(u.id);
                    setFilterUserSearch(`${u.full_name} (${u.email})`);
                    setPage(1);
                  }}
                >
                  {u.full_name} — {u.email}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="mb-0.5" onClick={resetFilters}>
            <X className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={listData?.data ?? []}
        page={page}
        perPage={perPage}
        total={listData?.total}
        totalPages={totalPages(listData?.total ?? 0, perPage)}
        onPageChange={setPage}
        onPerPageChange={(pp) => {
          setPerPage(pp);
          setPage(1);
        }}
        isLoading={isLoading}
        emptyTitle="Нет записей"
      />

      <CreateArrearDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditArrearDialog arrear={editArrear} open={!!editArrear} onOpenChange={(o) => !o && setEditArrear(null)} />
      <WaiveArrearDialog arrear={waiveArrear} open={!!waiveArrear} onOpenChange={(o) => !o && setWaiveArrear(null)} />

      <ConfirmArrearDialog
        open={confirmState?.kind === "cancel"}
        onOpenChange={(o) => !o && setConfirmState(null)}
        title="Отменить начисление?"
        description="Статус станет «отменён» (ошибочное начисление)."
        confirmLabel="Отменить начисление"
        isPending={cancelMut.isPending}
        onConfirm={() => {
          if (confirmState?.kind === "cancel") cancelMut.mutate(confirmState.arrear.id);
        }}
      />
      <ConfirmArrearDialog
        open={confirmState?.kind === "markPaid"}
        onOpenChange={(o) => !o && setConfirmState(null)}
        title="Отметить оплаченным?"
        description="Долг будет закрыт без провайдера (ручная отметка)."
        confirmLabel="Подтвердить"
        isPending={markPaidMut.isPending}
        onConfirm={() => {
          if (confirmState?.kind === "markPaid") markPaidMut.mutate(confirmState.arrear.id);
        }}
      />
    </div>
  );
}
