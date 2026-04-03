"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { FaqAdminItem, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, Pencil, Trash2, X, Search } from "lucide-react";
import { totalPages } from "@/lib/pagination";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { useRole } from "@/hooks/useRole";

export default function FaqListPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [deleteTarget, setDeleteTarget] = useState<FaqAdminItem | null>(null);

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (activeFilter !== "all") params.set("is_active", activeFilter);
  if (debouncedSearch.length >= 2) params.set("search", debouncedSearch);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<FaqAdminItem>>({
    queryKey: ["faq", params.toString()],
    queryFn: () => api.get(`/admin/faq?${params}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/faq/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
      toast.success("FAQ удалён");
      setDeleteTarget(null);
    },
  });

  const columns = useMemo<ColumnDef<FaqAdminItem>[]>(() => [
    {
      accessorKey: "question_title",
      header: "Заголовок",
      cell: ({ row }) => (
        <Link href={`/admin/faq/${row.original.id}/edit`} className="font-medium hover:underline line-clamp-2">
          {row.original.question_title}
        </Link>
      ),
    },
    {
      accessorKey: "author_name",
      header: "Автор",
      cell: ({ row }) => row.original.author_name || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "has_answer",
      header: "Ответ",
      cell: ({ row }) => row.original.answer_text
        ? <Badge variant="default">Есть</Badge>
        : <Badge variant="outline">Нет</Badge>,
    },
    {
      accessorKey: "is_active",
      header: "Активность",
      cell: ({ row }) => row.original.is_active
        ? <Badge variant="default">Активен</Badge>
        : <Badge variant="secondary">Скрыт</Badge>,
    },
    {
      accessorKey: "original_date",
      header: "Дата",
      cell: ({ row }) => {
        const d = row.original.original_date || row.original.created_at;
        return format(new Date(d), "dd.MM.yyyy");
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/faq/${row.original.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Редактировать</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original)}>
                <Trash2 className="mr-2 h-4 w-4" /> Удалить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [isAdmin]);

  if (error) return <ErrorState message="Не удалось загрузить FAQ" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Вопросы и ответы" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Вопросы и ответы</h1>
        <Button asChild><Link href="/admin/faq/new"><Plus className="mr-2 h-4 w-4" /> Создать</Link></Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по вопросам..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Активность" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="true">Активные</SelectItem>
            <SelectItem value="false">Скрытые</SelectItem>
          </SelectContent>
        </Select>
        {(activeFilter !== "all" || searchInput) && (
          <Button variant="ghost" size="sm" onClick={() => { setActiveFilter("all"); setSearchInput(""); setPage(1); }}>
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
        emptyTitle="Нет вопросов"
        emptyDescription="Создайте первый FAQ"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить вопрос?"
        description={`Вопрос «${deleteTarget?.question_title}» будет удалён безвозвратно.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
