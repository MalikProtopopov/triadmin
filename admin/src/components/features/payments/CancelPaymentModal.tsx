"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaymentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AxiosError } from "axios";

interface CancelPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentItem | null;
  onClose: () => void;
}

export function CancelPaymentModal({
  open,
  onOpenChange,
  payment,
  onClose,
}: CancelPaymentModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  function handleOpenChange(o: boolean) {
    if (!o) onClose();
    onOpenChange(o);
  }

  async function handleCancel() {
    if (!payment || !reason.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(
        `/admin/payments/${payment.id}/cancel`,
        { reason: reason.trim() },
        { skipErrorToast: true }
      );
      toast.success(data.message);
      onClose();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const detail = axiosErr.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Ошибка при отмене");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отмена платежа</DialogTitle>
        </DialogHeader>
        {payment && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Вы уверены, что хотите отменить платёж на сумму{" "}
              <b>{payment.amount.toLocaleString("ru-RU")} ₽</b> для{" "}
              {payment.user?.full_name || payment.user?.email || "—"}?
            </p>
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Связанная подписка или регистрация на мероприятие также будет
                отменена.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Причина отмены</Label>
              <Textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Укажите причину отмены"
                maxLength={500}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Назад
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading || !reason.trim()}
              >
                {loading ? "Отмена..." : "Отменить платёж"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
