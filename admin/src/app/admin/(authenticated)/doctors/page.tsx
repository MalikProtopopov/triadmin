"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import api from "@/lib/api";
import type { DoctorListItem, PaginatedResponse, City } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { Eye, Upload, X, FileEdit, GraduationCap } from "lucide-react";
import { CreateDoctorModal } from "@/components/features/doctors/CreateDoctorModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRole } from "@/hooks/useRole";
import { format } from "date-fns";
import { totalPages } from "@/lib/pagination";
import { Suspense } from "react";

function getColumns(sorting: SortingState, onSort: (id: string) => void): ColumnDef<DoctorListItem>[] {
  return [
  {
    accessorKey: "last_name",
    id: "last_name",
    header: () => <SortableHeader label="ФИО" columnId="last_name" sorting={sorting} onSort={onSort} />,
    cell: ({ row }) => {
      const d = row.original;
      return `${d.last_name} ${d.first_name} ${d.middle_name || ""}`.trim();
    },
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "city",
    header: "Город",
    cell: ({ row }) => row.original.city?.name || "—",
  },
  { accessorKey: "specialization", header: "Специализация", cell: ({ row }) => row.original.specialization || "—" },
  {
    accessorKey: "moderation_status",
    header: "Статус",
    cell: ({ row }) => <StatusBadge status={row.original.moderation_status} />,
  },
  {
    accessorKey: "subscription",
    id: "subscription_ends_at",
    header: () => <SortableHeader label="Подписка" columnId="subscription_ends_at" sorting={sorting} onSort={onSort} />,
    cell: ({ row }) => {
      const sub = row.original.subscription;
      if (!sub || !sub.status) return <StatusBadge status="never" />;
      const label = sub.ends_at
        ? `${sub.status === "active" ? "до" : ""} ${format(new Date(sub.ends_at), "dd.MM.yyyy")}`
        : undefined;
      return <StatusBadge status={sub.status} label={label} />;
    },
  },
  {
    accessorKey: "has_medical_diploma",
    header: "Диплом",
    cell: ({ row }) => (
      <span title={row.original.has_medical_diploma ? "Есть диплом" : "Нет диплома"}>
        {row.original.has_medical_diploma ? <GraduationCap className="h-4 w-4 text-green-600" /> : "—"}
      </span>
    ),
  },
  {
    accessorKey: "has_pending_changes",
    header: "Правки",
    cell: ({ row }) =>
      row.original.has_pending_changes ? (
        <span title="Есть ожидающие правки профиля" className="flex items-center gap-1 text-amber-600">
          <FileEdit className="h-4 w-4" />
        </span>
      ) : null,
  },
  {
    accessorKey: "created_at",
    id: "created_at",
    header: () => <SortableHeader label="Регистрация" columnId="created_at" sorting={sorting} onSort={onSort} />,
    cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="icon">
        <Link href={`/admin/doctors/${row.original.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];
}

function DoctorsListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAdmin } = useRole();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [subscriptionStatus, setSubscriptionStatus] = useState(searchParams.get("subscription_status") || "all");
  const [cityId, setCityId] = useState(searchParams.get("city_id") || "all");
  const [hasPendingDraft, setHasPendingDraft] = useState(searchParams.get("has_data_changed") === "true");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [perPage, setPerPage] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const debouncedSearch = useDebounce(search);

  useKeyboardShortcuts({ onSearchFocus: () => document.getElementById("doctors-search")?.focus() });

  useEffect(() => {
    setHasPendingDraft(searchParams.get("has_data_changed") === "true");
  }, [searchParams]);

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (debouncedSearch.length >= 2) params.set("search", debouncedSearch);
  if (status !== "all") params.set("status", status);
  if (subscriptionStatus !== "all") params.set("subscription_status", subscriptionStatus);
  if (cityId !== "all") params.set("city_id", cityId);
  if (hasPendingDraft) params.set("has_data_changed", "true");
  const sortBy = sorting[0]?.id || "created_at";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";
  params.set("sort_by", sortBy);
  params.set("sort_order", sortOrder);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<DoctorListItem>>({
    queryKey: ["doctors", params.toString()],
    queryFn: () => api.get(`/admin/doctors?${params}`).then((r) => r.data),
  });

  const { data: cities } = useQuery<{ data: City[] }>({
    queryKey: ["cities"],
    queryFn: () => api.get("/cities").then((r) => r.data),
  });

  const hasFilters = search || status !== "all" || subscriptionStatus !== "all" || cityId !== "all" || hasPendingDraft;

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setSubscriptionStatus("all");
    setCityId("all");
    setHasPendingDraft(false);
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

  if (error) return <ErrorState message="Не удалось загрузить врачей" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Врачи" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Врачи</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <CreateDoctorModal onCreated={(profileId) => router.push(`/admin/doctors/${profileId}`)} />
            <Button asChild>
              <Link href="/admin/portal-users/import">
                <Upload className="mr-2 h-4 w-4" /> Импорт из Excel
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          id="doctors-search"
          placeholder="Поиск по ФИО, email... (нажмите /)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Статус модерации" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="new">Новый</SelectItem>
            <SelectItem value="pending">На модерации</SelectItem>
            <SelectItem value="approved">Одобрен</SelectItem>
            <SelectItem value="rejected">Отклонён</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subscriptionStatus} onValueChange={(v) => { setSubscriptionStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Подписка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все подписки</SelectItem>
            <SelectItem value="active">Активна</SelectItem>
            <SelectItem value="expired">Истекла</SelectItem>
            <SelectItem value="expiring_soon">Истекает скоро</SelectItem>
            <SelectItem value="never">Нет</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityId} onValueChange={(v) => { setCityId(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Город" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все города</SelectItem>
            {cities?.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox
            id="has-pending-draft"
            checked={hasPendingDraft}
            onCheckedChange={(c) => { setHasPendingDraft(!!c); setPage(1); }}
          />
          <label htmlFor="has-pending-draft" className="text-sm cursor-pointer">Правки профилей</label>
        </div>
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
        total={data?.total}
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
        emptyTitle="Нет врачей"
        emptyDescription="Попробуйте изменить параметры фильтрации"
      />
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense>
      <DoctorsListContent />
    </Suspense>
  );
}
