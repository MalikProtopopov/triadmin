import type { ArrearsSummary } from "@/types";

/**
 * Приводит ответ GET /admin/arrears/summary к ArrearsSummary.
 * Поддерживает вложение { data: ... }, двойной data, и имена полей как в дашборде (arrears_*_total).
 */
export function normalizeArrearsSummary(raw: unknown): ArrearsSummary | null {
  if (raw == null || typeof raw !== "object") return null;

  let o = raw as Record<string, unknown>;
  for (let i = 0; i < 2; i += 1) {
    const inner = o.data;
    if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
      o = inner as Record<string, unknown>;
    } else {
      break;
    }
  }

  const num = (keys: string[]): number => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
    return 0;
  };

  const int = (keys: string[]) => Math.round(num(keys));

  return {
    open_total: num(["open_total", "arrears_open_total"]),
    open_count: int(["open_count", "arrears_open_count"]),
    paid_total: num(["paid_total", "arrears_paid_total"]),
    paid_count: int(["paid_count", "arrears_paid_count"]),
    waived_total: num(["waived_total", "arrears_waived_total"]),
    waived_count: int(["waived_count", "arrears_waived_count"]),
    cancelled_total: num(["cancelled_total", "arrears_cancelled_total"]) || undefined,
    cancelled_count: int(["cancelled_count", "arrears_cancelled_count"]) || undefined,
  };
}
