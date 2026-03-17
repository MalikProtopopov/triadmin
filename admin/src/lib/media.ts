/**
 * Helpers for building media URLs.
 * pending_draft.changes.photo_url stores S3 keys; use buildMediaUrl to get full URL for preview.
 */
export function getMediaBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (override) return override;
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return api.replace(/\/api\/v1\/?$/, "") + "/media";
}

export function buildMediaUrl(s3Key: string | null | undefined): string | null {
  if (!s3Key || typeof s3Key !== "string") return null;
  const base = getMediaBaseUrl();
  return `${base}/${s3Key.replace(/^\//, "")}`;
}
