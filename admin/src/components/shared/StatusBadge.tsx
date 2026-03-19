"use client";

import { Badge } from "@/components/ui/badge";

type Variant = "default" | "secondary" | "destructive" | "outline";

const STATUS_CONFIG: Record<string, { label: string; variant: Variant; className?: string }> = {
  new: { label: "Новый", variant: "secondary" },
  pending: { label: "На модерации", variant: "outline", className: "border-yellow-500 text-yellow-700 bg-yellow-50" },
  pending_review: { label: "На модерации", variant: "outline", className: "border-yellow-500 text-yellow-700 bg-yellow-50" },
  approved: { label: "Одобрен", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  rejected: { label: "Отклонён", variant: "destructive" },
  active: { label: "Активна", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  deactivated: { label: "Деактивирован", variant: "secondary" },
  expired: { label: "Истекла", variant: "destructive" },
  expiring_soon: { label: "Истекает", variant: "outline", className: "border-orange-500 text-orange-700 bg-orange-50" },
  never: { label: "Нет подписки", variant: "secondary" },
  none: { label: "Нет подписки", variant: "secondary" },
  pending_payment: { label: "Ожидает оплаты", variant: "outline", className: "border-yellow-500 text-yellow-700 bg-yellow-50" },
  completed: { label: "Оплачен", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  succeeded: { label: "Оплачен", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  failed: { label: "Ошибка", variant: "destructive" },
  refunded: { label: "Возвращён", variant: "secondary" },
  partially_refunded: { label: "Частичный возврат", variant: "outline", className: "border-orange-500 text-orange-700 bg-orange-50" },
  draft: { label: "Черновик", variant: "secondary" },
  published: { label: "Опубликовано", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  archived: { label: "Архив", variant: "secondary" },
  cancelled: { label: "Отменено", variant: "destructive" },
  canceled: { label: "Отменён", variant: "destructive" },
  closed: { label: "Завершено", variant: "outline", className: "border-blue-500 text-blue-700 bg-blue-50" },
  entry_fee: { label: "Вступительный взнос", variant: "outline" },
  subscription: { label: "Подписка", variant: "outline" },
  event: { label: "Мероприятие", variant: "outline" },
  confirmed: { label: "Подтверждено", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  upcoming: { label: "Предстоящее", variant: "outline", className: "border-blue-500 text-blue-700 bg-blue-50" },
  ongoing: { label: "Проходит", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  finished: { label: "Завершено", variant: "secondary" },
  hidden: { label: "Скрыта", variant: "secondary" },
  inactive: { label: "Неактивен", variant: "secondary" },
  public: { label: "Публичный", variant: "outline" },
  members_only: { label: "Для членов", variant: "outline", className: "border-blue-500 text-blue-700 bg-blue-50" },
  participants_only: { label: "Для участников", variant: "outline", className: "border-purple-500 text-purple-700 bg-purple-50" },
  approve: { label: "Одобрено", variant: "outline", className: "border-green-500 text-green-700 bg-green-50" },
  reject: { label: "Отклонено", variant: "destructive" },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "secondary" as Variant };
  return (
    <Badge variant={config.variant} className={`${config.className || ""} ${className || ""}`}>
      {label || config.label}
    </Badge>
  );
}
