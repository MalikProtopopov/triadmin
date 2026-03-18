"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ProductType } from "@/types";
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

export function ManualPaymentModal({ open, onOpenChange }: ManualPaymentModalProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [productType, setProductType] = useState<ProductType>("entry_fee");
  const [description, setDescription] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [eventRegistrationId, setEventRegistrationId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: userSearchResults } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["users-search", userSearch],
    queryFn: () => api.get(`/admin/portal-users?search=${encodeURIComponent(userSearch)}&limit=10`).then((r) => r.data),
    enabled: open && userSearch.length >= 2 && !userId,
  });

  const users = userSearchResults?.data || [];

  function handleOpenChange(o: boolean) {
    if (!o) {
      setUserId("");
      setUserSearch("");
      setAmount("");
      setDescription("");
      setSubscriptionId("");
      setEventRegistrationId("");
    }
    onOpenChange(o);
  }

  async function handleSubmit() {
    const numAmount = parseFloat(amount);
    if (!userId || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Заполните обязательные поля");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: userId,
        amount: numAmount,
        product_type: productType,
        description: description || "Ручной платёж",
      };
      if ((productType === "subscription" || productType === "entry_fee") && subscriptionId) {
        payload.subscription_id = subscriptionId;
      }
      if (productType === "event" && eventRegistrationId) {
        payload.event_registration_id = eventRegistrationId;
      }
      await api.post("/admin/payments/manual", payload);
      toast.success("Платёж создан");
      handleOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Добавить платёж</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Пользователь (поиск по email/ФИО)</Label>
            <Input value={userSearch} onChange={(e) => { setUserSearch(e.target.value); if (userId) setUserId(""); }} placeholder="Начните вводить..." />
            {users.length > 0 && !userId && (
              <div className="border rounded-md max-h-32 overflow-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => { setUserId(u.id); setUserSearch(`${u.full_name} (${u.email})`); }}
                  >
                    {u.full_name} — {u.email}
                  </button>
                ))}
              </div>
            )}
            {userId && <p className="text-xs text-muted-foreground">Выбран: {userId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-amount">Сумма (₽) *</Label>
            <Input id="manual-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Тип продукта *</Label>
            <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entry_fee">Вступительный</SelectItem>
                <SelectItem value="subscription">Подписка</SelectItem>
                <SelectItem value="event">Мероприятие</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(productType === "subscription" || productType === "entry_fee") && (
            <div className="space-y-2">
              <Label htmlFor="manual-sub-id">ID подписки (опционально)</Label>
              <Input id="manual-sub-id" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} placeholder="UUID подписки для автоактивации" />
              <p className="text-xs text-muted-foreground">Если указать, подписка будет активирована автоматически</p>
            </div>
          )}
          {productType === "event" && (
            <div className="space-y-2">
              <Label htmlFor="manual-reg-id">ID регистрации (опционально)</Label>
              <Input id="manual-reg-id" value={eventRegistrationId} onChange={(e) => setEventRegistrationId(e.target.value)} placeholder="UUID регистрации для подтверждения" />
              <p className="text-xs text-muted-foreground">Если указать, регистрация будет подтверждена автоматически</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="manual-desc">Описание *</Label>
            <Input id="manual-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ручной платёж" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={loading}>Создать</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
