"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import api from "@/lib/api";
import type { PaymentItem, PaymentsSummary, PaginatedResponse, Receipt } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ReceiptDialog } from "@/components/features/payments/ReceiptDialog";
import { RefundModal } from "@/components/features/payments/RefundModal";
import { CancelPaymentModal } from "@/components/features/payments/CancelPaymentModal";
import { Input } from "@/components/ui/input";
import { Receipt as ReceiptIcon, X, RotateCcw, ArrowUp, ArrowDown, Copy, XCircle, CheckCircle, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { totalPages } from "@/lib/pagination";
import { Suspense } from "react";

const showManualConfirm =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_MANUAL_CONFIRM === "true";

function PaymentsContent() {
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<Receipt[] | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<PaymentItem | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPayment, setCancelPayment] = useState<PaymentItem | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [filterUserSearch, setFilterUserSearch] = useState("");

  const { data: userHints } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["users-search-payments", filterUserSearch],
    queryFn: () => api.get(`/admin/portal-users?search=${encodeURIComponent(filterUserSearch)}&limit=10`).then((r) => r.data),
    enabled: filterUserSearch.length >= 2 && !filterUserId,
  });

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  params.set("sort_by", "created_at");
  params.set("sort_order", sortOrder);
  if (productType !== "all") params.set("product_type", productType);
  if (status !== "all") params.set("status", status);
  if (dateRange?.from) params.set("date_from", format(dateRange.from, "yyyy-MM-dd"));
  if (dateRange?.to) params.set("date_to", format(dateRange.to, "yyyy-MM-dd"));
  if (filterUserId) params.set("user_id", filterUserId);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<PaymentItem> & { summary: PaymentsSummary }>({
    queryKey: ["payments", params.toString()],
    queryFn: () => api.get(`/admin/payments?${params}`).then((r) => r.data),
  });

  const openReceipt = useCallback(async (paymentId: string) => {
    try {
      const { data } = await api.get(`/subscriptions/payments/${paymentId}/receipt`);
      setReceiptData(Array.isArray(data) ? data : [data]);
      setReceiptOpen(true);
    } catch { /* handled by interceptor */ }
  }, []);

  const handleConfirm = useCallback(
    async (paymentId: string) => {
      setConfirmLoading(paymentId);
      try {
        const { data } = await api.post(`/admin/payments/${paymentId}/confirm`);
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["payments"] });
      } catch { /* handled by interceptor */ }
      finally {
        setConfirmLoading(null);
      }
    },
    [queryClient]
  );

  const toggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  }, []);

  const columns = useMemo<ColumnDef<PaymentItem>[]>(() => {
    const SortIcon = sortOrder === "desc" ? ArrowDown : ArrowUp;
    return [
      {
        accessorKey: "created_at",
        header: () => (
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={toggleSort}>
            Дата <SortIcon className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const d = row.original.paid_at || row.original.created_at;
          return format(new Date(d), "dd.MM.yyyy HH:mm");
        },
      },
      {
        accessorKey: "user",
        header: "Плательщик",
        cell: ({ row }) => {
          const u = row.original.user;
          if (!u) return "—";
          return (
            <div>
              <p className="font-medium text-sm">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "product_type",
        header: "Тип",
        cell: ({ row }) => <StatusBadge status={row.original.product_type} />,
      },
      {
        id: "event_link",
        header: "Связь",
        cell: ({ row }) => {
          const p = row.original;
          if (p.product_type !== "event") return null;
          if (p.event?.id) {
            return (
              <Button asChild variant="ghost" size="sm" className="h-7">
                <Link href={`/admin/events/${p.event.id}`}>
                  <CalendarDays className="mr-1 h-3 w-3" /> Мероприятие
                </Link>
              </Button>
            );
          }
          if (p.event_registration_id) {
            return (
              <span className="text-xs text-muted-foreground" title={`Регистрация: ${p.event_registration_id}`}>
                ID регистрации
              </span>
            );
          }
          return null;
        },
      },
      {
        accessorKey: "amount",
        header: "Сумма",
        cell: ({ row }) => {
          const p = row.original;
          const title = p.description ? `Описание: ${p.description}` : undefined;
          return (
            <span title={title} className={p.description ? "cursor-help" : ""}>
              {p.amount.toLocaleString("ru-RU")} ₽
            </span>
          );
        },
      },
      {
        accessorKey: "payment_provider",
        header: "Провайдер",
        cell: ({ row }) => row.original.payment_provider || "—",
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <StatusBadge
              status={p.status}
              label={p.status_label}
              variant={p.status === "expired" ? "secondary" : undefined}
            />
          );
        },
      },
      {
        id: "expires_at",
        header: "Срок",
        cell: ({ row }) => {
          const p = row.original;
          if (p.status === "pending" && p.expires_at) {
            return format(new Date(p.expires_at), "dd.MM HH:mm");
          }
          return null;
        },
      },
      {
        id: "actions",
        header: "Действия",
        cell: ({ row }) => {
          const p = row.original;
          if (p.status === "pending") {
            const openCancel = () => {
              setCancelPayment(p);
              setCancelOpen(true);
            };
            if (p.payment_url) {
              return (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(p.payment_url!);
                        toast.success("Ссылка скопирована");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Скопировать ссылку
                    </Button>
                    {showManualConfirm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleConfirm(p.id)}
                        disabled={confirmLoading === p.id}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {confirmLoading === p.id ? "..." : "Подтвердить вручную"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={openCancel}>
                      <XCircle className="mr-1 h-3 w-3" /> Отменить
                    </Button>
                  </div>
                  {p.expires_at && (
                    <span className="text-xs text-muted-foreground">до {format(new Date(p.expires_at), "dd.MM HH:mm")}</span>
                  )}
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-sm text-muted-foreground">Ссылка истекла</span>
                {showManualConfirm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleConfirm(p.id)}
                    disabled={confirmLoading === p.id}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {confirmLoading === p.id ? "..." : "Подтвердить вручную"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={openCancel}>
                  <XCircle className="mr-1 h-3 w-3" /> Отменить
                </Button>
              </div>
            );
          }
          if (p.status === "succeeded" || p.status === "partially_refunded") {
            return (
              <div className="flex items-center gap-1">
                {p.has_receipt && (
                  <Button variant="ghost" size="icon" onClick={() => openReceipt(p.id)} title="Чек">
                    <ReceiptIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRefundPayment(p);
                    setRefundOpen(true);
                  }}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Возврат
                </Button>
              </div>
            );
          }
          return null;
        },
      },
    ];
  }, [sortOrder, toggleSort, openReceipt, handleConfirm, confirmLoading]);

  const hasFilters = productType !== "all" || status !== "all" || !!dateRange?.from || !!filterUserId;

  if (error) return <ErrorState message="Не удалось загрузить платежи" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Платежи" }]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Платежи</h1>
      </div>

      {data?.summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Общая сумма</p>
              <p className="text-xl font-bold">{data.summary.total_amount.toLocaleString("ru-RU")} ₽</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Оплачено</p>
              <p className="text-xl font-bold">{data.summary.count_completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Ожидают</p>
              <p className="text-xl font-bold">{data.summary.count_pending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={productType} onValueChange={(v) => { setProductType(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="entry_fee">Вступительный</SelectItem>
            <SelectItem value="subscription">Подписка</SelectItem>
            <SelectItem value="event">Мероприятие</SelectItem>
            <SelectItem value="membership_arrears">Членские взносы (долг)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending">Ожидает</SelectItem>
            <SelectItem value="succeeded">Оплачен</SelectItem>
            <SelectItem value="failed">Отклонён</SelectItem>
            <SelectItem value="expired">Истёк</SelectItem>
            <SelectItem value="refunded">Возвращён</SelectItem>
            <SelectItem value="partially_refunded">Частичный возврат</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          value={dateRange}
          onChange={(r) => { setDateRange(r); setPage(1); }}
          placeholder="Период"
        />
        <div className="relative">
          <Input
            className="w-56"
            placeholder="Плательщик..."
            value={filterUserSearch}
            onChange={(e) => { setFilterUserSearch(e.target.value); if (filterUserId) { setFilterUserId(""); setPage(1); } }}
          />
          {(userHints?.data?.length ?? 0) > 0 && !filterUserId && (
            <div className="absolute z-10 mt-1 w-full border rounded-md bg-background shadow-md max-h-40 overflow-auto">
              {userHints!.data.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => { setFilterUserId(u.id); setFilterUserSearch(`${u.full_name} (${u.email})`); setPage(1); }}
                >
                  {u.full_name} — {u.email}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setProductType("all"); setStatus("all"); setDateRange(undefined); setFilterUserId(""); setFilterUserSearch(""); setPage(1); }}>
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
        emptyTitle="Нет платежей"
      />

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} receipts={receiptData} />

      <RefundModal
        open={refundOpen}
        onOpenChange={setRefundOpen}
        payment={refundPayment}
        onClose={() => setRefundPayment(null)}
      />

      <CancelPaymentModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        payment={cancelPayment}
        onClose={() => setCancelPayment(null)}
      />

    </div>
  );
}

export default function PaymentsPage() {
  return <Suspense><PaymentsContent /></Suspense>;
}
