"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  CreateProtocolHistoryRequest,
  PatchProtocolHistoryRequest,
  ProtocolActionType,
  ProtocolHistoryResponse,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ACTION_LABELS: Record<ProtocolActionType, string> = {
  admission: "Приём",
  exclusion: "Исключение",
};

function validateYear(y: number): boolean {
  return Number.isFinite(y) && y >= 2000 && y <= 2100;
}

export function CreateProtocolHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [doctorUserId, setDoctorUserId] = useState("");
  const [year, setYear] = useState("");
  const [protocolTitle, setProtocolTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<ProtocolActionType>("admission");

  const { data: userHints } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["portal-users-protocol-history", userSearch],
    queryFn: () =>
      api.get(`/admin/portal-users?search=${encodeURIComponent(userSearch)}&limit=10`).then((r) => r.data),
    enabled: open && userSearch.length >= 2 && !doctorUserId,
  });

  const mutation = useMutation({
    mutationFn: (body: CreateProtocolHistoryRequest) => api.post("/admin/protocol-history", body),
    onSuccess: () => {
      toast.success("Запись создана");
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
      onOpenChange(false);
      setUserSearch("");
      setDoctorUserId("");
      setYear("");
      setProtocolTitle("");
      setNotes("");
      setActionType("admission");
    },
  });

  function submit() {
    if (!doctorUserId) {
      toast.error("Выберите врача (пользователя)");
      return;
    }
    const y = parseInt(year.trim(), 10);
    if (!validateYear(y)) {
      toast.error("Год: укажите число от 2000 до 2100");
      return;
    }
    const title = protocolTitle.trim();
    if (!title) {
      toast.error("Укажите название протокола");
      return;
    }
    const body: CreateProtocolHistoryRequest = {
      year: y,
      protocol_title: title,
      doctor_user_id: doctorUserId,
      action_type: actionType,
      notes: notes.trim() || null,
    };
    mutation.mutate(body);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить запись</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Врач (email / ФИО)</Label>
            <Input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                if (doctorUserId) setDoctorUserId("");
              }}
              placeholder="Начните вводить..."
            />
            {(userHints?.data?.length ?? 0) > 0 && !doctorUserId && (
              <div className="border rounded-md max-h-32 overflow-auto">
                {userHints!.data.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setDoctorUserId(u.id);
                      setUserSearch(`${u.full_name} (${u.email})`);
                    }}
                  >
                    {u.full_name} — {u.email}
                  </button>
                ))}
              </div>
            )}
            {doctorUserId && <p className="text-xs text-muted-foreground">ID: {doctorUserId}</p>}
          </div>
          <div className="space-y-2">
            <Label>Год</Label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2000–2100"
            />
          </div>
          <div className="space-y-2">
            <Label>Название протокола</Label>
            <Input value={protocolTitle} onChange={(e) => setProtocolTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Тип действия</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as ProtocolActionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admission">{ACTION_LABELS.admission}</SelectItem>
                <SelectItem value="exclusion">{ACTION_LABELS.exclusion}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Заметки</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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

function EditProtocolHistoryForm({
  entry,
  onDone,
}: {
  entry: ProtocolHistoryResponse;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState(
    () => `${entry.doctor.full_name ?? entry.doctor.email} (${entry.doctor.email})`
  );
  const [doctorUserId, setDoctorUserId] = useState(entry.doctor_user_id);
  const [year, setYear] = useState(String(entry.year));
  const [protocolTitle, setProtocolTitle] = useState(entry.protocol_title);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [actionType, setActionType] = useState<ProtocolActionType>(entry.action_type);

  const { data: userHints } = useQuery<{ data: { id: string; email: string; full_name: string }[] }>({
    queryKey: ["portal-users-protocol-history-edit", userSearch],
    queryFn: () =>
      api.get(`/admin/portal-users?search=${encodeURIComponent(userSearch)}&limit=10`).then((r) => r.data),
    enabled: userSearch.length >= 2 && !doctorUserId,
  });

  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchProtocolHistoryRequest }) =>
      api.patch(`/admin/protocol-history/${id}`, body),
    onSuccess: () => {
      toast.success("Сохранено");
      queryClient.invalidateQueries({ queryKey: ["protocol-history"] });
      onDone();
    },
  });

  function submit() {
    const y = parseInt(year.trim(), 10);
    if (!validateYear(y)) {
      toast.error("Год: укажите число от 2000 до 2100");
      return;
    }
    const title = protocolTitle.trim();
    if (!title) {
      toast.error("Укажите название протокола");
      return;
    }
    if (!doctorUserId) {
      toast.error("Выберите врача");
      return;
    }
    const body: PatchProtocolHistoryRequest = {
      year: y,
      protocol_title: title,
      notes: notes.trim() || null,
      doctor_user_id: doctorUserId,
      action_type: actionType,
    };
    mutation.mutate({ id: entry.id, body });
  }

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Врач (email / ФИО)</Label>
          <Input
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              if (doctorUserId) setDoctorUserId("");
            }}
            placeholder="Начните вводить..."
          />
          {(userHints?.data?.length ?? 0) > 0 && !doctorUserId && (
            <div className="border rounded-md max-h-32 overflow-auto">
              {userHints!.data.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setDoctorUserId(u.id);
                    setUserSearch(`${u.full_name} (${u.email})`);
                  }}
                >
                  {u.full_name} — {u.email}
                </button>
              ))}
            </div>
          )}
          {doctorUserId && <p className="text-xs text-muted-foreground">ID: {doctorUserId}</p>}
        </div>
        <div className="space-y-2">
          <Label>Год</Label>
          <Input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Название протокола</Label>
          <Input value={protocolTitle} onChange={(e) => setProtocolTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Тип действия</Label>
          <Select value={actionType} onValueChange={(v) => setActionType(v as ProtocolActionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admission">{ACTION_LABELS.admission}</SelectItem>
              <SelectItem value="exclusion">{ACTION_LABELS.exclusion}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Заметки</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onDone}>
          Отмена
        </Button>
        <Button onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? "…" : "Сохранить"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditProtocolHistoryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ProtocolHistoryResponse | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Изменить запись</DialogTitle>
        </DialogHeader>
        {entry && (
          <EditProtocolHistoryForm key={entry.id} entry={entry} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDeleteProtocolHistoryDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить запись?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Действие необратимо.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
