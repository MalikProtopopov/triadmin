"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DashboardData, EventListItem, PaginatedResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  Users,
  Stethoscope,
  CheckCircle,
  Clock,
  CreditCard,
  CalendarDays,
  ShieldAlert,
  TrendingUp,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data),
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: eventsData } = useQuery<PaginatedResponse<EventListItem>>({
    queryKey: ["dashboard-upcoming-events"],
    queryFn: () =>
      api
        .get("/admin/events", {
          params: {
            sort_by: "event_date",
            sort_order: "asc",
            limit: 5,
            status: "upcoming",
          },
        })
        .then((r) => r.data),
    refetchInterval: 2 * 60 * 1000,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState message="Не удалось загрузить дашборд" onRetry={refetch} />;
  if (!data) return null;

  const upcomingEvents = eventsData?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      {/* Payments row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/payments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Платежи за месяц</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.payment_total_month.toLocaleString("ru-RU")} ₽</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/payments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Платежи за год</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.payment_total_year.toLocaleString("ru-RU")} ₽</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Funnel counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/portal-users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Всего зарегистрировано</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.total_users}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/doctors">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Врачей</CardTitle>
              <Stethoscope className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.total_doctors}</div>
              <p className="text-xs text-muted-foreground">одобрено: {data.active_doctors}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/doctors">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">С активной подпиской</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.active_subscriptions}</div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Подписка истекает (30 дн.)</CardTitle>
            <CalendarClock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.expiring_30d}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming events table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ближайшие мероприятия</CardTitle>
            <span className="text-sm text-muted-foreground">Всего предстоящих: {data.upcoming_events}</span>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет предстоящих мероприятий</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Участников</TableHead>
                    <TableHead>Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/admin/events/${e.id}`} className="font-medium hover:underline">
                          {e.title}
                        </Link>
                      </TableCell>
                      <TableCell>{format(new Date(e.event_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{e.registrations_count}</TableCell>
                      <TableCell>{e.revenue.toLocaleString("ru-RU")} ₽</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/events">Все мероприятия</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Модерация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/doctors?status=pending_review"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Ожидают модерации</p>
                <p className="text-2xl font-bold">{data.pending_review_doctors}</p>
              </div>
            </Link>
            <Link
              href="/admin/doctors"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Очередь модерации</p>
                <p className="text-2xl font-bold">{data.moderation_queue}</p>
              </div>
            </Link>
            <Link
              href="/admin/events"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <CalendarDays className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Предстоящих мероприятий</p>
                <p className="text-2xl font-bold">{data.upcoming_events}</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
