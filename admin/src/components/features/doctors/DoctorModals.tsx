"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DoctorDetail } from "@/types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DoctorModalsProps {
  doctor: DoctorDetail;
  onInvalidate: () => void;
  approveOpen: boolean;
  setApproveOpen: (v: boolean) => void;
  rejectOpen: boolean;
  setRejectOpen: (v: boolean) => void;
  approveDraftOpen: boolean;
  setApproveDraftOpen: (v: boolean) => void;
  rejectDraftOpen: boolean;
  setRejectDraftOpen: (v: boolean) => void;
  toggleOpen: boolean;
  setToggleOpen: (v: boolean) => void;
  emailOpen: boolean;
  setEmailOpen: (v: boolean) => void;
  reminderOpen: boolean;
  setReminderOpen: (v: boolean) => void;
}

export function DoctorModals({
  doctor, onInvalidate,
  approveOpen, setApproveOpen,
  rejectOpen, setRejectOpen,
  approveDraftOpen, setApproveDraftOpen,
  rejectDraftOpen, setRejectDraftOpen,
  toggleOpen, setToggleOpen,
  emailOpen, setEmailOpen,
  reminderOpen, setReminderOpen,
}: DoctorModalsProps) {
  const doctorId = doctor.id;
  const fullName = `${doctor.last_name} ${doctor.first_name} ${doctor.middle_name || ""}`.trim();

  const [rejectComment, setRejectComment] = useState("");
  const [draftComment, setDraftComment] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");

  const moderate = useMutation({
    mutationFn: (body: { action: string; comment?: string }) =>
      api.post(`/admin/doctors/${doctorId}/moderate`, body),
    onSuccess: () => {
      onInvalidate();
      setApproveOpen(false);
      setRejectOpen(false);
    },
  });

  const approveDraft = useMutation({
    mutationFn: (body: { action: string; rejection_reason?: string }) =>
      api.post(`/admin/doctors/${doctorId}/approve-draft`, body),
    onSuccess: () => {
      onInvalidate();
      setApproveDraftOpen(false);
      setRejectDraftOpen(false);
      setDraftComment("");
    },
    onError: (err: { response?: { data?: { error?: { code?: string; message?: string } } } }) => {
      const code = err?.response?.data?.error?.code;
      if (code === "REJECTION_COMMENT_REQUIRED") {
        toast.error("Укажите причину отклонения (минимум 10 символов)");
      } else {
        toast.error(err?.response?.data?.error?.message || "Ошибка");
      }
    },
  });

  const toggleActive = useMutation({
    mutationFn: (is_public: boolean) =>
      api.post(`/admin/doctors/${doctorId}/toggle-active`, { is_public }),
    onSuccess: () => {
      onInvalidate();
      setToggleOpen(false);
    },
  });

  const sendEmail = useMutation({
    mutationFn: () => api.post(`/admin/doctors/${doctorId}/send-email`, { subject: emailSubject, body: emailBody }),
    onSuccess: () => {
      toast.success("Письмо отправлено");
      setEmailOpen(false);
      setEmailSubject("");
      setEmailBody("");
    },
  });

  const sendReminder = useMutation({
    mutationFn: () => api.post(`/admin/doctors/${doctorId}/send-reminder`, { message: reminderMessage }),
    onSuccess: () => {
      toast.success("Напоминание отправлено");
      setReminderOpen(false);
      setReminderMessage("");
    },
  });

  return (
    <>
      <ConfirmDialog open={approveOpen} onOpenChange={setApproveOpen} title="Одобрить заявку?" description={`Врачу ${fullName} будет отправлено уведомление об одобрении с инструкцией по оплате вступительного взноса. Также будет сгенерирован сертификат.`} confirmLabel="Одобрить" isLoading={moderate.isPending} onConfirm={() => moderate.mutate({ action: "approve" })} />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Отклонить заявку</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Причина отказа</Label>
            <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Укажите причину..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Отмена</Button>
            <Button variant="destructive" disabled={rejectComment.length < 10 || moderate.isPending} onClick={() => moderate.mutate({ action: "reject", comment: rejectComment })}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={approveDraftOpen} onOpenChange={setApproveDraftOpen} title="Одобрить правки?" confirmLabel="Одобрить" isLoading={approveDraft.isPending} onConfirm={() => approveDraft.mutate({ action: "approve" })} />

      <Dialog open={rejectDraftOpen} onOpenChange={(open) => { setRejectDraftOpen(open); if (!open) setDraftComment(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Отклонить правки</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Причина отклонения (обязательно)</Label>
            <Textarea value={draftComment} onChange={(e) => setDraftComment(e.target.value)} placeholder="Минимум 10 символов" rows={4} />
            <p className="text-xs text-muted-foreground">Минимум 10 символов</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDraftOpen(false)}>Отмена</Button>
            <Button variant="destructive" disabled={approveDraft.isPending || draftComment.trim().length < 10} onClick={() => approveDraft.mutate({ action: "reject", rejection_reason: draftComment })}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={toggleOpen} onOpenChange={setToggleOpen} title={doctor.is_public ? "Деактивировать профиль?" : "Активировать профиль?"} variant={doctor.is_public ? "destructive" : "default"} confirmLabel={doctor.is_public ? "Деактивировать" : "Активировать"} isLoading={toggleActive.isPending} onConfirm={() => toggleActive.mutate(!(doctor.is_public ?? false))} />

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Написать email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Тема</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Текст</Label>
              <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Отмена</Button>
            <Button disabled={!emailSubject || emailBody.length < 10 || sendEmail.isPending} onClick={() => sendEmail.mutate()}>
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Отправить напоминание об оплате</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Стандартное напоминание будет отправлено на email и в Telegram (если привязан)</p>
          <div className="space-y-2">
            <Label>Дополнительный текст</Label>
            <Textarea value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} placeholder="Необязательно" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>Отмена</Button>
            <Button disabled={sendReminder.isPending} onClick={() => sendReminder.mutate()}>Отправить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
