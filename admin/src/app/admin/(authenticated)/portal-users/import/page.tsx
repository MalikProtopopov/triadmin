"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "@/components/shared/FileUpload";
import { CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";

interface ImportResult {
  status: "pending" | "processing" | "completed" | "failed";
  total_rows?: number;
  imported?: number;
  errors?: { row: number; error: string }[];
}

export default function DoctorsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", file!);
      const { data } = await api.post("/admin/doctors/import", formData);
      return data;
    },
    onSuccess: (data) => {
      setTaskId(data.task_id);
      setResult({ status: "processing" });
    },
  });

  useEffect(() => {
    if (!taskId || (result?.status !== "processing" && result?.status !== "pending")) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/admin/doctors/import/${taskId}`);
        setResult(data);
        if (data.status !== "processing" && data.status !== "pending") clearInterval(interval);
      } catch {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [taskId, result?.status]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Пользователи", href: "/admin/portal-users" }, { label: "Импорт врачей" }]} />
      <h1 className="text-2xl font-bold">Импорт врачей из Excel</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Загрузка файла</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }}
            maxSize={5 * 1024 * 1024}
            value={file}
            onChange={(f) => setFile(f as File | null)}
            label="Перетащите Excel-файл или нажмите для выбора"
            hint="Формат: .xlsx, максимум 5 МБ"
          />

          <div className="flex items-center gap-4">
            <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending || result?.status === "processing"}>
              {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Начать импорт
            </Button>
            <a
              href="/api/admin/doctors/import-template"
              download="doctors-import-template.xlsx"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> Скачать шаблон Excel
            </a>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Результат импорта</CardTitle>
          </CardHeader>
          <CardContent>
            {(result.status === "processing" || result.status === "pending") && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Обработка файла...{result.imported != null && result.total_rows ? ` (${result.imported}/${result.total_rows})` : ""}</span>
                </div>
                <Progress value={result.total_rows ? Math.round(((result.imported ?? 0) / result.total_rows) * 100) : 0} className="h-2" />
              </div>
            )}

            {result.status === "failed" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Импорт завершился с ошибкой</span>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Строка</TableHead>
                        <TableHead>Ошибка</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell className="text-destructive">{e.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {result.status === "completed" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Импорт завершён. Импортировано: {result.imported} из {result.total_rows}</span>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Ошибки ({result.errors.length}):
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Строка</TableHead>
                          <TableHead>Ошибка</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell>{e.row}</TableCell>
                            <TableCell className="text-destructive">{e.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
