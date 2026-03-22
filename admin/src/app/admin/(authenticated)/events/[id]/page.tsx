"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import type { EventDetail, EventRegistration, RegistrationListResponse } from "@/types";
import { DetailSkeleton } from "@/components/shared/DetailSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Users, CheckCircle, Clock, DollarSign, ImageIcon, Video, Upload, Copy } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [regPage, setRegPage] = useState(1);
  const [regStatusFilter, setRegStatusFilter] = useState<string>("all");

  const regColumns = useMemo<ColumnDef<EventRegistration>[]>(() => [
    {
      accessorKey: "user",
      header: "Участник",
      cell: ({ row }) => {
        const r = row.original;
        if (r.guest_email) {
          return (
            <div>
              <p className="font-medium text-sm">Гость</p>
              <p className="text-xs text-muted-foreground">{r.guest_email}</p>
            </div>
          );
        }
        const u = r.user;
        if (!u) return "—";
        return (
          <div>
            <p className="font-medium text-sm">{u.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        );
      },
    },
    { accessorKey: "tariff", header: "Тариф", cell: ({ row }) => row.original.tariff.name },
    {
      accessorKey: "applied_price",
      header: "Сумма",
      cell: ({ row }) => (
        <span>
          {row.original.applied_price.toLocaleString("ru-RU")} ₽
          {row.original.is_member_price && <StatusBadge status="active" label="чл." className="ml-1" />}
        </span>
      ),
    },
    { accessorKey: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "payment",
      header: "Платёж",
      cell: ({ row }) => {
        const p = row.original.payment;
        if (!p) return "—";
        const paymentUrl = p.payment_url || p.external_payment_url;
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={p.status} />
            {p.status === "pending" && paymentUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  navigator.clipboard.writeText(paymentUrl);
                  toast.success("Ссылка скопирована");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Копировать ссылку
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Дата регистрации",
      cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy HH:mm"),
    },
  ], []);

  const { data: event, isLoading, error, refetch } = useQuery<EventDetail>({
    queryKey: ["event", id],
    queryFn: () => api.get(`/admin/events/${id}`).then((r) => r.data),
  });

  const regParams = new URLSearchParams();
  regParams.set("limit", "20");
  regParams.set("offset", String((regPage - 1) * 20));
  if (regStatusFilter !== "all") regParams.set("status", regStatusFilter);

  const { data: regs, isLoading: regsLoading } = useQuery<RegistrationListResponse>({
    queryKey: ["event-registrations", id, regPage, regStatusFilter],
    queryFn: () => api.get(`/admin/events/${id}/registrations?${regParams}`).then((r) => r.data),
    enabled: !!event,
  });

  if (isLoading) return <DetailSkeleton />;
  if (error || !event) return <ErrorState onRetry={refetch} />;

  const summary = regs?.summary;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Мероприятия", href: "/admin/events" }, { label: event.title }]} />

      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/events"><ArrowLeft className="mr-1 h-4 w-4" /> Назад к списку</Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={event.status} />
            <span className="text-sm text-muted-foreground">
              {format(new Date(event.event_date), "dd.MM.yyyy")}
              {event.location && ` • ${event.location}`}
            </span>
          </div>
        </div>
        <Button asChild><Link href={`/admin/events/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Редактировать</Link></Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Регистраций</p>
              <p className="text-lg font-bold">{summary?.total_registrations ?? regs?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Подтверждено</p>
              <p className="text-lg font-bold">{summary?.confirmed ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Ожидают</p>
              <p className="text-lg font-bold">{summary?.pending ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Доход</p>
              <p className="text-lg font-bold">{(summary?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tariffs */}
      {event.tariffs && event.tariffs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Тарифы</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.tariffs.map((t) => (
                <div key={t.id} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium">{t.name}</p>
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  {t.conditions && <p className="text-xs text-muted-foreground">Условия: {t.conditions}</p>}
                  {t.details && <p className="text-xs text-muted-foreground">{t.details}</p>}
                  <p className="text-sm">{t.price.toLocaleString("ru-RU")} ₽ / для резидентов: {t.member_price.toLocaleString("ru-RU")} ₽</p>
                  {t.seats_limit && <p className="text-xs text-muted-foreground">Мест: {t.seats_taken}/{t.seats_limit}</p>}
                  {t.benefits.length > 0 && (
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {t.benefits.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Galleries */}
      {event.galleries && event.galleries.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Фотогалереи</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.galleries.map((g) => (
                <div key={g.id} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium">{g.title}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={g.access_level} label={g.access_level === "public" ? "Всем" : "Членам"} />
                    <span className="text-xs text-muted-foreground">{g.photos_count ?? 0} фото</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(g.created_at), "dd.MM.yyyy")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recordings */}
      {event.recordings && event.recordings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4" /> Записи</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.recordings.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium">{r.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.video_source === "external" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Video className="h-3 w-3" /> Внешнее</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Upload className="h-3 w-3" /> Загружено</span>
                    )}
                    <StatusBadge status={r.access_level} label={r.access_level === "public" ? "Всем" : r.access_level === "members_only" ? "Членам" : "Участникам"} />
                    <StatusBadge status={r.status} />
                  </div>
                  {r.duration_seconds != null && (
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(r.duration_seconds / 60)}:{String(r.duration_seconds % 60).padStart(2, "0")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Участники</CardTitle>
          <Select value={regStatusFilter} onValueChange={(v) => { setRegStatusFilter(v); setRegPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидают</SelectItem>
              <SelectItem value="confirmed">Подтверждено</SelectItem>
              <SelectItem value="cancelled">Отменено</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={regColumns}
            data={regs?.data || []}
            page={regPage}
            perPage={20}
            total={regs?.total}
            totalPages={Math.ceil((regs?.total ?? 0) / 20) || 1}
            onPageChange={setRegPage}
            isLoading={regsLoading}
            emptyTitle="Нет участников"
          />
        </CardContent>
      </Card>
    </div>
  );
}
