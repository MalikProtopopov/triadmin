"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { VotingSessionDetail, VotingSessionResults } from "@/types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DetailSkeleton } from "@/components/shared/DetailSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ArrowLeft, Play, Square, XCircle, BarChart3, ExternalLink, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export default function VotingDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

  const { data: session, isLoading, error } = useQuery<VotingSessionDetail>({
    queryKey: ["voting-session", id],
    queryFn: () => api.get(`/admin/voting/${id}`).then((r) => r.data),
    refetchInterval: (q) => (q.state.data?.status === "active" ? 30_000 : false),
  });

  const { data: results } = useQuery<VotingSessionResults>({
    queryKey: ["voting-results", id],
    queryFn: () => api.get(`/admin/voting/${id}/results`).then((r) => r.data),
    enabled: !!session && (session.status === "active" || session.status === "closed"),
    refetchInterval: () => {
      return session?.status === "active" ? 30_000 : false;
    },
  });

  const mutateAction = useMutation({
    mutationFn: ({ action }: { action: string }) =>
      api.patch(`/admin/voting/${id}`, { status: action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-session", id] });
      queryClient.invalidateQueries({ queryKey: ["voting-results", id] });
      queryClient.invalidateQueries({ queryKey: ["voting-sessions"] });
      toast.success("Статус обновлён");
      setActionTarget(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number; data?: { detail?: string | string[]; message?: string } } };
      const msg = e.response?.status === 422
        ? (Array.isArray(e.response?.data?.detail) ? e.response.data.detail.join(", ") : e.response?.data?.detail || e.response?.data?.message)
        : "Не удалось обновить статус";
      toast.error(msg);
    },
  });

  const mutateUpdate = useMutation({
    mutationFn: (body: { title: string; ends_at: string }) =>
      api.patch(`/admin/voting/${id}`, {
        title: body.title,
        ends_at: new Date(body.ends_at).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-session", id] });
      queryClient.invalidateQueries({ queryKey: ["voting-sessions"] });
      toast.success("Изменения сохранены");
      setEditOpen(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number; data?: { detail?: string | string[]; message?: string } } };
      const msg = e.response?.status === 422
        ? (Array.isArray(e.response?.data?.detail) ? e.response.data.detail.join(", ") : e.response?.data?.detail || e.response?.data?.message)
        : "Не удалось сохранить";
      toast.error(msg);
    },
  });

  if (isLoading || !session) return <DetailSkeleton />;
  if (error || (session && typeof session === "object" && !("id" in session)))
    return <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ["voting-session", id] })} />;

  const s = session as VotingSessionDetail;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Голосование", href: "/admin/voting" },
          { label: s.title },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          {s.description && (
            <p className="mt-1 text-muted-foreground">{s.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/voting">
            <ArrowLeft className="mr-2 h-4 w-4" /> К списку
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Статус</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={s.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Начало</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{format(new Date(s.starts_at), "dd.MM.yyyy HH:mm")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Окончание</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{format(new Date(s.ends_at), "dd.MM.yyyy HH:mm")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Кандидатов</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{s.candidates_count}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {s.status === "draft" && (
          <Button onClick={() => setActionTarget("active")}>
            <Play className="mr-2 h-4 w-4" /> Запустить голосование
          </Button>
        )}
        {s.status === "draft" && (
          <Button variant="destructive" onClick={() => setActionTarget("cancelled")}>
            <XCircle className="mr-2 h-4 w-4" /> Отменить
          </Button>
        )}
        {s.status === "draft" && (
          <Button
            variant="outline"
            onClick={() => {
              setEditTitle(s.title);
              setEditEndsAt(new Date(s.ends_at).toISOString().slice(0, 16));
              setEditOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Редактировать
          </Button>
        )}
        {s.status === "active" && (
          <Button onClick={() => setActionTarget("closed")}>
            <Square className="mr-2 h-4 w-4" /> Закрыть голосование
          </Button>
        )}
        {s.status === "active" && (
          <Button variant="destructive" onClick={() => setActionTarget("cancelled")}>
            <XCircle className="mr-2 h-4 w-4" /> Отменить
          </Button>
        )}
        {(s.status === "active" || s.status === "closed") && (
          <Button variant="outline" asChild>
            <Link href={`/voting/${id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Посмотреть на сайте
            </Link>
          </Button>
        )}
      </div>

      {s.candidates && s.candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Кандидаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...s.candidates]
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((c) => (
                  <div key={c.id} className="flex gap-3 rounded-lg border p-3">
                    {c.photo_url ? (
                      <img
                        src={c.photo_url}
                        alt={c.full_name}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-lg font-medium">
                        {c.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {c.doctor_profile_id ? (
                        <Link
                          href={`/admin/doctors/${c.doctor_profile_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.full_name}
                        </Link>
                      ) : (
                        <p className="font-medium">{c.full_name}</p>
                      )}
                      {c.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {s.status === "active" && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            После окончания срока ({format(new Date(s.ends_at), "dd.MM.yyyy HH:mm")}) голосование перестаёт принимать голоса. Рекомендуется вручную перевести в «Завершено» для фиксации результатов.
          </CardContent>
        </Card>
      )}

      {s.status === "draft" && !results && (
        <Card className="border-muted">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Результаты будут доступны после запуска голосования.
          </CardContent>
        </Card>
      )}

      {s.status === "cancelled" && !results && (
        <Card className="border-muted">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Голосование отменено. Результаты не подсчитываются.
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Результаты
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Всего голосов</p>
                <p className="text-lg font-bold">{results.session.total_votes}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Имеют право голоса</p>
                <p className="text-lg font-bold">{results.session.total_eligible_voters}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Явка</p>
                <p className="text-lg font-bold">
                  {results.session.total_eligible_voters > 0
                    ? `${Math.round((results.session.total_votes / results.session.total_eligible_voters) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {results.results.map((r) => (
                <div key={r.candidate.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.candidate.full_name}</span>
                    <span>{r.votes_count} ({r.percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={r.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать</DialogTitle>
            <DialogDescription>
              Название и дата окончания. Дата начала и кандидаты изменяться не могут.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutateUpdate.mutate({ title: editTitle, ends_at: editEndsAt });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-title">Название</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={500}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ends">Дата окончания</Label>
              <Input
                id="edit-ends"
                type="datetime-local"
                value={editEndsAt}
                onChange={(e) => setEditEndsAt(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={mutateUpdate.isPending}>
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title={
          actionTarget === "active" ? "Запустить голосование?" :
          actionTarget === "closed" ? "Закрыть голосование?" :
          "Отменить голосование?"
        }
        description={
          actionTarget === "active"
            ? "Врачи смогут начать голосовать. Продолжить?"
            : `Сессия «${s.title}»`
        }
        confirmLabel={
          actionTarget === "active" ? "Запустить" :
          actionTarget === "closed" ? "Закрыть" :
          "Отменить"
        }
        variant={actionTarget === "cancelled" ? "destructive" : "default"}
        isLoading={mutateAction.isPending}
        onConfirm={() => actionTarget && mutateAction.mutate({ action: actionTarget })}
      />
    </div>
  );
}
