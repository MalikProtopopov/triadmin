"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  CreateProtocolHistoryRequest,
  DoctorListItem,
  PatchProtocolHistoryRequest,
  ProtocolActionType,
  ProtocolHistoryResponse,
  PaginatedResponse,
} from "@/types";
import { doctorListItemLabel } from "@/lib/doctorList";
import { useDebounce } from "@/hooks/useDebounce";
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

function DoctorPickerField({
  id,
  search,
  onSearchChange,
  doctorUserId,
  onClearDoctor,
  onSelectDoctor,
  queryKeySuffix,
  enabled,
}: {
  id?: string;
  search: string;
  onSearchChange: (v: string) => void;
  doctorUserId: string;
  onClearDoctor: () => void;
  onSelectDoctor: (userId: string, label: string) => void;
  queryKeySuffix: string;
  enabled: boolean;
}) {
  const debounced = useDebounce(search, 300);
  const {
    data: doctorsPage,
    isFetching,
    isFetched,
  } = useQuery<PaginatedResponse<DoctorListItem>>({
    queryKey: ["admin-doctors-protocol-dialog", queryKeySuffix, debounced],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set("limit", "30");
      sp.set("offset", "0");
      sp.set("search", debounced);
      sp.set("sort_by", "created_at");
      sp.set("sort_order", "desc");
      return api.get(`/admin/doctors?${sp}`).then((r) => r.data);
    },
    enabled: enabled && debounced.length >= 2 && !doctorUserId,
  });
  const options = doctorsPage?.data ?? [];
  const showEmpty =
    enabled && debounced.length >= 2 && !doctorUserId && isFetched && !isFetching && options.length === 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Врач</Label>
      <p className="text-xs text-muted-foreground">
        Каталог врачей: от 2 символов фамилии или email, затем выбор из списка.
      </p>
      <div className="relative">
        <div className="flex gap-2 items-center">
          <Input
            id={id}
            className="min-w-0 flex-1"
            placeholder="Фамилия или email…"
            autoComplete="off"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {doctorUserId && (
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onClearDoctor}>
              Сбросить
            </Button>
          )}
        </div>
        {!doctorUserId && options.length > 0 && debounced.length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 border rounded-md bg-popover shadow-md max-h-40 overflow-auto">
            {options.map((d) => (
              <button
                key={d.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => onSelectDoctor(d.user_id, doctorListItemLabel(d))}
              >
                {doctorListItemLabel(d)}
              </button>
            ))}
          </div>
        )}
      </div>
      {enabled && !doctorUserId && search.length > 0 && search.length < 2 && (
        <p className="text-xs text-muted-foreground">Введите ещё символы.</p>
      )}
      {enabled && debounced.length >= 2 && !doctorUserId && isFetching && (
        <p className="text-xs text-muted-foreground">Ищем врачей…</p>
      )}
      {showEmpty && (
        <p className="text-xs text-amber-800 dark:text-amber-200">Ничего не найдено. Попробуйте другой запрос.</p>
      )}
    </div>
  );
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
          <DoctorPickerField
            id="protocol-create-doctor"
            search={userSearch}
            onSearchChange={(v) => {
              setUserSearch(v);
              if (doctorUserId) setDoctorUserId("");
            }}
            doctorUserId={doctorUserId}
            onClearDoctor={() => {
              setDoctorUserId("");
              setUserSearch("");
            }}
            onSelectDoctor={(userId, label) => {
              setDoctorUserId(userId);
              setUserSearch(label);
            }}
            queryKeySuffix="create"
            enabled={open}
          />
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
        <DoctorPickerField
          id={`protocol-edit-doctor-${entry.id}`}
          search={userSearch}
          onSearchChange={(v) => {
            setUserSearch(v);
            if (doctorUserId) setDoctorUserId("");
          }}
          doctorUserId={doctorUserId}
          onClearDoctor={() => {
            setDoctorUserId("");
            setUserSearch("");
          }}
          onSelectDoctor={(userId, label) => {
            setDoctorUserId(userId);
            setUserSearch(label);
          }}
          queryKeySuffix={`edit-${entry.id}`}
          enabled
        />
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
