"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { DoctorListItem, PaginatedResponse, ProtocolHistoryResponse } from "@/types";
import { doctorListItemLabel } from "@/lib/doctorList";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreateProtocolHistoryDialog,
  EditProtocolHistoryDialog,
  ConfirmDeleteProtocolHistoryDialog,
} from "@/components/features/protocol-history/ProtocolHistoryDialogs";
import { format } from "date-fns";
import { toast } from "sonner";
import { totalPages } from "@/lib/pagination";
import { Plus, X } from "lucide-react";

function staffLine(u: { full_name: string | null; email: string } | null): string {
  if (!u) return "—";
  const name = u.full_name?.trim();
  return name || u.email;
}

export default function ProtocolHistoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [filterDoctorUserId, setFilterDoctorUserId] = useState("");
  const [filterDoctorSearch, setFilterDoctorSearch] = useState("");
  const debouncedDoctorSearch = useDebounce(filterDoctorSearch, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ProtocolHistoryResponse | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ProtocolHistoryResponse | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(perPage));
    p.set("offset", String((page - 1) * perPage));
    if (actionTypeFilter !== "all") {
      p.set("action_type", actionTypeFilter);
    }
    if (filterDoctorUserId) p.set("doctor_user_id", filterDoctorUserId);
    return p.toString();
  }, [page, perPage, actionTypeFilter, filterDoctorUserId]);

  const {
    data: doctorsPage,
    isFetching: doctorsSearchLoading,
    isFetched: doctorsSearchFetched,
  } = useQuery<PaginatedResponse<DoctorListItem>>({
    queryKey: ["admin-doctors-protocol-history-filter", debouncedDoctorSearch],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set("limit", "30");
      sp.set("offset", "0");
      sp.set("search", debouncedDoctorSearch);
      sp.set("sort_by", "created_at");
      sp.set("sort_order", "desc");
      return api.get(`/admin/doctors?${sp}`).then((r) => r.data);
    },
    enabled: debouncedDoctorSearch.length >= 2 && !filterDoctorUserId,
  });

  const doctorOptions = doctorsPage?.data ?? [];
  const showDoctorEmpty =
    !filterDoctorUserId &&
    debouncedDoctorSearch.length >= 2 &&
    doctorsSearchFetched &&
    !doctorsSearchLoading &&
    doctorOptions.length === 0;

  const { data: listRaw, isLoading, error, refetch } = useQuery({
    queryKey: ["protocol-history", params],
    queryFn: () => api.get(`/admin/protocol-history?${params}`).then((r) => r.data),
  });

  const listData = listRaw as PaginatedResponse<ProtocolHistoryResponse> | undefined;

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/protocol-history/${id}`),
    onSuccess: () => {
      toast.success("Запись удалена");
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
      setDeleteEntry(null);
    },
  });

  const columns = useMemo<ColumnDef<ProtocolHistoryResponse>[]>(
    () => [
      {
        accessorKey: "year",
        header: "Год",
        cell: ({ row }) => row.original.year,
      },
      {
        accessorKey: "protocol_title",
        header: "Протокол",
        cell: ({ row }) => (
          <span className="max-w-[220px] inline-block truncate" title={row.original.protocol_title}>
            {row.original.protocol_title}
          </span>
        ),
      },
      {
        accessorKey: "action_type",
        header: "Тип",
        cell: ({ row }) => <StatusBadge status={row.original.action_type} />,
      },
      {
        id: "doctor",
        header: "Врач",
        cell: ({ row }) => {
          const d = row.original.doctor;
          return (
            <div>
              <p className="font-medium text-sm">{d.full_name?.trim() || "—"}</p>
              <p className="text-xs text-muted-foreground">{d.email}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Создано",
        cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy HH:mm"),
      },
      {
        accessorKey: "updated_at",
        header: "Обновлено",
        cell: ({ row }) => format(new Date(row.original.updated_at), "dd.MM.yyyy HH:mm"),
      },
      {
        id: "created_by",
        header: "Кто создал",
        cell: ({ row }) => (
          <span className="text-sm max-w-[140px] inline-block truncate" title={staffLine(row.original.created_by_user)}>
            {staffLine(row.original.created_by_user)}
          </span>
        ),
      },
      {
        id: "edited_by",
        header: "Кто редактировал",
        cell: ({ row }) => (
          <span className="text-sm max-w-[140px] inline-block truncate" title={staffLine(row.original.last_edited_by_user)}>
            {staffLine(row.original.last_edited_by_user)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Действия",
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditEntry(e)}>
                Изменить
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => setDeleteEntry(e)}>
                Удалить
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const hasFilters = actionTypeFilter !== "all" || !!filterDoctorUserId;

  const resetFilters = useCallback(() => {
    setActionTypeFilter("all");
    setFilterDoctorUserId("");
    setFilterDoctorSearch("");
    setPage(1);
  }, []);

  if (error) return <ErrorState message="Не удалось загрузить историю протокола" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "История протокола" }]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">История протокола</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить запись
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label>Тип действия</Label>
          <Select
            value={actionTypeFilter}
            onValueChange={(v) => {
              setActionTypeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="admission">Приём</SelectItem>
              <SelectItem value="exclusion">Исключение</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 w-full max-w-md">
          <Label htmlFor="protocol-history-doctor-filter">Врач</Label>
          <p className="text-xs text-muted-foreground">
            Поиск по каталогу врачей: введите фамилию или email (от 2 символов), выберите строку из списка — фильтр
            применится сразу.
          </p>
          <div className="relative">
            <div className="flex gap-2 items-center">
              <Input
                id="protocol-history-doctor-filter"
                className="min-w-0 flex-1 sm:max-w-sm"
                placeholder="Например: Иванов или doc@"
                autoComplete="off"
                value={filterDoctorSearch}
                onChange={(e) => {
                  setFilterDoctorSearch(e.target.value);
                  if (filterDoctorUserId) {
                    setFilterDoctorUserId("");
                    setPage(1);
                  }
                }}
              />
              {filterDoctorUserId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setFilterDoctorUserId("");
                    setFilterDoctorSearch("");
                    setPage(1);
                  }}
                >
                  Сбросить врача
                </Button>
              )}
            </div>
            {!filterDoctorUserId && doctorOptions.length > 0 && debouncedDoctorSearch.length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 border rounded-md bg-popover text-popover-foreground shadow-md max-h-56 overflow-auto">
                {doctorOptions.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setFilterDoctorUserId(d.user_id);
                      setFilterDoctorSearch(doctorListItemLabel(d));
                      setPage(1);
                    }}
                  >
                    {doctorListItemLabel(d)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!filterDoctorUserId && filterDoctorSearch.length > 0 && filterDoctorSearch.length < 2 && (
            <p className="text-xs text-muted-foreground">Введите ещё символы для поиска.</p>
          )}
          {!filterDoctorUserId && debouncedDoctorSearch.length >= 2 && doctorsSearchLoading && (
            <p className="text-xs text-muted-foreground">Ищем врачей…</p>
          )}
          {showDoctorEmpty && (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Ничего не найдено. Попробуйте другую фамилию или email.
            </p>
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

      <CreateProtocolHistoryDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditProtocolHistoryDialog
        entry={editEntry}
        open={!!editEntry}
        onOpenChange={(o) => !o && setEditEntry(null)}
      />
      <ConfirmDeleteProtocolHistoryDialog
        open={!!deleteEntry}
        onOpenChange={(o) => !o && setDeleteEntry(null)}
        isPending={deleteMut.isPending}
        onConfirm={() => {
          if (deleteEntry) deleteMut.mutate(deleteEntry.id);
        }}
      />
    </div>
  );
}
