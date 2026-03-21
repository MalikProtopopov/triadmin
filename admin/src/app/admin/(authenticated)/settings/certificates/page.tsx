"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CertificateSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileUpload } from "@/components/shared/FileUpload";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  president_full_name: string;
  president_title: string;
  organization_full_name: string;
  organization_short_name: string;
  certificate_member_text: string;
  certificate_number_prefix: string;
  validity_text_template: string;
}

const IMAGE_FIELDS = [
  { key: "logo", label: "Логотип организации", urlKey: "logo_url" as const },
  { key: "stamp", label: "Печать (PNG с прозрачностью)", urlKey: "stamp_url" as const },
  { key: "signature", label: "Подпись президента (PNG с прозрачностью)", urlKey: "signature_url" as const },
  { key: "background", label: "Фоновое изображение / watermark", urlKey: "background_url" as const },
] as const;

export default function CertificateSettingsPage() {
  const queryClient = useQueryClient();
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const { data, isLoading, error, refetch } = useQuery<CertificateSettings>({
    queryKey: ["certificate-settings"],
    queryFn: () => api.get("/admin/certificate-settings").then((r) => r.data),
  });

  const [form, setForm] = useState<FormData>({
    president_full_name: "",
    president_title: "",
    organization_full_name: "",
    organization_short_name: "",
    certificate_member_text: "",
    certificate_number_prefix: "",
    validity_text_template: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        president_full_name: data.president_full_name || "",
        president_title: data.president_title || "",
        organization_full_name: data.organization_full_name || "",
        organization_short_name: data.organization_short_name || "",
        certificate_member_text: data.certificate_member_text || "",
        certificate_number_prefix: data.certificate_number_prefix || "",
        validity_text_template: data.validity_text_template || "",
      });
    }
  }, [data]);

  function updateField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(form)) {
        payload[key] = value || null;
      }
      return api.patch("/admin/certificate-settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-settings"] });
      toast.success("Настройки сохранены");
    },
  });

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  async function handleImageUpload(field: string, file: File | File[] | null) {
    if (!file || Array.isArray(file)) return;
    setUploadingField(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/admin/certificate-settings/${field}`, fd, {
        headers: { "Content-Type": undefined as unknown as string },
      });
      queryClient.invalidateQueries({ queryKey: ["certificate-settings"] });
      toast.success("Изображение загружено");
    } catch {
      /* handled by interceptor */
    } finally {
      setUploadingField(null);
    }
  }

  const regenerateMutation = useMutation({
    mutationFn: () => api.post("/admin/certificate-settings/regenerate-all"),
    onSuccess: (res) => {
      setRegenerateOpen(false);
      const dispatched = res.data?.dispatched ?? 0;
      toast.success(`Запущена регенерация ${dispatched} сертификатов`);
    },
  });

  if (isLoading) return <TableSkeleton rows={6} cols={2} />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Настройки", href: "/admin/settings" }, { label: "Сертификаты" }]} />
      <h1 className="text-2xl font-bold">Настройки сертификатов</h1>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Данные организации</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ФИО президента</Label>
                <Input
                  value={form.president_full_name}
                  onChange={(e) => updateField("president_full_name", e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div className="space-y-2">
                <Label>Должность президента</Label>
                <Input
                  value={form.president_title}
                  onChange={(e) => updateField("president_title", e.target.value)}
                  placeholder="Президент д.м.н."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Полное название организации</Label>
              <Input
                value={form.organization_full_name}
                onChange={(e) => updateField("organization_full_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Краткое название организации</Label>
              <Input
                value={form.organization_short_name}
                onChange={(e) => updateField("organization_short_name", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Шаблон сертификата</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Текст сертификата</Label>
              <Textarea
                value={form.certificate_member_text}
                onChange={(e) => updateField("certificate_member_text", e.target.value)}
                rows={4}
                placeholder="является действительным членом... Поддерживает {full_name}, {year}"
              />
              <p className="text-xs text-muted-foreground">
                Переменные: {"{full_name}"}, {"{year}"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Префикс номера</Label>
                <Input
                  value={form.certificate_number_prefix}
                  onChange={(e) => updateField("certificate_number_prefix", e.target.value)}
                  placeholder="TRICH"
                />
              </div>
              <div className="space-y-2">
                <Label>Шаблон строки валидности</Label>
                <Input
                  value={form.validity_text_template}
                  onChange={(e) => updateField("validity_text_template", e.target.value)}
                  placeholder="Действителен с {year} г."
                />
                <p className="text-xs text-muted-foreground">
                  Переменная: {"{year}"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Изображения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {IMAGE_FIELDS.map(({ key, label, urlKey }) => {
            const currentUrl = data[urlKey];
            return (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                {currentUrl && (
                  <div className="mb-2">
                    <img
                      src={currentUrl}
                      alt={label}
                      className="h-24 rounded-lg border object-contain bg-white p-2"
                    />
                  </div>
                )}
                <FileUpload
                  accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                  maxSize={2 * 1024 * 1024}
                  onChange={(f) => handleImageUpload(key, f)}
                  hint="PNG, JPEG, WebP, до 2 МБ"
                  label={uploadingField === key ? "Загрузка..." : "Выберите файл или перетащите"}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Массовая регенерация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Перегенерирует все активные сертификаты за {currentYear} год. Используйте после смены
            настроек (новый президент, логотип и т.д.).
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRegenerateOpen(true)}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Перегенерировать все сертификаты ({currentYear})
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        title="Перегенерировать все сертификаты?"
        description={`Все активные member-сертификаты за ${currentYear} год будут перегенерированы с текущими настройками. Продолжить?`}
        confirmLabel="Перегенерировать"
        variant="default"
        isLoading={regenerateMutation.isPending}
        onConfirm={() => regenerateMutation.mutate()}
      />
    </div>
  );
}
