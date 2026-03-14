"use client";

import type { Receipt } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: Receipt[] | null;
}

export function ReceiptDialog({ open, onOpenChange, receipts }: ReceiptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Чек</DialogTitle></DialogHeader>
        {receipts?.map((r) => (
          <div key={r.id} className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Тип:</span> {r.receipt_type}</div>
              <div><span className="text-muted-foreground">Статус:</span> {r.status}</div>
              {r.fiscal_number && <div><span className="text-muted-foreground">Фискальный №:</span> {r.fiscal_number}</div>}
              {r.fiscal_document && <div><span className="text-muted-foreground">Документ:</span> {r.fiscal_document}</div>}
              {r.fiscal_sign && <div><span className="text-muted-foreground">Признак:</span> {r.fiscal_sign}</div>}
              <div><span className="text-muted-foreground">Сумма:</span> {r.amount.toLocaleString("ru-RU")} ₽</div>
            </div>
            {r.receipt_url && (
              <Button asChild variant="outline" size="sm">
                <a href={r.receipt_url} target="_blank" rel="noreferrer">Открыть на сайте ОФД</a>
              </Button>
            )}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
