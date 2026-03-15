"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import api from "@/lib/api";
import type { EventListItem, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, X } from "lucide-react";
import { totalPages } from "@/lib/pagination";
import { format } from "date-fns";
import { toast } from "sonner";

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<EventListItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "event_date", desc: true },
  ]);

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (dateRange?.from) params.set("date_from", format(dateRange.from, "yyyy-MM-dd"));
  if (dateRange?.to) params.set("date_to", format(dateRange.to, "yyyy-MM-dd"));
  const sortBy = sorting[0]?.id || "event_date";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";
  params.set("sort_by", sortBy);
  params.set("sort_order", sortOrder);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<EventListItem>>({
    queryKey: ["events", params.toString()],
    queryFn: () => api.get(`/admin/events?${params}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Мероприятие удалено");
      setDeleteTarget(null);
    },
  });

  function handleDeleteClick(item: EventListItem) {
    if ((item.registrations_count ?? 0) > 0) {
      toast.warning("Невозможно удалить: есть подтверждённые регистрации");
      return;
    }
    setDeleteTarget(item);
  }

  const handleSort = useCallback((columnId: string) => {
    setSorting((prev) => {
      const current = prev.find((s) => s.id === columnId);
      return [{ id: columnId, desc: current ? !current.desc : true }];
    });
    setPage(1);
  }, []);

  const hasFilters = statusFilter !== "all" || !!dateRange?.from;

  const columns = useMemo<ColumnDef<EventListItem>[]>(() => [
    {
      accessorKey: "title",
      header: "Название",
      cell: ({ row }) => (
        <Link href={`/admin/events/${row.original.id}`} className="font-medium hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: "event_date",
      id: "event_date",
      header: () => <SortableHeader label="Дата" columnId="event_date" sorting={sorting} onSort={handleSort} />,
      cell: ({ row }) => format(new Date(row.original.event_date), "dd.MM.yyyy"),
    },
    { accessorKey: "location", header: "Место", cell: ({ row }) => row.original.location || "—" },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: "registrations_count", header: "Участников" },
    {
      accessorKey: "revenue",
      header: "Доход",
      cell: ({ row }) => `${row.original.revenue.toLocaleString("ru-RU")} ₽`,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/admin/events/${row.original.id}`}><Eye className="mr-2 h-4 w-4" /> Просмотр</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/admin/events/${row.original.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Редактировать</Link></DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 className="mr-2 h-4 w-4" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [sorting, handleSort]);

  if (error) return <ErrorState message="Не удалось загрузить мероприятия" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Мероприятия" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мероприятия</h1>
        <Button asChild><Link href="/admin/events/new"><Plus className="mr-2 h-4 w-4" /> Создать</Link></Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="upcoming">Предстоящие</SelectItem>
            <SelectItem value="ongoing">Проходящие</SelectItem>
            <SelectItem value="finished">Завершённые</SelectItem>
            <SelectItem value="cancelled">Отменённые</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          value={dateRange}
          onChange={(r) => { setDateRange(r); setPage(1); }}
          placeholder="Период"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setDateRange(undefined); setPage(1); }}>
            <X className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        page={page}
        perPage={perPage}
        total={data?.total}
        totalPages={totalPages(data?.total ?? 0, perPage)}
        onPageChange={setPage}
        onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }}
        isLoading={isLoading}
        emptyTitle="Нет мероприятий"
        emptyDescription="Создайте первое мероприятие"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить мероприятие?"
        description={`Мероприятие «${deleteTarget?.title}» будет удалено. Это действие нельзя отменить.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
