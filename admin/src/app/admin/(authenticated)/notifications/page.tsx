"use client";

import { useState, useMemo, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { NotificationItem, PaginatedResponse } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, X } from "lucide-react";
import { totalPages } from "@/lib/pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { toast } from "sonner";

function NotificationsContent() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filterUserId, setFilterUserId] = useState("");
  const [filterUserSearch, setFilterUserSearch] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendUserId, setSendUserId] = useState("");
  const [sendUserSearch, setSendUserSearch] = useState("");
  const [sendType, setSendType] = useState<string>("manual_reminder");
  const [sendChannel, setSendChannel] = useState<string>("email");
  const [sendTitle, setSendTitle] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  const debouncedFilterUserSearch = useDebounce(filterUserSearch);
  const debouncedUserSearch = useDebounce(sendUserSearch);

  const { data: filterUserResults } = useQuery<PaginatedResponse<{ id: string; email: string; full_name: string | null }>>({
    queryKey: ["portal-users-search-filter", debouncedFilterUserSearch],
    queryFn: () => api.get(`/admin/portal-users?search=${encodeURIComponent(debouncedFilterUserSearch)}&limit=10`).then((r) => r.data),
    enabled: debouncedFilterUserSearch.length >= 2 && !filterUserId,
  });
  const filterUsers = filterUserResults?.data || [];

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (status !== "all") params.set("status", status);
  if (filterUserId) params.set("user_id", filterUserId);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<NotificationItem>>({
    queryKey: ["notifications", params.toString()],
    queryFn: () => api.get(`/admin/notifications?${params}`).then((r) => r.data),
  });

  const { data: userSearchResults } = useQuery<PaginatedResponse<{ id: string; email: string; full_name: string | null }>>({
    queryKey: ["portal-users-search", debouncedUserSearch],
    queryFn: () => api.get(`/admin/portal-users?search=${encodeURIComponent(debouncedUserSearch)}&limit=10`).then((r) => r.data),
    enabled: sendOpen && debouncedUserSearch.length >= 2 && !sendUserId,
  });

  const usersForSend = userSearchResults?.data || [];

  async function handleSendNotification() {
    if (!sendUserId || !sendTitle.trim() || !sendBody.trim()) {
      toast.error("Заполните обязательные поля");
      return;
    }
    setSendLoading(true);
    try {
      const channels = sendChannel === "both" ? ["email", "telegram"] : [sendChannel];
      await api.post("/admin/notifications/send", {
        user_id: sendUserId,
        type: sendType,
        title: sendTitle,
        body: sendBody,
        channels,
      });
      toast.success("Уведомление отправлено");
      setSendOpen(false);
      setSendUserId("");
      setSendUserSearch("");
      setSendTitle("");
      setSendBody("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch { /* handled by interceptor */ }
    finally { setSendLoading(false); }
  }

  const columns = useMemo<ColumnDef<NotificationItem>[]>(() => [
    {
      accessorKey: "created_at",
      header: "Дата",
      cell: ({ row }) => format(new Date(row.original.created_at), "dd.MM.yyyy HH:mm"),
    },
    { accessorKey: "user_id", header: "Пользователь", cell: ({ row }) => <span className="text-xs font-mono">{row.original.user_id}</span> },
    { accessorKey: "title", header: "Тема" },
    {
      accessorKey: "template_code",
      header: "Тип",
      cell: ({ row }) => {
        const labels: Record<string, string> = { reminder: "Напоминание", payment: "Оплата", moderation: "Модерация", manual: "Ручное", manual_reminder: "Напоминание", custom: "Произвольное" };
        return <StatusBadge status={row.original.template_code} label={labels[row.original.template_code] || row.original.template_code} />;
      },
    },
    {
      accessorKey: "channel",
      header: "Канал",
      cell: ({ row }) => {
        const labels: Record<string, string> = { email: "Email", telegram: "Telegram", both: "Email + TG" };
        return labels[row.original.channel] || row.original.channel;
      },
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ], []);

  const hasFilters = status !== "all" || !!filterUserId;

  if (error) return <ErrorState message="Не удалось загрузить уведомления" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Уведомления" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        <Button onClick={() => setSendOpen(true)}>
          <Send className="mr-2 h-4 w-4" /> Отправить уведомление
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="sent">Отправлено</SelectItem>
            <SelectItem value="failed">Ошибка</SelectItem>
            <SelectItem value="pending">Ожидает</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Input
            className="w-64"
            value={filterUserSearch}
            onChange={(e) => { setFilterUserSearch(e.target.value); setFilterUserId(""); setPage(1); }}
            placeholder="Фильтр по пользователю..."
          />
          {filterUsers.length > 0 && !filterUserId && (
            <div className="absolute z-10 mt-1 w-full border rounded-md bg-popover max-h-40 overflow-auto shadow-md">
              {filterUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => { setFilterUserId(u.id); setFilterUserSearch(`${u.full_name || ""} (${u.email})`); setPage(1); }}
                >
                  {u.full_name ? `${u.full_name} — ${u.email}` : u.email}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatus("all"); setFilterUserId(""); setFilterUserSearch(""); setPage(1); }}>
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
        emptyTitle="Нет уведомлений"
      />

      <Dialog open={sendOpen} onOpenChange={(open) => { if (!open) { setSendUserId(""); setSendUserSearch(""); setSendTitle(""); setSendBody(""); } setSendOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Отправить уведомление</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Пользователь (поиск по email/ФИО)</Label>
              <Input
                value={sendUserSearch}
                onChange={(e) => { setSendUserSearch(e.target.value); setSendUserId(""); }}
                placeholder="Начните вводить..."
              />
              {usersForSend.length > 0 && !sendUserId && (
                <div className="border rounded-md max-h-32 overflow-auto">
                  {usersForSend.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => { setSendUserId(u.id); setSendUserSearch(`${u.full_name || ""} (${u.email})`); }}
                    >
                      {u.full_name ? `${u.full_name} — ${u.email}` : u.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={sendType} onValueChange={setSendType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_reminder">Напоминание</SelectItem>
                  <SelectItem value="custom">Произвольное</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Канал</Label>
              <Select value={sendChannel} onValueChange={setSendChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="both">Email + Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="send-title">Тема</Label>
              <Input id="send-title" value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Заголовок" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="send-body">Текст</Label>
              <Input id="send-body" value={sendBody} onChange={(e) => setSendBody(e.target.value)} placeholder="Содержимое" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendOpen(false)}>Отмена</Button>
              <Button onClick={handleSendNotification} disabled={sendLoading}>Отправить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NotificationsPage() {
  return <Suspense><NotificationsContent /></Suspense>;
}
