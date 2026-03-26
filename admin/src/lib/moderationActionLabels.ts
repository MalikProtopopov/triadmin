/**
 * Подписи для поля `action` в логе модерации врача (`moderation_history`).
 * Бэкенд может отдавать enum (approve/reject), составные ключи или локализованные строки.
 */

export type ModerationBadgeTone = "approve" | "reject" | "active" | "deactivated" | "manual";

const BADGE_BY_TONE: Record<ModerationBadgeTone, string> = {
  approve: "approve",
  reject: "reject",
  active: "active",
  deactivated: "deactivated",
  manual: "manual",
};

/** Нормализация ключа: пробелы, регистр, типичные варианты написания. */
export function normalizeModerationAction(action: string): string {
  return action
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е");
}

type Entry = { label: string; tone: ModerationBadgeTone };

/** Явные переводы: англ. ключи, snake_case, варианты с бэка и русские строки. */
const MODERATION_ACTIONS: Record<string, Entry> = {
  // Заявка врача / общий случай (если бэкенд не различает черновик и заявку — одни и те же ключи)
  approve: { label: "Одобрено", tone: "approve" },
  reject: { label: "Отклонено", tone: "reject" },

  // Черновик правок (POST .../approve-draft) — часто те же approve/reject, но в другом контексте;
  // если бэкенд шлёт различимые ключи:
  "draft_approve": { label: "Черновик правок принят", tone: "approve" },
  "draft_reject": { label: "Черновик правок отклонён", tone: "reject" },
  "draft_approved": { label: "Черновик правок принят", tone: "approve" },
  "draft_rejected": { label: "Черновик правок отклонён", tone: "reject" },
  "approve_draft": { label: "Черновик правок принят", tone: "approve" },
  "reject_draft": { label: "Черновик правок отклонён", tone: "reject" },
  "profile_draft_approve": { label: "Черновик профиля принят", tone: "approve" },
  "profile_draft_reject": { label: "Черновик профиля отклонён", tone: "reject" },
  "profile_change_approve": { label: "Изменения профиля приняты", tone: "approve" },
  "profile_change_reject": { label: "Изменения профиля отклонены", tone: "reject" },
  "changes_approved": { label: "Правки профиля приняты", tone: "approve" },
  "changes_rejected": { label: "Правки профиля отклонены", tone: "reject" },

  // Видимость / активация (POST .../toggle-active)
  activate: { label: "Профиль активирован (публикация)", tone: "active" },
  deactivate: { label: "Профиль скрыт (снят с публикации)", tone: "deactivated" },
  "toggle_active": { label: "Изменена публикация профиля", tone: "manual" },
  "toggle_public": { label: "Изменена публикация профиля", tone: "manual" },
  "public_true": { label: "Профиль опубликован", tone: "active" },
  "public_false": { label: "Профиль скрыт с сайта", tone: "deactivated" },
  "is_public_true": { label: "Профиль опубликован", tone: "active" },
  "is_public_false": { label: "Профиль скрыт с сайта", tone: "deactivated" },
  "profile_activated": { label: "Профиль активирован", tone: "active" },
  "profile_deactivated": { label: "Профиль деактивирован", tone: "deactivated" },

  // Письма и напоминания
  "send_email": { label: "Отправлено письмо врачу", tone: "manual" },
  "email_sent": { label: "Отправлено письмо врачу", tone: "manual" },
  "send_reminder": { label: "Отправлено напоминание", tone: "manual" },
  "reminder_sent": { label: "Отправлено напоминание", tone: "manual" },
  "payment_reminder": { label: "Напоминание об оплате", tone: "manual" },

  // Прочее
  "entry_fee_exempt": { label: "Изменена отметка «без вступительного взноса»", tone: "manual" },
  "certificate_issued": { label: "Выдан сертификат", tone: "approve" },
  "document_approved": { label: "Документ одобрен", tone: "approve" },
  "document_rejected": { label: "Документ отклонён", tone: "reject" },

  // Русские строки (как могут приходить с API)
  "принят черновик": { label: "Черновик правок принят", tone: "approve" },
  "принят черновик.": { label: "Черновик правок принят", tone: "approve" },
  "одобрен черновик": { label: "Черновик правок принят", tone: "approve" },
  "черновик одобрен": { label: "Черновик правок принят", tone: "approve" },
  "черновик принят": { label: "Черновик правок принят", tone: "approve" },
  "отклонен черновик": { label: "Черновик правок отклонён", tone: "reject" },
  "отклонён черновик": { label: "Черновик правок отклонён", tone: "reject" },
  "отклонен черновик.": { label: "Черновик правок отклонён", tone: "reject" },
  "черновик отклонен": { label: "Черновик правок отклонён", tone: "reject" },
  "черновик отклонён": { label: "Черновик правок отклонён", tone: "reject" },
  "заявка одобрена": { label: "Заявка одобрена", tone: "approve" },
  "заявка отклонена": { label: "Заявка отклонена", tone: "reject" },
  "анкета одобрена": { label: "Анкета одобрена", tone: "approve" },
  "анкета отклонена": { label: "Анкета отклонена", tone: "reject" },
  "профиль активирован": { label: "Профиль активирован", tone: "active" },
  "профиль деактивирован": { label: "Профиль деактивирован", tone: "deactivated" },
  "деактивирован профиль": { label: "Профиль деактивирован", tone: "deactivated" },
};

function humanizeSnakeOrLatin(s: string): string {
  const t = s.trim();
  if (!t) return t;
  if (/[а-яё]/i.test(t)) return t;
  return t
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function inferFromText(action: string, normalized: string): Entry {
  const lower = normalized;
  // Отклонение
  if (
    /\breject\b/i.test(action) ||
    lower.includes("отклон") ||
    lower.includes("refus") ||
    lower.includes("denied")
  ) {
    return { label: humanizeSnakeOrLatin(action), tone: "reject" };
  }
  // Одобрение / принятие
  if (
    /\bapprov\b/i.test(action) ||
    lower.includes("одобр") ||
    lower.includes("принят") ||
    lower.includes("accept") ||
    lower.includes("подтвержд")
  ) {
    return { label: humanizeSnakeOrLatin(action), tone: "approve" };
  }
  // Деактивация
  if (lower.includes("деактив") || lower.includes("скрыт") || /\bdeactiv/i.test(action)) {
    return { label: humanizeSnakeOrLatin(action), tone: "deactivated" };
  }
  // Активация
  if (
    (lower.includes("актив") && !lower.includes("деактив")) ||
    /\bactivat/i.test(action) ||
    lower.includes("опублик") ||
    lower.includes("включ")
  ) {
    return { label: humanizeSnakeOrLatin(action), tone: "active" };
  }
  return { label: humanizeSnakeOrLatin(action), tone: "manual" };
}

function resolveEntry(action: string): Entry {
  const trimmed = action.trim();
  if (!trimmed) return { label: "—", tone: "manual" };

  const n = normalizeModerationAction(trimmed);
  if (MODERATION_ACTIONS[n]) return MODERATION_ACTIONS[n];

  return inferFromText(trimmed, n);
}

/** Человекочитаемая подпись действия для таблицы «Лог действий». */
export function moderationActionLabel(action: string): string {
  return resolveEntry(action).label;
}

/** Ключ для `StatusBadge` (цвет по смыслу действия). */
export function moderationActionBadgeStatus(action: string): string {
  const tone = resolveEntry(action).tone;
  return BADGE_BY_TONE[tone];
}
