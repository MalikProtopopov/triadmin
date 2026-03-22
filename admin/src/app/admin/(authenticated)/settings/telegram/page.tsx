"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  TelegramIntegration,
  CreateTelegramIntegrationRequest,
  UpdateTelegramIntegrationRequest,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Loader2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

const TELEGRAM_QUERY_KEY = ["admin", "telegram", "integration"];

function resolveData<T>(r: { data?: { data?: T } | T }): T {
  const d = r.data;
  if (d && typeof d === "object" && "data" in d) return (d as { data: T }).data;
  return d as T;
}

export default function TelegramSettingsPage() {
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    bot_token: string;
    owner_chat_id: string;
    is_active: boolean;
    welcome_message: string;
  }>({ bot_token: "", owner_chat_id: "", is_active: true, welcome_message: "" });
  const [createForm, setCreateForm] = useState<CreateTelegramIntegrationRequest>({
    bot_token: "",
    owner_chat_id: 0,
    welcome_message: "",
  });
  const [webhookUrlFetched, setWebhookUrlFetched] = useState<string | null>(null);
  const initialEditRef = useRef<typeof editForm | null>(null);

  const { data: integration, isLoading, error, refetch } = useQuery<TelegramIntegration | null>({
    queryKey: TELEGRAM_QUERY_KEY,
    queryFn: async () => {
      const r = await api.get("/admin/telegram/integration");
      const data = resolveData<TelegramIntegration | null>(r);
      return data;
    },
  });

  useEffect(() => {
    if (integration) {
      const form = {
        bot_token: "",
        owner_chat_id: String(integration.owner_chat_id ?? ""),
        is_active: integration.is_active,
        welcome_message: integration.welcome_message ?? "",
      };
      setEditForm(form);
      initialEditRef.current = form;
      if (integration.webhook_url) setWebhookUrlFetched(null);
    } else {
      setWebhookUrlFetched(null);
    }
  }, [integration]);

  const isEditDirty = initialEditRef.current
    ? editForm.bot_token !== initialEditRef.current.bot_token ||
      editForm.owner_chat_id !== initialEditRef.current.owner_chat_id ||
      editForm.is_active !== initialEditRef.current.is_active ||
      editForm.welcome_message !== initialEditRef.current.welcome_message
    : false;

  useUnsavedChangesGuard(isEditDirty);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTelegramIntegrationRequest) =>
      api.post("/admin/telegram/integration", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELEGRAM_QUERY_KEY });
      toast.success("Интеграция создана");
      setCreateForm({ bot_token: "", owner_chat_id: 0, welcome_message: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateTelegramIntegrationRequest) =>
      api.patch("/admin/telegram/integration", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELEGRAM_QUERY_KEY });
      toast.success("Настройки сохранены");
      initialEditRef.current = { ...editForm };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete("/admin/telegram/integration"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELEGRAM_QUERY_KEY });
      toast.success("Интеграция удалена");
      setDeleteConfirmOpen(false);
    },
  });

  const setWebhookMutation = useMutation({
    mutationFn: () => api.post("/admin/telegram/integration/webhook"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELEGRAM_QUERY_KEY });
      toast.success("Webhook установлен");
    },
  });

  const removeWebhookMutation = useMutation({
    mutationFn: () => api.delete("/admin/telegram/integration/webhook"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELEGRAM_QUERY_KEY });
      toast.success("Webhook удалён");
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.post("/admin/telegram/integration/test"),
    onSuccess: () => toast.success("Тестовое сообщение отправлено"),
  });

  const fetchWebhookUrlMutation = useMutation({
    mutationFn: async () => {
      const r = await api.get<{ webhook_url?: string } | { data?: { webhook_url?: string } }>(
        "/admin/telegram/integration/webhook-url"
      );
      const d = r.data;
      const url =
        d && typeof d === "object" && "data" in d
          ? (d as { data: { webhook_url?: string } }).data?.webhook_url
          : (d as { webhook_url?: string })?.webhook_url;
      return url ?? null;
    },
    onSuccess: (url) => {
      setWebhookUrlFetched(url ?? null);
      if (url) toast.success("URL получен");
    },
  });

  const handleCreate = () => {
    const token = createForm.bot_token?.trim();
    const chatId = Number(createForm.owner_chat_id);
    if (!token) {
      toast.error("Введите токен бота");
      return;
    }
    if (!chatId || isNaN(chatId)) {
      toast.error("Введите корректный ID канала/чата");
      return;
    }
    createMutation.mutate({
      bot_token: token,
      owner_chat_id: chatId,
      welcome_message: createForm.welcome_message?.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    const payload: UpdateTelegramIntegrationRequest = {};
    if (editForm.bot_token?.trim()) payload.bot_token = editForm.bot_token.trim();
    const chatId = editForm.owner_chat_id?.trim()
      ? Number(editForm.owner_chat_id)
      : undefined;
    if (chatId !== undefined && !isNaN(chatId)) payload.owner_chat_id = chatId;
    payload.is_active = editForm.is_active;
    payload.welcome_message = editForm.welcome_message?.trim() || null;
    if (Object.keys(payload).length === 0) return;
    updateMutation.mutate(payload);
  };

  const displayWebhookUrl = integration?.webhook_url ?? webhookUrlFetched ?? "";

  const copyWebhookUrl = () => {
    if (!displayWebhookUrl) return;
    navigator.clipboard.writeText(displayWebhookUrl).then(() =>
      toast.success("URL скопирован")
    );
  };

  if (isLoading) return <TableSkeleton rows={6} cols={3} />;
  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Настройки", href: "/admin/settings" }, { label: "Telegram" }]}
      />
      <h1 className="text-2xl font-bold">Telegram-интеграция</h1>

      {!integration ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Настройка интеграции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Токен бота *</Label>
              <Input
                type="password"
                value={createForm.bot_token}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, bot_token: e.target.value }))
                }
                placeholder="1234567890:AAH..."
              />
            </div>
            <div className="space-y-2">
              <Label>ID канала/чата для уведомлений *</Label>
              <Input
                type="number"
                value={createForm.owner_chat_id || ""}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    owner_chat_id: Number(e.target.value) || 0,
                  }))
                }
                placeholder="-1001234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Сообщение для /start (опционально)</Label>
              <Textarea
                value={createForm.welcome_message || ""}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, welcome_message: e.target.value }))
                }
                rows={2}
                placeholder="Добро пожаловать!"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать интеграцию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Текущая конфигурация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Бот:</span>{" "}
                  {integration.bot_username ? `@${integration.bot_username}` : "—"}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">ID канала:</span>{" "}
                  {integration.owner_chat_id ?? "—"}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Токен:</span>{" "}
                  {integration.bot_token_masked ?? "—"}
                </div>
                <div>
                  <StatusBadge
                    status={integration.is_active ? "active" : "inactive"}
                    label={integration.is_active ? "Активна" : "Неактивна"}
                  />
                </div>
                <div>
                  <StatusBadge
                    status={integration.is_webhook_active ? "active" : "inactive"}
                    label={
                      integration.is_webhook_active ? "Webhook установлен" : "Webhook не установлен"
                    }
                  />
                </div>
              </div>
              {integration.welcome_message && (
                <div>
                  <span className="text-sm text-muted-foreground">Приветствие:</span>{" "}
                  {integration.welcome_message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Редактирование</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Новый токен (оставьте пустым, чтобы не менять)</Label>
                <Input
                  type="password"
                  value={editForm.bot_token}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, bot_token: e.target.value }))
                  }
                  placeholder="1234567890:AAH..."
                />
              </div>
              <div className="space-y-2">
                <Label>ID канала/чата</Label>
                <Input
                  type="number"
                  value={editForm.owner_chat_id}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, owner_chat_id: e.target.value }))
                  }
                  placeholder="-1001234567890"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="telegram-is-active"
                  checked={editForm.is_active}
                  onCheckedChange={(v) =>
                    setEditForm((p) => ({ ...p, is_active: v }))
                  }
                />
                <Label htmlFor="telegram-is-active" className="cursor-pointer">
                  Интеграция включена
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Сообщение для /start</Label>
                <Textarea
                  value={editForm.welcome_message}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, welcome_message: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending || !isEditDirty}
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Сохранить
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={displayWebhookUrl}
                  className="font-mono text-sm"
                  placeholder="Нажмите «Получить URL» для отображения"
                />
                {displayWebhookUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyWebhookUrl}
                    title="Копировать"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => fetchWebhookUrlMutation.mutate()}
                  disabled={fetchWebhookUrlMutation.isPending}
                >
                  {fetchWebhookUrlMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Получить URL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWebhookMutation.mutate()}
                  disabled={setWebhookMutation.isPending}
                >
                  {setWebhookMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Установить webhook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => removeWebhookMutation.mutate()}
                  disabled={removeWebhookMutation.isPending}
                >
                  {removeWebhookMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Удалить webhook
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Отправить тестовое сообщение
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить интеграцию
            </Button>
          </div>

          <ConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            title="Удалить интеграцию?"
            description="Все настройки Telegram-интеграции будут удалены. Webhook также будет снят."
            confirmLabel="Удалить"
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
          />
        </>
      )}
    </div>
  );
}
