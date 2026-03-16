"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import api from "@/lib/api";
import type { PortalUserListItem, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { Eye, X, Upload } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSidebarSections } from "@/hooks/useSidebarSections";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { totalPages } from "@/lib/pagination";
import { Suspense } from "react";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  entry_fee: "Вступительный",
  subscription: "Ежегодный",
  event: "Мероприятие",
};

function getColumns(
  sorting: SortingState,
  onSort: (id: string) => void
): ColumnDef<PortalUserListItem>[] {
  return [
    {
      accessorKey: "full_name",
      id: "full_name",
      header: () => <SortableHeader label="ФИО / Email" columnId="last_name" sorting={sorting} onSort={onSort} />,
      cell: ({ row }) => {
        const d = row.original;
        return d.full_name || d.email;
      },
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Тип",
      cell: ({ row }) => {
        const role = row.original.role;
        const variant = role === "doctor" ? "default" : role === "user" ? "secondary" : "outline";
        return <Badge variant={variant}>{row.original.role_display}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => {
        const d = row.original;
        if (d.role === "doctor" && d.subscription) {
          return (
            <span className="text-sm">
              <StatusBadge status={d.subscription.status} />
              {d.subscription.ends_at && (
                <span className="text-muted-foreground ml-1">
                  до {format(new Date(d.subscription.ends_at), "dd.MM.yyyy", { locale: ru })}
                </span>
              )}
            </span>
          );
        }
        return <span className="text-muted-foreground text-sm">Зарегистрирован</span>;
      },
    },
    {
      accessorKey: "last_payment",
      header: "Последний взнос",
      cell: ({ row }) => {
        const lp = row.original.last_payment;
        if (!lp) return "—";
        const typeLabel = PRODUCT_TYPE_LABELS[lp.product_type] || lp.product_type;
        return (
          <span className="text-sm">
            {format(new Date(lp.created_at), "dd.MM.yyyy", { locale: ru })} — {typeLabel}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      id: "created_at",
      header: () => <SortableHeader label="Регистрация" columnId="created_at" sorting={sorting} onSort={onSort} />,
      cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy", { locale: ru }),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="icon">
          <Link href={`/admin/portal-users/${row.original.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];
}

function PortalUsersListContent() {
  const searchParams = useSearchParams();
  const sidebarSections = useSidebarSections();
  const canImportUsers = sidebarSections.includes("doctors_import");

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [perPage, setPerPage] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const debouncedSearch = useDebounce(search);

  useKeyboardShortcuts({ onSearchFocus: () => document.getElementById("portal-users-search")?.focus() });

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (debouncedSearch.length >= 2) params.set("search", debouncedSearch);
  const sortBy = sorting[0]?.id || "created_at";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";
  params.set("sort_by", sortBy);
  params.set("sort_order", sortOrder);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<PortalUserListItem>>({
    queryKey: ["portal-users", params.toString()],
    queryFn: () => api.get(`/admin/portal-users?${params}`).then((r) => r.data),
  });

  const hasFilters = !!search;

  function resetFilters() {
    setSearch("");
    setPage(1);
  }

  const handleSort = useCallback((columnId: string) => {
    setSorting((prev) => {
      const current = prev.find((s) => s.id === columnId);
      return [{ id: columnId, desc: current ? !current.desc : true }];
    });
    setPage(1);
  }, []);

  const columns = useMemo(() => getColumns(sorting, handleSort), [sorting, handleSort]);

  if (error) return <ErrorState message="Не удалось загрузить пользователей" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Пользователи портала", href: "/admin/portal-users" }, { label: "Пользователи" }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        {canImportUsers && (
          <Button asChild>
            <Link href="/admin/portal-users/import">
              <Upload className="mr-2 h-4 w-4" /> Импорт пользователей
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          id="portal-users-search"
          placeholder="Поиск по email, ФИО... (нажмите /)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        page={page}
        perPage={perPage}
        total={data?.total ?? 0}
        totalPages={totalPages(data?.total ?? 0, perPage)}
        onPageChange={setPage}
        onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }}
        sorting={sorting}
        onSortingChange={(updater) => {
          const next = typeof updater === "function" ? updater(sorting) : updater;
          setSorting(next);
          setPage(1);
        }}
        isLoading={isLoading}
        emptyTitle="Нет пользователей"
        emptyDescription="Попробуйте изменить параметры фильтрации"
      />
    </div>
  );
}

export default function PortalUsersPage() {
  return (
    <Suspense>
      <PortalUsersListContent />
    </Suspense>
  );
}
