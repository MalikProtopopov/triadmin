"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { EventListItem, PaginatedResponse, PortalUserEventRegistrationRow } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { totalPages } from "@/lib/pagination";

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
};

function formatEventDates(ev: PortalUserEventRegistrationRow["event"]): string {
  const start = format(new Date(ev.event_date), "dd.MM.yyyy HH:mm");
  if (!ev.event_end_date) return start;
  const end = format(new Date(ev.event_end_date), "dd.MM.yyyy HH:mm");
  return `${start} — ${end}`;
}

interface PortalUserEventRegistrationsSectionProps {
  userId: string;
}

export function PortalUserEventRegistrationsSection({ userId }: PortalUserEventRegistrationsSectionProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventId, setEventId] = useState<string>("");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(perPage));
    p.set("offset", String((page - 1) * perPage));
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (eventId) p.set("event_id", eventId);
    return p.toString();
  }, [page, perPage, statusFilter, eventId]);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<PortalUserEventRegistrationRow>>({
    queryKey: ["portal-user-event-registrations", userId, params],
    queryFn: () => api.get(`/admin/portal-users/${userId}/event-registrations?${params}`).then((r) => r.data),
    enabled: !!userId,
  });

  const { data: eventsData } = useQuery<PaginatedResponse<EventListItem>>({
    queryKey: ["events", "event-reg-filter-dropdown"],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("limit", "100");
      p.set("offset", "0");
      p.set("sort_by", "event_date");
      p.set("sort_order", "desc");
      return api.get(`/admin/events?${p}`).then((r) => r.data);
    },
  });

  const eventOptions = eventsData?.data ?? [];

  const columns = useMemo<ColumnDef<PortalUserEventRegistrationRow>[]>(
    () => [
      {
        id: "event",
        header: "Мероприятие",
        cell: ({ row }) => {
          const ev = row.original.event;
          return (
            <Link href={`/admin/events/${ev.id}`} className="text-primary hover:underline font-medium">
              {ev.title}
            </Link>
          );
        },
      },
      {
        id: "dates",
        header: "Дата",
        cell: ({ row }) => formatEventDates(row.original.event),
      },
      {
        accessorKey: "tariff.name",
        header: "Тариф",
        cell: ({ row }) => row.original.tariff.name,
      },
      {
        id: "price",
        header: "Цена билета",
        cell: ({ row }) => `${row.original.tariff.applied_price.toLocaleString("ru-RU")} ₽`,
      },
      {
        id: "member",
        header: "Членская цена?",
        cell: ({ row }) => (row.original.tariff.is_member_price ? "Да" : "Нет"),
      },
      {
        id: "reg_status",
        header: "Статус регистрации",
        cell: ({ row }) => {
          const s = row.original.registration.status;
          return (
            <StatusBadge
              status={s}
              label={REGISTRATION_STATUS_LABELS[s] ?? s}
            />
          );
        },
      },
      {
        id: "pay_amount",
        header: "Сумма платежа",
        cell: ({ row }) => {
          const amt = row.original.payment?.amount;
          if (amt == null) return "—";
          return `${amt.toLocaleString("ru-RU")} ₽`;
        },
      },
      {
        id: "pay_status",
        header: "Статус платежа",
        cell: ({ row }) => {
          const p = row.original.payment;
          if (!p) return "—";
          const label = p.status_label?.trim() || p.status || "—";
          if (p.status) {
            return <StatusBadge status={p.status} label={label} />;
          }
          return label;
        },
      },
    ],
    []
  );

  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setEventId("");
    setPage(1);
  }, []);

  const hasFilters = statusFilter !== "all" || !!eventId;

  if (error) {
    return <ErrorState message="Не удалось загрузить регистрации на мероприятия" onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label>Статус регистрации</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="confirmed">Подтверждена</SelectItem>
              <SelectItem value="cancelled">Отменена</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 min-w-[220px] max-w-sm flex-1">
          <Label>Мероприятие</Label>
          <Select
            value={eventId || "all"}
            onValueChange={(v) => {
              setEventId(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все мероприятия" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все мероприятия</SelectItem>
              {eventOptions.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>
                  {ev.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={resetFilters}>
            <X className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        page={page}
        perPage={perPage}
        total={data?.total}
        totalPages={totalPages(data?.total ?? 0, perPage)}
        onPageChange={setPage}
        onPerPageChange={(pp) => {
          setPerPage(pp);
          setPage(1);
        }}
        isLoading={isLoading}
        emptyTitle="Нет регистраций"
      />
    </div>
  );
}
