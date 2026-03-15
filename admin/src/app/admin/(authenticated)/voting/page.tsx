"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { VotingSession, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Play, Square, XCircle, Eye } from "lucide-react";
import { totalPages } from "@/lib/pagination";
import { format } from "date-fns";
import { toast } from "sonner";

export default function VotingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionTarget, setActionTarget] = useState<{ session: VotingSession; action: string } | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<VotingSession>>({
    queryKey: ["voting-sessions", page, perPage, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(perPage),
        offset: String((page - 1) * perPage),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      return api.get(`/admin/voting?${params}`).then((r) => r.data);
    },
  });

  const mutateAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.patch(`/admin/voting/${id}`, { status: action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-sessions"] });
      toast.success("Статус обновлён");
      setActionTarget(null);
    },
  });

  const columns = useMemo<ColumnDef<VotingSession>[]>(() => [
    {
      accessorKey: "title",
      header: "Название",
      cell: ({ row }) => (
        <Link href={`/admin/voting/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "starts_at",
      header: "Начало",
      cell: ({ row }) => format(new Date(row.original.starts_at), "dd.MM.yyyy HH:mm"),
    },
    {
      accessorKey: "ends_at",
      header: "Конец",
      cell: ({ row }) => format(new Date(row.original.ends_at), "dd.MM.yyyy HH:mm"),
    },
    { accessorKey: "candidates_count", header: "Кандидатов" },
    {
      id: "actions",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/voting/${s.id}`}>
                  <Eye className="mr-2 h-4 w-4" /> Посмотреть
                </Link>
              </DropdownMenuItem>
              {s.status === "active" && (
                <DropdownMenuItem onClick={() => setActionTarget({ session: s, action: "closed" })}>
                  <Square className="mr-2 h-4 w-4" /> Закрыть
                </DropdownMenuItem>
              )}
              {(s.status === "active") && (
                <DropdownMenuItem onClick={() => setActionTarget({ session: s, action: "cancelled" })} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" /> Отменить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  if (error) return <ErrorState message="Не удалось загрузить голосования" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Голосование" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Голосование</h1>
        <Button asChild><Link href="/admin/voting/new"><Plus className="mr-2 h-4 w-4" /> Создать сессию</Link></Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активна</SelectItem>
            <SelectItem value="closed">Завершена</SelectItem>
            <SelectItem value="cancelled">Отменена</SelectItem>
          </SelectContent>
        </Select>
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
        emptyTitle="Нет сессий голосования"
      />

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title=      {
          actionTarget?.action === "closed" ? "Закрыть голосование?" :
          "Отменить голосование?"
        }
        description={`Сессия «${actionTarget?.session.title}»`}
        confirmLabel={
          actionTarget?.action === "closed" ? "Закрыть" :
          "Отменить"
        }
        variant={actionTarget?.action === "cancelled" ? "destructive" : "default"}
        isLoading={mutateAction.isPending}
        onConfirm={() => actionTarget && mutateAction.mutate({ id: actionTarget.session.id, action: actionTarget.action })}
      />
    </div>
  );
}
