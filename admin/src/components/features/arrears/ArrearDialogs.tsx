"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  ArrearItem,
  CreateArrearRequest,
  PatchArrearRequest,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function CreateArrearDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");

  const { data: userHints } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["portal-users-search-arrears", userSearch],
    queryFn: () =>
      api.get(`/admin/portal-users?search=${encodeURIComponent(userSearch)}&limit=10`).then((r) => r.data),
    enabled: open && userSearch.length >= 2 && !userId,
  });

  const mutation = useMutation({
    mutationFn: (body: CreateArrearRequest) => api.post("/admin/arrears", body),
    onSuccess: () => {
      toast.success("Долг создан");
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["arrears-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      setUserSearch("");
      setUserId("");
      setAmount("");
      setYear("");
      setDescription("");
      setNote("");
    },
  });

  function submit() {
    if (!userId) {
      toast.error("Выберите пользователя");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      toast.error("Укажите сумму");
      return;
    }
    const body: CreateArrearRequest = {
      user_id: userId,
      amount: a,
      description: description || undefined,
      admin_note: note.trim() || undefined,
    };
    const yearTrim = year.trim();
    if (yearTrim) {
      const y = parseInt(yearTrim, 10);
      if (!Number.isFinite(y) || y < 2000 || y > 2100) {
        toast.error("Год: укажите число от 2000 до 2100 или оставьте поле пустым");
        return;
      }
      body.year = y;
    }
    mutation.mutate(body);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать задолженность</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Пользователь (email / ФИО)</Label>
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
            {userId && <p className="text-xs text-muted-foreground">ID: {userId}</p>}
          </div>
          <div className="space-y-2">
            <Label>Сумма (₽)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Год (необязательно)</Label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
            />
            <p className="text-xs text-muted-foreground">Если указан — от 2000 до 2100 (требование API)</p>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Заметка</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "…" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditArrearForm({
  arrear,
  onDone,
}: {
  arrear: ArrearItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(arrear.amount));
  const [description, setDescription] = useState(arrear.description ?? "");
  const [note, setNote] = useState(arrear.admin_note ?? arrear.note ?? "");

  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchArrearRequest }) =>
      api.patch(`/admin/arrears/${id}`, body),
    onSuccess: () => {
      toast.success("Сохранено");
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["arrears-summary"] });
      onDone();
    },
  });

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Сумма (₽)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Заметка</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Отмена
        </Button>
        <Button
          onClick={() => {
            const a = Number(amount);
            if (!Number.isFinite(a) || a <= 0) {
              toast.error("Укажите сумму");
              return;
            }
            mutation.mutate({
              id: arrear.id,
              body: {
                amount: a,
                description: description || null,
                admin_note: note || null,
              },
            });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "…" : "Сохранить"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditArrearDialog({
  arrear,
  open,
  onOpenChange,
}: {
  arrear: ArrearItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Изменить долг</DialogTitle>
        </DialogHeader>
        {arrear && (
          <EditArrearForm key={arrear.id} arrear={arrear} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function WaiveArrearDialog({
  arrear,
  open,
  onOpenChange,
}: {
  arrear: ArrearItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: ({ id, waive_reason }: { id: string; waive_reason: string }) =>
      api.post(`/admin/arrears/${id}/waive`, { waive_reason }),
    onSuccess: () => {
      toast.success("Долг прощён");
      queryClient.invalidateQueries({ queryKey: ["arrears"] });
      queryClient.invalidateQueries({ queryKey: ["arrears-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      setReason("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Прощение долга</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Причина (аудит)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Обязательно для бухгалтерии" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              if (!arrear) return;
              const w = reason.trim();
              if (!w) {
                toast.error("Укажите причину");
                return;
              }
              mutation.mutate({ id: arrear.id, waive_reason: w });
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "…" : "Прощение"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmArrearDialog({
  title,
  description,
  open,
  onOpenChange,
  onConfirm,
  confirmLabel,
  isPending,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  confirmLabel: string;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
