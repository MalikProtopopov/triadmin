"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaymentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AxiosError } from "axios";

interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentItem | null;
  onClose: () => void;
}

export function RefundModal({ open, onOpenChange, payment, onClose }: RefundModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(payment?.amount ?? ""));
  const [fullRefund, setFullRefund] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isMoneta = payment?.payment_provider === "moneta";

  function handleOpenChange(o: boolean) {
    if (!o) onClose();
    onOpenChange(o);
  }

  async function handleRefund() {
    if (!payment) return;
    if (!fullRefund) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error("Укажите корректную сумму");
        return;
      }
    }
    setLoading(true);
    try {
      const refundAmount = fullRefund ? null : parseFloat(amount);
      await api.post(`/admin/payments/${payment.id}/refund`, { amount: refundAmount, reason });
      toast.success("Возврат создан");
      onClose();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string; code?: string }>;
      if (axiosErr.response?.status === 422) {
        const detail = axiosErr.response.data?.detail;
        const code = axiosErr.response.data?.code;
        if (code === "REFUND_EXCEEDS_AMOUNT" || (typeof detail === "string" && detail.toLowerCase().includes("exceed"))) {
          toast.error("Сумма возврата превышает сумму платежа");
        } else {
          toast.error(typeof detail === "string" ? detail : "Ошибка валидации");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Возврат средств</DialogTitle></DialogHeader>
        {payment && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Платёж: {payment.amount.toLocaleString("ru-RU")} ₽ — {payment.user?.full_name}</p>
            {isMoneta && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Провайдер Moneta не поддерживает автоматические возвраты. Возврат необходимо выполнить вручную через личный кабинет провайдера.</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="full-refund" checked={fullRefund} onCheckedChange={(v) => setFullRefund(v === true)} />
              <Label htmlFor="full-refund" className="cursor-pointer text-sm">Полный возврат</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Сумма возврата (₽)</Label>
              <Input
                id="refund-amount"
                type="number"
                value={fullRefund ? "" : amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={fullRefund ? "Полная сумма" : "0"}
                disabled={fullRefund}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Причина</Label>
              <Input id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Необязательно" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Отмена</Button>
              <Button onClick={handleRefund} disabled={loading}>Выполнить возврат</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
