"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import type { PortalUserDetail } from "@/types";
import { DetailSkeleton } from "@/components/shared/DetailSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  entry_fee: "Вступительный",
  annual_fee: "Ежегодный",
  event: "Мероприятие",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Одобрен",
  pending: "На модерации",
  rejected: "Отклонён",
  new: "Новый",
};

export default function PortalUserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading, error, refetch } = useQuery<PortalUserDetail>({
    queryKey: ["portal-user", id],
    queryFn: () => api.get(`/admin/portal-users/${id}`).then((r) => r.data),
  });

  if (isLoading) return <DetailSkeleton />;
  if (error || !user) return <ErrorState onRetry={refetch} />;

  const displayName = user.full_name || user.email;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Пользователи", href: "/admin/portal-users" },
          { label: displayName },
        ]}
      />

      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/portal-users">
          <ArrowLeft className="mr-1 h-4 w-4" /> Назад к списку
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">{displayName}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Общая информация</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <dl className="grid grid-cols-1 gap-2">
              <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email}</dd></div>
              <div><dt className="text-muted-foreground">Тип</dt><dd><Badge variant="outline">{user.role_display || "—"}</Badge></dd></div>
              <div>
                <dt className="text-muted-foreground">Email подтверждён</dt>
                <dd>{user.is_verified ? "Да" : "Нет"}</dd>
              </div>
              <div><dt className="text-muted-foreground">Дата регистрации</dt><dd>{format(new Date(user.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}</dd></div>
              <div>
                <dt className="text-muted-foreground">Telegram</dt>
                <dd>
                  {user.telegram_linked && user.tg_username ? (
                    <a
                      href={`https://t.me/${user.tg_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0088cc] hover:underline inline-flex items-center gap-1"
                    >
                      @{user.tg_username} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "Не привязан"
                  )}
                </dd>
              </div>
              {user.onboarding_status && (
                <div><dt className="text-muted-foreground">Онбординг</dt><dd>{user.onboarding_status}</dd></div>
              )}
              {user.subscription && (
                <div>
                  <dt className="text-muted-foreground">Подписка</dt>
                  <dd>
                    <StatusBadge status={user.subscription.status} />
                    {user.subscription.plan_name && <span className="ml-1">({user.subscription.plan_name})</span>}
                    {user.subscription.ends_at && <span className="ml-1 text-muted-foreground">до {format(new Date(user.subscription.ends_at), "dd.MM.yyyy")}</span>}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Doctor profile status */}
        {user.doctor_profile_id && (
          <Card>
            <CardHeader><CardTitle className="text-base">Профиль врача</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {user.doctor_profile_status && (
                <div>
                  <span className="text-muted-foreground">Статус профиля: </span>
                  <StatusBadge status={user.doctor_profile_status} label={STATUS_LABELS[user.doctor_profile_status] || user.doctor_profile_status} />
                </div>
              )}
              {user.board_role && (
                <div>
                  <span className="text-muted-foreground">Роль в правлении: </span>
                  <Badge variant="outline">{user.board_role === "pravlenie" ? "Правление" : "Президент"}</Badge>
                </div>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/doctors/${user.doctor_profile_id}`}>
                  <ExternalLink className="mr-1 h-3 w-3" /> Перейти к профилю врача
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payments */}
      {user.payments && user.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">История платежей</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.created_at), "dd.MM.yyyy", { locale: ru })}</TableCell>
                    <TableCell>{p.amount.toLocaleString("ru-RU")} ₽</TableCell>
                    <TableCell>{PRODUCT_TYPE_LABELS[p.product_type] || p.product_type}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No role block */}
      {!user.role && (
        <Card>
          <CardHeader><CardTitle className="text-base">Статус</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Роль не выбрана</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
