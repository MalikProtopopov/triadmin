"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ArrearItem, BoardRole, DoctorDetail, PaginatedResponse } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { canManageFinance } from "@/lib/roles";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/shared/ErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, X, Power, PowerOff, Mail, Bell, FileWarning, ImageIcon, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildMediaUrl } from "@/lib/media";
import { ContentBlocksEditor } from "@/components/shared/ContentBlocksEditor";
import { DoctorModals } from "./DoctorModals";
import { CertificatesSection } from "./CertificatesSection";
import { PortalUserEventRegistrationsSection } from "@/components/features/events/PortalUserEventRegistrationsSection";
import { format } from "date-fns";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  medical_diploma: "Медицинский диплом",
  speciality_certificate: "Сертификат специалиста",
  retraining_cert: "Сертификат переподготовки",
  oncology_cert: "Сертификат по онкологии",
  additional_cert: "Дополнительный сертификат",
  passport: "Паспорт",
  other: "Прочее",
};

function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

const DRAFT_FIELD_LABELS: Record<string, string> = {
  photo_url: "Фото",
  bio: "Биография",
  public_email: "Email (публ.)",
  public_phone: "Телефон (публ.)",
  city: "Город",
  clinic_name: "Клиника",
  specialization: "Специализация",
  academic_degree: "Степень",
};

function draftFieldLabel(field: string): string {
  return DRAFT_FIELD_LABELS[field] || field;
}

interface DoctorProfileCardProps {
  doctor: DoctorDetail;
  onInvalidate: () => void;
}

const BOARD_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "—" },
  { value: "pravlenie", label: "Правление" },
  { value: "president", label: "Президент" },
];

export function DoctorProfileCard({ doctor, onInvalidate }: DoctorProfileCardProps) {
  const user = useAuth((s) => s.user);
  const finance = canManageFinance(user);

  const {
    data: arrearsData,
    isLoading: arrearsLoading,
    isError: arrearsError,
    refetch: refetchArrears,
  } = useQuery<PaginatedResponse<ArrearItem>>({
    queryKey: [
      "arrears",
      "doctor",
      doctor.user_id,
      { limit: 50, offset: 0, include_inactive: true },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("user_id", doctor.user_id);
      params.set("limit", "50");
      params.set("offset", "0");
      params.set("include_inactive", "true");
      return api.get(`/admin/arrears?${params.toString()}`).then((r) => r.data);
    },
    enabled: finance,
  });

  const paymentOverrides = useMutation({
    mutationFn: (entry_fee_exempt: boolean) =>
      api.patch(`/admin/doctors/${doctor.id}/payment-overrides`, { entry_fee_exempt }),
    onSuccess: () => {
      onInvalidate();
      toast.success("Настройки оплаты обновлены");
    },
  });

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveDraftOpen, setApproveDraftOpen] = useState(false);
  const [rejectDraftOpen, setRejectDraftOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const updateBoardRole = useMutation({
    mutationFn: (board_role: BoardRole | null) =>
      api.patch(`/admin/doctors/${doctor.id}`, { board_role }),
    onSuccess: () => {
      onInvalidate();
      toast.success("Роль в правлении обновлена");
    },
  });

  const fullName = `${doctor.last_name} ${doctor.first_name} ${doctor.middle_name || ""}`.trim();
  const isPending = doctor.moderation_status === "pending_review";
  const hasDraft = !!doctor.pending_draft;
  const isApproved = doctor.moderation_status === "approved";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Профиль врача</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
            <div className="flex gap-4 items-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={doctor.photo_url || undefined} />
                <AvatarFallback>{doctor.first_name[0]}{doctor.last_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{fullName}</h2>
                <p className="text-sm text-muted-foreground">{doctor.email}</p>
                {doctor.slug && <p className="text-xs text-muted-foreground font-mono">/doctors/{doctor.slug}</p>}
                <div className="flex gap-2 mt-1 flex-wrap">
                  <StatusBadge status={doctor.moderation_status} />
                  {doctor.subscription?.status && <StatusBadge status={doctor.subscription.status} />}
                  {doctor.is_public !== undefined && <StatusBadge status={doctor.is_public ? "active" : "deactivated"} label={doctor.is_public ? "Публичный" : "Скрыт"} />}
                  {doctor.entry_fee_exempt && (
                    <StatusBadge status="approved" label="Вступительный не требуется" />
                  )}
                  {doctor.membership_excluded_at && (
                    <span className="text-xs rounded-md border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-destructive">
                      Исключён из ассоциации {format(new Date(doctor.membership_excluded_at), "dd.MM.yyyy")}
                    </span>
                  )}
                </div>
                {finance && (
                  <div className="flex items-center gap-2 mt-3">
                    <Switch
                      id="entry-fee-exempt"
                      checked={!!doctor.entry_fee_exempt}
                      disabled={paymentOverrides.isPending}
                      onCheckedChange={(c) => paymentOverrides.mutate(c)}
                    />
                    <Label htmlFor="entry-fee-exempt" className="text-sm font-normal cursor-pointer">
                      Не требовать вступительный взнос (entry_fee_exempt)
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Роль в правлении</Label>
                  <Select
                    value={doctor.board_role ?? "none"}
                    onValueChange={(v) => {
                      const role = v === "none" ? null : (v as BoardRole);
                      updateBoardRole.mutate(role);
                    }}
                    disabled={updateBoardRole.isPending}
                  >
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARD_ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updateBoardRole.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{doctor.city?.name} {doctor.specialization ? `• ${doctor.specialization}` : ""}</p>
                {doctor.telegram_linked && doctor.tg_username && (
                  <p className="text-xs mt-0.5">
                    <a
                      href={`https://t.me/${doctor.tg_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0088cc] hover:underline inline-flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" /> @{doctor.tg_username}
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isPending && (
                <>
                  <Button size="sm" onClick={() => setApproveOpen(true)}><Check className="mr-1 h-3 w-3" /> Одобрить</Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}><X className="mr-1 h-3 w-3" /> Отклонить</Button>
                </>
              )}
              {hasDraft && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setApproveDraftOpen(true)}>Одобрить правки</Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectDraftOpen(true)}>Отклонить правки</Button>
                </>
              )}
              {isApproved && doctor.is_public !== undefined && (
                <Button size="sm" variant="outline" onClick={() => setToggleOpen(true)}>
                  {doctor.is_public ? <><PowerOff className="mr-1 h-3 w-3" /> Деактивировать</> : <><Power className="mr-1 h-3 w-3" /> Активировать</>}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setReminderOpen(true)}><Bell className="mr-1 h-3 w-3" /> Напоминание</Button>
              <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}><Mail className="mr-1 h-3 w-3" /> Email</Button>
            </div>
          </div>

          {(isPending || hasDraft) && (
            <Card className="border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileWarning className="h-4 w-4" /> Что на модерации
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {isPending && !hasDraft && <p>Первичная заявка (анкета и документы)</p>}
                {hasDraft && doctor.pending_draft && doctor.pending_draft.changed_fields.length > 0 && (
                  <p className="flex items-center gap-1.5 flex-wrap">
                    <strong>Правки профиля:</strong>
                    {doctor.pending_draft.changed_fields.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1">
                        {f === "photo_url" ? <><ImageIcon className="h-3.5 w-3.5 text-amber-600" /> Фото</> : draftFieldLabel(f)}
                      </span>
                    )).reduce<React.ReactNode[]>((acc, el, i) => (i > 0 ? [...acc, ", ", el] : [el]), [])}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="personal">
            <TabsList className="flex-wrap">
              <TabsTrigger value="personal">Личная</TabsTrigger>
              <TabsTrigger value="documents">Документы</TabsTrigger>
              <TabsTrigger value="public">Публичный</TabsTrigger>
              <TabsTrigger value="content">Контентные блоки</TabsTrigger>
              <TabsTrigger value="payments">Платежи</TabsTrigger>
              {finance && <TabsTrigger value="arrears">Задолженности</TabsTrigger>}
              <TabsTrigger value="events">Мероприятия</TabsTrigger>
              <TabsTrigger value="certificates">Сертификаты</TabsTrigger>
              <TabsTrigger value="log">Лог</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardContent className="pt-6">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {[
                      ["Фамилия", doctor.last_name],
                      ["Имя", doctor.first_name],
                      ["Отчество", doctor.middle_name || "—"],
                      ["Телефон", doctor.phone],
                      ["Паспорт", doctor.passport_data || "—"],
                      ["Город", doctor.city?.name || "—"],
                      ["Клиника", doctor.clinic_name || "—"],
                      ["Должность", doctor.position || "—"],
                      ["Специализация", doctor.specialization || "—"],
                      ["Научная степень", doctor.academic_degree || "—"],
                      ["Дата регистрации", format(new Date(doctor.created_at), "dd.MM.yyyy HH:mm")],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardContent className="pt-6">
                  {doctor.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет загруженных документов</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Тип</TableHead>
                          <TableHead>Файл</TableHead>
                          <TableHead>Размер</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctor.documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>{documentTypeLabel(doc.document_type)}</TableCell>
                            <TableCell>
                              {doc.file_url ? (
                                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{doc.original_filename}</a>
                              ) : (
                                <span>{doc.original_filename}</span>
                              )}
                            </TableCell>
                            <TableCell>{(doc.file_size / 1024).toFixed(0)} КБ</TableCell>
                            <TableCell>{format(new Date(doc.uploaded_at), "dd.MM.yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="public">
              <div className={hasDraft ? "grid lg:grid-cols-2 gap-4" : ""}>
                <Card>
                  <CardHeader><CardTitle className="text-base">Текущий профиль</CardTitle></CardHeader>
                  <CardContent>
                    {hasDraft && doctor.pending_draft?.changed_fields.includes("photo_url") && (
                      <dl className="mb-4 pb-4 border-b space-y-1">
                        <dt className="text-muted-foreground text-sm">Фото</dt>
                        <dd>
                          {doctor.photo_url ? (
                            <img src={doctor.photo_url} alt="Текущее фото" className="h-24 w-24 rounded-lg object-cover" />
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Нет фото</span>
                          )}
                        </dd>
                      </dl>
                    )}
                    <dl className="space-y-2 text-sm">
                      {[
                        ["Bio", doctor.bio],
                        ["Email (публ.)", doctor.public_email],
                        ["Телефон (публ.)", doctor.public_phone],
                        ["Город", doctor.city?.name],
                        ["Клиника", doctor.clinic_name],
                        ["Специализация", doctor.specialization],
                        ["Степень", doctor.academic_degree],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd>{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
                {hasDraft && doctor.pending_draft && (
                  <Card className="border-yellow-300">
                    <CardHeader><CardTitle className="text-base">Ожидает модерации</CardTitle></CardHeader>
                    <CardContent>
                      <dl className="space-y-2 text-sm">
                        {doctor.pending_draft.changed_fields.map((field) => {
                          const value = doctor.pending_draft!.changes[field];
                          if (field === "photo_url") {
                            const newPhotoUrl = buildMediaUrl(typeof value === "string" ? value : null);
                            return (
                              <div key={field} className="bg-yellow-50 dark:bg-yellow-950/30 -mx-2 px-2 py-2 rounded">
                                <dt className="text-muted-foreground mb-1">{draftFieldLabel(field)}</dt>
                                <dd>
                                  {newPhotoUrl ? (
                                    <img src={newPhotoUrl} alt="Новое фото" className="h-24 w-24 rounded-lg object-cover" />
                                  ) : (
                                    <span className="text-muted-foreground italic">пусто</span>
                                  )}
                                </dd>
                              </div>
                            );
                          }
                          return (
                            <div key={field} className="bg-yellow-50 dark:bg-yellow-950/30 -mx-2 px-2 py-1 rounded">
                              <dt className="text-muted-foreground">{draftFieldLabel(field)}</dt>
                              <dd>{value != null ? String(value) : <span className="text-muted-foreground italic">пусто</span>}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="content">
              <ContentBlocksEditor entityType="doctor_profile" entityId={doctor.id} initialBlocks={doctor.content_blocks} />
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardContent className="pt-6">
                  {doctor.subscription && (
                    <div className="mb-4 p-4 rounded-lg bg-muted">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Тариф:</span> <strong>{doctor.subscription.plan_name || "—"}</strong></div>
                        <div><span className="text-muted-foreground">Статус:</span> <StatusBadge status={doctor.subscription.status || "unknown"} /></div>
                        {doctor.subscription.starts_at && doctor.subscription.ends_at && (
                          <div><span className="text-muted-foreground">Период:</span> {format(new Date(doctor.subscription.starts_at), "dd.MM.yyyy")} — {format(new Date(doctor.subscription.ends_at), "dd.MM.yyyy")}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {doctor.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет платежей</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctor.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.paid_at ? format(new Date(p.paid_at), "dd.MM.yyyy") : "—"}</TableCell>
                            <TableCell>{p.amount.toLocaleString("ru-RU")} ₽</TableCell>
                            <TableCell><StatusBadge status={p.product_type} /></TableCell>
                            <TableCell><StatusBadge status={p.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {finance && (
            <TabsContent value="arrears">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Задолженности</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/arrears">Все долги</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {arrearsLoading && (
                    <p className="text-sm text-muted-foreground">Загрузка…</p>
                  )}
                  {arrearsError && (
                    <ErrorState
                      message="Не удалось загрузить задолженности (нужны роль admin или accountant и доступ к API)"
                      onRetry={() => void refetchArrears()}
                    />
                  )}
                  {!arrearsLoading && !arrearsError && (
                    <>
                      {(arrearsData?.data?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет записей по долгам</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Год</TableHead>
                                <TableHead>Сумма</TableHead>
                                <TableHead>Описание</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Источник</TableHead>
                                <TableHead>Оплачено</TableHead>
                                <TableHead>Создано</TableHead>
                                <TableHead>Заметка</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(arrearsData?.data ?? []).map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell>{a.year ?? "—"}</TableCell>
                                  <TableCell>{a.amount.toLocaleString("ru-RU")} ₽</TableCell>
                                  <TableCell className="max-w-[140px] truncate text-sm" title={a.description ?? undefined}>
                                    {a.description || "—"}
                                  </TableCell>
                                  <TableCell><StatusBadge status={a.status} /></TableCell>
                                  <TableCell>
                                    {a.source ? <StatusBadge status={a.source} /> : "—"}
                                  </TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">
                                    {a.paid_at ? format(new Date(a.paid_at), "dd.MM.yyyy HH:mm") : "—"}
                                  </TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">
                                    {format(new Date(a.created_at), "dd.MM.yyyy HH:mm")}
                                  </TableCell>
                                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={
                                    a.status === "waived" && a.waive_reason
                                      ? a.waive_reason
                                      : (a.admin_note ?? a.note ?? "")
                                  }>
                                    {a.status === "waived" && a.waive_reason
                                      ? a.waive_reason
                                      : (a.admin_note ?? a.note ?? "—")}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {arrearsData != null && arrearsData.total > (arrearsData.data?.length ?? 0) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Показано {arrearsData.data?.length ?? 0} из {arrearsData.total}. Полный список — в разделе «Все долги».
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            )}

            <TabsContent value="events">
              <Card>
                <CardContent className="pt-6">
                  {/* API: GET .../portal-users/{user_id}/event-registrations — нужен UUID аккаунта (users), не doctor.id профиля */}
                  <PortalUserEventRegistrationsSection userId={doctor.user_id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certificates">
              <CertificatesSection doctorId={doctor.id} />
            </TabsContent>

            <TabsContent value="log">
              <Card>
                <CardContent className="pt-6">
                  {doctor.moderation_history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет записей</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата</TableHead>
                          <TableHead>Администратор</TableHead>
                          <TableHead>Действие</TableHead>
                          <TableHead>Комментарий</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctor.moderation_history.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell>{format(new Date(h.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                            <TableCell>{h.admin_email || "—"}</TableCell>
                            <TableCell><StatusBadge status={h.action} /></TableCell>
                            <TableCell>{h.comment || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DoctorModals
        doctor={doctor}
        onInvalidate={onInvalidate}
        approveOpen={approveOpen}
        setApproveOpen={setApproveOpen}
        rejectOpen={rejectOpen}
        setRejectOpen={setRejectOpen}
        approveDraftOpen={approveDraftOpen}
        setApproveDraftOpen={setApproveDraftOpen}
        rejectDraftOpen={rejectDraftOpen}
        setRejectDraftOpen={setRejectDraftOpen}
        toggleOpen={toggleOpen}
        setToggleOpen={setToggleOpen}
        emailOpen={emailOpen}
        setEmailOpen={setEmailOpen}
        reminderOpen={reminderOpen}
        setReminderOpen={setReminderOpen}
      />
    </div>
  );
}
