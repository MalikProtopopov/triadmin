import type { AxiosError } from "axios";
import { toast } from "sonner";
import api from "@/lib/api";

export type ExportQueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number | boolean>;

/** Параметры query для GET /exports/... (массивы → повторяющиеся ключи). */
function appendParams(sp: URLSearchParams, key: string, value: ExportQueryValue): void {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== undefined && item !== null && String(item) !== "") sp.append(key, String(item));
    }
  } else {
    sp.set(key, String(value));
  }
}

export function buildExportSearchParams(
  record: Record<string, ExportQueryValue>
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(record)) appendParams(sp, k, v);
  return sp;
}

/** Имя файла из Content-Disposition (filename / filename*). */
export function parseContentDispositionFilename(header: string | undefined): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;\s]+)|filename\*=([^']+)'[^']*'([^;\s]+)/i.exec(header);
  if (utf8) {
    const raw = (utf8[1] || utf8[3] || "").trim();
    try {
      return decodeURIComponent(raw.replace(/^"+|"+$/g, ""));
    } catch {
      return raw || null;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim().replace(/^"+|"+$/g, "");
  return null;
}

function extractMessageFromJson(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const err = o.error;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  if (typeof o.message === "string") return o.message;
  if (typeof o.detail === "string") return o.detail;
  return null;
}

async function messageFromErrorBlob(blob: Blob): Promise<string> {
  const text = await blob.text();
  try {
    const parsed = JSON.parse(text) as unknown;
    return extractMessageFromJson(parsed) || text.slice(0, 500);
  } catch {
    return text.slice(0, 500) || "Ошибка выгрузки";
  }
}

/**
 * GET бинарной выгрузки XLSX. Успех — скачивание файла.
 * Ошибки (в т.ч. JSON внутри blob) — toast и throw.
 */
export async function downloadExport(
  path: string,
  params?: Record<string, ExportQueryValue>
): Promise<void> {
  const sp = params ? buildExportSearchParams(params) : new URLSearchParams();
  const qs = sp.toString();
  const url = qs ? `${path}?${qs}` : path;
  try {
    const resp = await api.get<Blob>(url, {
      responseType: "blob",
      skipErrorToast: true,
    });
    const cd = resp.headers["content-disposition"] as string | undefined;
    const fileName = parseContentDispositionFilename(cd) ?? "export.xlsx";
    const blobUrl = URL.createObjectURL(resp.data);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    const err = e as AxiosError<Blob>;
    const data = err.response?.data;
    let msg = "Ошибка выгрузки";
    if (data instanceof Blob) {
      msg = await messageFromErrorBlob(data);
    } else if (data && typeof data === "object" && "error" in data) {
      const m = (data as { error?: { message?: string } }).error?.message;
      if (typeof m === "string") msg = m;
    }
    toast.error(msg);
    throw e;
  }
}
