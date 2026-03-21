"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DoctorCertificate } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Eye, Download, RefreshCw, Power, PowerOff, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/api";

const CERT_TYPE_LABELS: Record<string, string> = {
  member: "Членство",
  event: "Мероприятие",
};

interface CertificatesSectionProps {
  doctorId: string;
}

export function CertificatesSection({ doctorId }: CertificatesSectionProps) {
  const queryClient = useQueryClient();
  const [regenerateYear, setRegenerateYear] = useState<number | null>(null);
  const [toggleTarget, setToggleTarget] = useState<DoctorCertificate | null>(null);

  const { data: certificates, isLoading } = useQuery<DoctorCertificate[]>({
    queryKey: ["doctor-certificates", doctorId],
    queryFn: () =>
      api.get(`/admin/doctors/${doctorId}/certificates`).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d.data ?? [];
      }),
  });

  const regenerateMutation = useMutation({
    mutationFn: (year: number) =>
      api.post(`/admin/doctors/${doctorId}/certificates/regenerate`, { year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-certificates", doctorId] });
      toast.success("Сертификат перегенерирован");
      setRegenerateYear(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (cert: DoctorCertificate) =>
      api.patch(`/admin/certificates/${cert.id}`, { is_active: !cert.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-certificates", doctorId] });
      toast.success("Статус обновлён");
      setToggleTarget(null);
    },
  });

  function openPreview(certId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const token = getAccessToken();
    const url = `${baseUrl}/admin/certificates/${certId}/download?disposition=inline&token=${token}`;
    window.open(url, "_blank");
  }

  async function downloadCert(certId: string, fileName: string) {
    try {
      const resp = await api.get(`/admin/certificates/${certId}/download?disposition=attachment`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      /* handled by interceptor */
    }
  }

  const currentYear = new Date().getFullYear();
  const list = certificates ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Сертификаты</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRegenerateYear(currentYear)}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Регенерировать ({currentYear})
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Нет сертификатов</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Год</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата генерации</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                    <TableCell>{CERT_TYPE_LABELS[cert.certificate_type] || cert.certificate_type}</TableCell>
                    <TableCell>{cert.year}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={cert.is_active ? "active" : "deactivated"}
                        label={cert.is_active ? "Активен" : "Неактивен"}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(cert.generated_at), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Просмотр"
                          onClick={() => openPreview(cert.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Скачать"
                          onClick={() =>
                            downloadCert(cert.id, `${cert.certificate_number}.pdf`)
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Регенерировать"
                          onClick={() => setRegenerateYear(cert.year)}
                          disabled={regenerateMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={cert.is_active ? "Деактивировать" : "Активировать"}
                          onClick={() => setToggleTarget(cert)}
                        >
                          {cert.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={regenerateYear !== null}
        onOpenChange={(open) => !open && setRegenerateYear(null)}
        title="Регенерировать сертификат?"
        description={`Сертификат за ${regenerateYear} год будет перегенерирован с текущими настройками.`}
        confirmLabel="Регенерировать"
        isLoading={regenerateMutation.isPending}
        onConfirm={() => regenerateYear && regenerateMutation.mutate(regenerateYear)}
      />

      <ConfirmDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? "Деактивировать сертификат?" : "Активировать сертификат?"}
        description={`Сертификат ${toggleTarget?.certificate_number} будет ${toggleTarget?.is_active ? "деактивирован" : "активирован"}.`}
        confirmLabel={toggleTarget?.is_active ? "Деактивировать" : "Активировать"}
        variant={toggleTarget?.is_active ? "destructive" : "default"}
        isLoading={toggleMutation.isPending}
        onConfirm={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
      />
    </>
  );
}
