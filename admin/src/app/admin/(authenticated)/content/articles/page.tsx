"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { ArticleListItem, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { totalPages } from "@/lib/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ArticlesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<ArticleListItem | null>(null);

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (statusFilter !== "all") params.set("status", statusFilter);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<ArticleListItem>>({
    queryKey: ["articles", params.toString()],
    queryFn: () => api.get(`/admin/articles?${params}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Статья удалена");
      setDeleteTarget(null);
    },
  });

  const columns = useMemo<ColumnDef<ArticleListItem>[]>(() => [
    {
      accessorKey: "title",
      header: "Заголовок",
      cell: ({ row }) => (
        <Link href={`/admin/content/articles/${row.original.id}/edit`} className="font-medium hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    { accessorKey: "slug", header: "Slug" },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "themes",
      header: "Темы",
      cell: ({ row }) => {
        const themes = row.original.themes;
        if (!themes || themes.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {themes.map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs">{t.title}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "published_at",
      header: "Опубликовано",
      cell: ({ row }) => row.original.published_at ? format(new Date(row.original.published_at), "dd.MM.yyyy") : "—",
    },
    {
      accessorKey: "created_at",
      header: "Создано",
      cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/admin/content/articles/${row.original.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Редактировать</Link></DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original)}>
              <Trash2 className="mr-2 h-4 w-4" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);  

  if (error) return <ErrorState message="Не удалось загрузить статьи" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Контент" }, { label: "Статьи" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Статьи</h1>
        <Button asChild><Link href="/admin/content/articles/new"><Plus className="mr-2 h-4 w-4" /> Создать</Link></Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="draft">Черновик</SelectItem>
            <SelectItem value="published">Опубликовано</SelectItem>
            <SelectItem value="archived">Архив</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setPage(1); }}>
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
        emptyTitle="Нет статей"
        emptyDescription="Создайте первую статью"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Удалить статью?"
        description={`Статья «${deleteTarget?.title}» будет удалена безвозвратно.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
