import api from "@/lib/api";
import type { MediaAsset } from "@/types";

const PAGE_SIZE = 24;

export async function getAdminMedia(params: {
  limit?: number;
  offset?: number;
}): Promise<{ data: MediaAsset[]; total: number }> {
  const limit = params.limit ?? PAGE_SIZE;
  const offset = params.offset ?? 0;
  const { data } = await api.get<{ data: MediaAsset[]; total: number }>("/admin/media", {
    params: { limit, offset },
  });
  return { data: data.data ?? [], total: data.total ?? 0 };
}

export async function postAdminMedia(file: File): Promise<MediaAsset> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<MediaAsset>("/admin/media", fd, {
    transformRequest: [
      (body, headers) => {
        if (body instanceof FormData) {
          delete headers["Content-Type"];
        }
        return body;
      },
    ],
  });
  return data;
}

export { PAGE_SIZE as ADMIN_MEDIA_PAGE_SIZE };
