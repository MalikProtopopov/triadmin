"use client";

import { useState } from "react";
import type { DoctorDetail } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Power, PowerOff, Mail, Bell, FileWarning } from "lucide-react";
import { ContentBlocksEditor } from "@/components/shared/ContentBlocksEditor";
import { DoctorModals } from "./DoctorModals";
import { format } from "date-fns";

interface DoctorProfileCardProps {
  doctor: DoctorDetail;
  onInvalidate: () => void;
}

export function DoctorProfileCard({ doctor, onInvalidate }: DoctorProfileCardProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveDraftOpen, setApproveDraftOpen] = useState(false);
  const [rejectDraftOpen, setRejectDraftOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const fullName = `${doctor.last_name} ${doctor.first_name} ${doctor.middle_name || ""}`.trim();
  const isPending = doctor.moderation_status === "pending";
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
                <div className="flex gap-2 mt-1 flex-wrap">
                  <StatusBadge status={doctor.moderation_status} />
                  {doctor.subscription?.status && <StatusBadge status={doctor.subscription.status} />}
                  {doctor.is_public !== undefined && <StatusBadge status={doctor.is_public ? "active" : "deactivated"} label={doctor.is_public ? "Публичный" : "Скрыт"} />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{doctor.city?.name} {doctor.specialization ? `• ${doctor.specialization}` : ""}</p>
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
                  <p><strong>Правки профиля:</strong> {doctor.pending_draft.changed_fields.join(", ")}</p>
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
              <TabsTrigger value="events">Мероприятия</TabsTrigger>
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
                            <TableCell>{doc.document_type}</TableCell>
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
                          return (
                            <div key={field} className="bg-yellow-50 dark:bg-yellow-950/30 -mx-2 px-2 py-1 rounded">
                              <dt className="text-muted-foreground">{field}</dt>
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
              <ContentBlocksEditor entityType="doctor_profile" entityId={doctor.id} />
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

            <TabsContent value="events">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Данные о мероприятиях врача пока недоступны через API</p>
                </CardContent>
              </Card>
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
