"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ManualPaymentRequest, ProductType, ArrearItem, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ManualPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "entry_fee", label: "Вступительный взнос" },
  { value: "subscription", label: "Подписка" },
  { value: "event", label: "Мероприятие" },
  { value: "membership_arrears", label: "Членские взносы (долг)" },
];

export function ManualPaymentModal({ open, onOpenChange }: ManualPaymentModalProps) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [productType, setProductType] = useState<ProductType>("subscription");
  const [description, setDescription] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [eventRegistrationId, setEventRegistrationId] = useState("");
  const [arrearId, setArrearId] = useState("");

  const { data: userHints } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["users-search-manual-payment", userSearch],
    queryFn: () =>
      api.get(`/admin/portal-users?search=${encodeURIComponent(userSearch)}&limit=10`).then((r) => r.data),
    enabled: open && userSearch.length >= 2 && !userId,
  });

  const { data: openArrears } = useQuery<PaginatedResponse<ArrearItem>>({
    queryKey: ["arrears-manual-payment", userId],
    queryFn: () =>
      api
        .get(`/admin/arrears?user_id=${encodeURIComponent(userId)}&status=open&limit=50`)
        .then((r) => r.data),
    enabled: open && !!userId && productType === "membership_arrears",
  });

  function reset() {
    setUserSearch("");
    setUserId("");
    setAmount("");
    setProductType("subscription");
    setDescription("");
    setSubscriptionId("");
    setEventRegistrationId("");
    setArrearId("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit() {
    if (!userId) {
      toast.error("Выберите пользователя");
      return;
    }
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Укажите сумму");
      return;
    }
    const desc = description.trim();
    if (!desc) {
      toast.error("Укажите описание");
      return;
    }

    const body: ManualPaymentRequest = {
      user_id: userId,
      amount: num,
      product_type: productType,
      description: desc,
    };

    if (productType === "subscription" || productType === "entry_fee") {
      if (subscriptionId.trim()) body.subscription_id = subscriptionId.trim();
    }
    if (productType === "event" && eventRegistrationId.trim()) {
      body.event_registration_id = eventRegistrationId.trim();
    }
    if (productType === "membership_arrears") {
      if (!arrearId.trim()) {
        toast.error("Выберите долг (arrear_id)");
        return;
      }
      const selected = openArrears?.data?.find((a) => a.id === arrearId);
      if (selected && selected.amount !== num) {
        toast.error("Сумма должна совпадать с суммой долга");
        return;
      }
      body.arrear_id = arrearId.trim();
    }

    try {
      await api.post("/admin/payments/manual", body);
      toast.success("Платёж создан");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["arrears-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
      handleOpenChange(false);
    } catch {
      /* interceptor */
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ручной платёж</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Пользователь (поиск по email/ФИО)</Label>
            <Input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                if (userId) setUserId("");
              }}
              placeholder="Начните вводить..."
            />
            {(userHints?.data?.length ?? 0) > 0 && !userId && (
              <div className="border rounded-md max-h-32 overflow-auto">
                {userHints!.data.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setUserId(u.id);
                      setUserSearch(`${u.full_name} (${u.email})`);
                    }}
                  >
                    {u.full_name} — {u.email}
                  </button>
                ))}
              </div>
            )}
            {userId && <p className="text-xs text-muted-foreground">Выбран: {userId}</p>}
          </div>

          <div className="space-y-2">
            <Label>Сумма (₽) *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Тип продукта *</Label>
            <Select
              value={productType}
              onValueChange={(v) => {
                setProductType(v as ProductType);
                setArrearId("");
                setSubscriptionId("");
                setEventRegistrationId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(productType === "subscription" || productType === "entry_fee") && (
            <div className="space-y-2">
              <Label>ID подписки (необязательно)</Label>
              <Input value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} placeholder="uuid" />
            </div>
          )}

          {productType === "event" && (
            <div className="space-y-2">
              <Label>ID регистрации на мероприятие</Label>
              <Input
                value={eventRegistrationId}
                onChange={(e) => setEventRegistrationId(e.target.value)}
                placeholder="uuid"
              />
            </div>
          )}

          {productType === "membership_arrears" && userId && (
            <div className="space-y-2">
              <Label>Открытый долг *</Label>
              <Select value={arrearId} onValueChange={(id) => {
                setArrearId(id);
                const a = openArrears?.data?.find((x) => x.id === id);
                if (a) setAmount(String(a.amount));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите долг" />
                </SelectTrigger>
                <SelectContent>
                  {(openArrears?.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.amount.toLocaleString("ru-RU")} ₽
                      {a.year != null ? ` · ${a.year}` : ""}
                      {a.description ? ` — ${a.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(openArrears?.data?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">Нет открытых долгов у пользователя</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="manual-desc">Описание *</Label>
            <Input
              id="manual-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Назначение платежа"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void submit()}>
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
